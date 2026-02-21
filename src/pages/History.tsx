import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, Filter, ChevronRight } from 'lucide-react';
import { getScans } from '@/lib/scan-store';
import { ALL_CLASSES, getDiseaseInfo, isHealthyLabel } from '@/lib/disease-data';
import { DiseaseClass, ScanRecord } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

export default function HistoryPage() {
  const [classFilter, setClassFilter] = useState<DiseaseClass | 'all'>('all');
  const scans = getScans();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (classFilter === 'all') return scans;
    return scans.filter(s => s.predictedLabel === classFilter);
  }, [scans, classFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-3">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Scan History</h1>
        <p className="text-sm text-muted-foreground">{scans.length} total scans</p>
      </div>

      <div className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <FilterChip label="All" active={classFilter === 'all'} onClick={() => setClassFilter('all')} />
          {ALL_CLASSES.map(c => (
            <FilterChip key={c} label={c} active={classFilter === c} onClick={() => setClassFilter(c)} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Filter className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No scans found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((scan, i) => (
              <ScanCard key={scan.id} scan={scan} index={i} onClick={() => navigate('/results', { state: { scan } })} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

function ScanCard({ scan, index, onClick }: { scan: ScanRecord; index: number; onClick: () => void }) {
  const disease = getDiseaseInfo(scan.predictedLabel);
  const isHealthy = isHealthyLabel(scan.predictedLabel);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card shadow-card text-left"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
        isHealthy ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
      }`}>
        {isHealthy ? 'OK' : scan.predictedLabel}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{disease.fullName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(scan.createdAt).toLocaleDateString()}
          </span>
          {scan.lat !== undefined && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {scan.lat.toFixed(1)},{scan.lng?.toFixed(1)}
            </span>
          )}
          <span>{Math.round(scan.confidence * 100)}%</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </motion.button>
  );
}
