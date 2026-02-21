import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDiseaseInfo } from '@/lib/disease-data';

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

  useEffect(() => {
    const fetchSummary = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ count }, { data: latestData }] = await Promise.all([
        supabase
          .from('outbreak_alerts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since),
        supabase
          .from('outbreak_alerts')
          .select('id,disease_label,summary,created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setRecentCount(count ?? 0);
      setLatest(latestData ?? null);
    };

    fetchSummary();
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
            <p className="text-xs text-muted-foreground">{recentCount} alerts in the last 24 hours</p>
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
