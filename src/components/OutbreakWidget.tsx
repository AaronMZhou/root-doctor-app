import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDiseaseInfo } from '@/lib/disease-data';
import { postToOutbreakAlert } from '@/lib/outbreak-note';

interface OutbreakAlertPreview {
  id: string;
  disease_label: string;
  summary: string;
  created_at: string;
}

export default function OutbreakWidget() {
  const navigate = useNavigate();
  const [recentCount, setRecentCount] = useState(0);
  const [latest, setLatest] = useState<OutbreakAlertPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: recentRows, error: recentError }, { data: latestRows, error: latestError }] = await Promise.all([
        supabase
          .from('community_posts')
          .select('id,created_at,predicted_label,notes,lat,lng,user_id')
          .gte('created_at', since),
        supabase
          .from('community_posts')
          .select('id,created_at,predicted_label,notes,lat,lng,user_id')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (recentError || latestError) {
        setErrorMessage('Outbreak alerts backend is not ready yet.');
        setRecentCount(0);
        setLatest(null);
        return;
      }

      const recentAlerts = (recentRows ?? []).map(postToOutbreakAlert).filter(Boolean);
      const latestAlert = (latestRows ?? []).map(postToOutbreakAlert).find(Boolean);

      setErrorMessage(null);
      setRecentCount(recentAlerts.length);
      if (latestAlert) {
        setLatest({
          id: latestAlert.id,
          disease_label: latestAlert.diseaseLabel,
          summary: latestAlert.summary,
          created_at: latestAlert.createdAt,
        });
      } else {
        setLatest(null);
      }
    };

    fetchSummary();

    const channel = supabase
      .channel('outbreak-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchSummary();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <button
      onClick={() => navigate('/outbreaks')}
      className="w-full rounded-2xl bg-destructive/10 border border-destructive/25 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Outbreak Warnings</p>
            <p className="text-xs text-muted-foreground">
              {errorMessage ?? `${recentCount} alerts in the last 24 hours`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {latest && (
        <div className="mt-3 border-t border-destructive/20 pt-3">
          <p className="text-xs font-medium text-foreground truncate">
            Latest: {getDiseaseInfo(latest.disease_label).fullName}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{latest.summary}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(latest.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </button>
  );
}
