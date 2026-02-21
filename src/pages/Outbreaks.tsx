import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Radar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDiseaseInfo } from '@/lib/disease-data';
import { getDistanceKm } from '@/lib/geo';
import OutbreakMap, { OutbreakMapPoint } from '@/components/OutbreakMap';
import BottomNav from '@/components/BottomNav';

interface OutbreakAlert {
  id: string;
  disease_label: string;
  summary: string;
  severity: string | null;
  lat: number;
  lng: number;
  radius_km: number;
  nearby_count: number;
  created_at: string;
  created_by: string | null;
  profiles?: { display_name: string | null } | null;
}

function severityClass(severity: string | null) {
  const value = (severity ?? 'medium').toLowerCase();
  if (value === 'high') return 'bg-destructive/15 text-destructive';
  if (value === 'low') return 'bg-warning/15 text-warning-foreground';
  return 'bg-accent/15 text-accent-foreground';
}

export default function OutbreaksPage() {
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchAlerts = async () => {
    const { data: alertsData, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage('Outbreak alerts backend is not configured yet.');
      setAlerts([]);
      setLoading(false);
      return;
    }

    setErrorMessage(null);

    if (!alertsData) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const creatorIds = [...new Set(alertsData.map(a => a.created_by).filter(Boolean))] as string[];
    const { data: profilesData } = creatorIds.length === 0
      ? { data: [] }
      : await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', creatorIds);

    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) ?? []);
    const withProfiles = alertsData.map(a => ({
      ...a,
      profiles: { display_name: a.created_by ? (profileMap.get(a.created_by) ?? null) : null },
    })) as OutbreakAlert[];

    setAlerts(withProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('outbreak-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outbreak_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const mapAlerts = useMemo<OutbreakMapPoint[]>(() => {
    return alerts.map(a => ({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      diseaseLabel: a.disease_label,
      summary: a.summary,
      severity: a.severity,
      radiusKm: a.radius_km,
      nearbyCount: a.nearby_count,
      createdAt: a.created_at,
    }));
  }, [alerts]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <h1 className="font-display text-xl font-bold text-foreground">Outbreak Warnings</h1>
        </div>
        <p className="text-sm text-muted-foreground">Permanent log of detected outbreak alerts</p>
      </div>

      <div className="flex-1 px-5 space-y-3">
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card p-3 shadow-card"
          >
            <p className="text-xs font-semibold text-foreground mb-2">Outbreak map</p>
            <OutbreakMap alerts={mapAlerts} userLocation={userLocation} />
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-sm font-semibold text-foreground">Alerts unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Radar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No outbreak warnings yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Alerts will appear here when significant clusters are detected.</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const disease = getDiseaseInfo(alert.disease_label);
            const distanceKm = userLocation
              ? getDistanceKm(userLocation, { lat: alert.lat, lng: alert.lng })
              : null;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{disease.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.summary}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityClass(alert.severity)}`}>
                    {(alert.severity ?? 'medium').toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {alert.lat.toFixed(2)}, {alert.lng.toFixed(2)}
                  </span>
                  <span>{alert.radius_km.toFixed(1)} km radius</span>
                  <span>{alert.nearby_count} nearby scans</span>
                  {distanceKm !== null && <span>{distanceKm.toFixed(1)} km from you</span>}
                </div>

                {alert.profiles?.display_name && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Reported by {alert.profiles.display_name}
                  </p>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
