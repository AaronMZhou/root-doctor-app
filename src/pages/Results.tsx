import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Share2, AlertTriangle, CheckCircle, Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanRecord } from '@/lib/types';
import { getDiseaseInfo, isHealthyLabel } from '@/lib/disease-data';
import { useAuth } from '@/hooks/useAuth';
import ShareScanDialog from '@/components/ShareScanDialog';
import BottomNav from '@/components/BottomNav';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as { scan?: ScanRecord; imageFile?: File } | undefined;
  const scan = state?.scan;
  const imageFile = state?.imageFile as File | undefined;
  const [shareOpen, setShareOpen] = useState(false);

  if (!scan) {
    navigate('/');
    return null;
  }

  const disease = getDiseaseInfo(scan.predictedLabel);
  const isHealthy = isHealthyLabel(scan.predictedLabel);
  const confidencePercent = Math.round(scan.confidence * 100);

  const handleShare = async () => {
    const text = `SafeCrop Scan Result: ${disease.fullName} (${confidencePercent}% confidence) - ${new Date(scan.createdAt).toLocaleDateString()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafeCrop Result', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full bg-card flex items-center justify-center shadow-card">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Analysis Result</h1>
      </div>

      <div className="flex-1 px-5 space-y-4">
        {/* Main result card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-5 shadow-elevated"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isHealthy ? 'bg-success/15' : 'bg-destructive/15'}`}>
              {isHealthy ? (
                <CheckCircle className="w-6 h-6 text-success" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground leading-tight break-words">{disease.fullName}</h2>
              <p className="text-sm text-muted-foreground">{confidencePercent}% confidence</p>
            </div>
          </div>

          {/* Top-3 probabilities */}
          <div className="space-y-2 mb-4">
            {scan.top3.map((item) => {
              const topLabel = getDiseaseInfo(item.label).fullName;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium text-muted-foreground min-w-0 truncate"
                      title={topLabel}
                    >
                      {topLabel}
                    </span>
                    <span className="text-xs font-medium text-foreground shrink-0">
                      {Math.round(item.prob * 100)}%
                    </span>
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.prob * 100}%` }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(scan.createdAt).toLocaleString()}
            </span>
            {(scan.lat !== undefined && scan.lng !== undefined) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {scan.lat.toFixed(3)}, {scan.lng.toFixed(3)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Share to community prompt */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Button
              size="lg"
              className="w-full gap-2 h-12 rounded-xl bg-gradient-hero"
              onClick={() => setShareOpen(true)}
            >
              <Users className="w-5 h-5" /> Share with Community
            </Button>
          </motion.div>
        )}

        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-primary/5 border border-primary/20 p-3"
          >
            <p className="text-xs text-foreground">
              <button onClick={() => navigate('/auth')} className="text-primary font-semibold">Sign in</button>
              {' '}to share this scan with the community and help nearby farmers.
            </p>
          </motion.div>
        )}

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card p-5 shadow-card"
        >
          <h3 className="font-display text-base font-semibold text-foreground mb-2">What this means</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{disease.description}</p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card p-5 shadow-card"
        >
          <h3 className="font-display text-base font-semibold text-foreground mb-3">Recommended next steps</h3>
          <ul className="space-y-2">
            {disease.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Disclaimer */}
        <div className="rounded-xl bg-warning/10 border border-warning/20 p-3">
          <p className="text-xs text-warning-foreground leading-relaxed">
            <strong>Disclaimer:</strong> This is a prototype decision-support tool only. Always confirm findings with a qualified agronomist or local agricultural extension service.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl" onClick={() => navigate('/')}>
            <RotateCcw className="w-4 h-4" /> Scan Another
          </Button>
          <Button variant="outline" size="lg" className="gap-2 rounded-xl" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ShareScanDialog open={shareOpen} onOpenChange={setShareOpen} scan={scan} imageFile={imageFile} />
      <BottomNav />
    </div>
  );
}

