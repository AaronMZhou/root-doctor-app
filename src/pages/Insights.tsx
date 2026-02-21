import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, MapPin } from 'lucide-react';
import { getScans } from '@/lib/scan-store';
import { ALL_CLASSES, getDiseaseInfo } from '@/lib/disease-data';
import BottomNav from '@/components/BottomNav';

export default function InsightsPage() {
  const scans = getScans();

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_CLASSES.forEach(c => (counts[c] = 0));
    scans.forEach(s => (counts[s.predictedLabel] = (counts[s.predictedLabel] || 0) + 1));
    return counts;
  }, [scans]);

  const maxCount = Math.max(...Object.values(classCounts), 1);

  const recentWithLocation = useMemo(
    () => scans.filter(s => s.lat !== undefined && s.lng !== undefined).slice(0, 10),
    [scans]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Insights</h1>
        <p className="text-sm text-muted-foreground">Your collected scan data</p>
      </div>

      <div className="flex-1 px-5 space-y-5">
        {/* Distribution chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Disease Distribution</h3>
          </div>

          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No scans yet. Start scanning to see insights.</p>
          ) : (
            <div className="space-y-3">
              {ALL_CLASSES.map(cls => {
                const count = classCounts[cls];
                const percent = (count / maxCount) * 100;
                return (
                  <div key={cls} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                      {cls}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent locations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Recent Scans with Location</h3>
          </div>

          {recentWithLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No location data available.</p>
          ) : (
            <div className="space-y-2">
              {recentWithLocation.map(scan => (
                <div key={scan.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{getDiseaseInfo(scan.predictedLabel).fullName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {scan.lat?.toFixed(2)}, {scan.lng?.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground text-center">
            Data shown is from your local scans only. Not shared externally.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
