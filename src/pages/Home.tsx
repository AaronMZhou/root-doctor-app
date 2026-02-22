import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Upload, Lightbulb, Leaf, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { predictLeaf } from '@/lib/predict';
import { saveScan, getSettings, updateSettings } from '@/lib/scan-store';
import { ScanRecord } from '@/lib/types';
import OutbreakWidget from '@/components/OutbreakWidget';
import BottomNav from '@/components/BottomNav';

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setProgress(0);

    // Fake progress
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 300);

    try {
      const result = await predictLeaf(selectedFile);
      clearInterval(interval);
      setProgress(100);

      // Capture location when allowed; this can also trigger the browser prompt if still in "prompt" mode.
      let lat: number | undefined;
      let lng: number | undefined;
      const settings = getSettings();
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60000,
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          if (settings.locationPermission !== 'granted') {
            updateSettings({ locationPermission: 'granted' });
          }
        } catch (error) {
          const geoError = error as GeolocationPositionError;
          if (geoError?.code === 1) {
            updateSettings({ locationPermission: 'denied' });
          }
        }
      }

      const scan: ScanRecord = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        imageUri: settings.storePhotos ? selectedImage ?? undefined : undefined,
        predictedLabel: result.predictedLabel,
        confidence: result.confidence,
        top3: result.top3,
        lat,
        lng,
      };

      saveScan(scan);

      // Navigate to results with the scan data
      navigate('/results', { state: { scan, imageFile: selectedFile } });
    } catch {
      clearInterval(interval);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-foreground">SafeCrop</h1>
        </div>
        <p className="text-sm text-muted-foreground">Scan a plant leaf to detect disease</p>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-5">
        <OutbreakWidget />

        {/* Image preview or scan button area */}
        {selectedImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl overflow-hidden shadow-elevated aspect-[4/3]"
          >
            <img src={selectedImage} alt="Selected leaf" className="w-full h-full object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/60 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-primary-foreground" />
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Camera capture */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-primary/10 active:bg-primary/15"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center animate-pulse-scan">
                <Camera className="w-8 h-8 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">Scan Leaf</span>
              <span className="text-sm text-muted-foreground">Tap to capture with camera</span>
            </button>

            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 h-12 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5" /> Upload from Gallery
            </Button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {/* Analyze button */}
        {selectedImage && !analyzing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              size="lg"
              className="w-full gap-2 text-base h-14 rounded-xl bg-gradient-hero"
              onClick={handleAnalyze}
            >
              <Leaf className="w-5 h-5" /> Analyze Leaf
            </Button>
          </motion.div>
        )}

        {/* Analyzing state */}
        {analyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-hero rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Analyzing leaf patterns…</p>
          </motion.div>
        )}

        {/* Tips card */}
        {!selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Tips for best results</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Use good, natural lighting
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Center a single leaf in the frame
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Keep the camera steady to avoid blur
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Capture both top and bottom of leaf if possible
              </li>
            </ul>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

