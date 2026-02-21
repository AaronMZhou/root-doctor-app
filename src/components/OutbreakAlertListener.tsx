import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getDiseaseInfo } from '@/lib/disease-data';
import { getDistanceKm } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

type OutbreakAlertRow = Tables<'outbreak_alerts'>;

export default function OutbreakAlertListener() {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const seenAlertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const maybeNotify = (alert: OutbreakAlertRow) => {
      if (seenAlertIds.current.has(alert.id)) return;
      seenAlertIds.current.add(alert.id);

      const distance = getDistanceKm(userLocation, { lat: alert.lat, lng: alert.lng });
      if (distance > alert.radius_km) return;

      const diseaseName = getDiseaseInfo(alert.disease_label).fullName;
      const distanceText = `${distance.toFixed(1)} km away`;
      toast({
        title: `Potential outbreak nearby: ${diseaseName}`,
        description: `${alert.summary} (${distanceText})`,
        variant: 'destructive',
        action: (
          <ToastAction altText="View alerts" onClick={() => { window.location.href = '/outbreaks'; }}>
            View Alerts
          </ToastAction>
        ),
      });
    };

    const channel = supabase
      .channel('outbreak-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outbreak_alerts' }, (payload) => {
        maybeNotify(payload.new as OutbreakAlertRow);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, toast]);

  return null;
}
