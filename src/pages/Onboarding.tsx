import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Leaf, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSettings } from '@/lib/scan-store';
import onboardingHero from '@/assets/onboarding-hero.jpg';

const steps = [
  {
    icon: Leaf,
    title: 'Detect Plant Diseases',
    description: 'Scan plant leaves to quickly identify potential diseases and get guidance on next steps.',
    image: true,
  },
  {
    icon: Camera,
    title: 'Camera Access',
    description: 'SafeCrop needs camera access to capture leaf photos for analysis. You can also upload from your gallery.',
    permission: 'camera' as const,
  },
  {
    icon: MapPin,
    title: 'Location (Optional)',
    description: 'Used to understand regional disease patterns and improve recommendations. You can skip this or set your region manually later.',
    permission: 'location' as const,
  },
  {
    icon: Shield,
    title: 'Important Note',
    description: 'SafeCrop is a prototype decision-support tool. Always confirm results with a qualified agronomist or local extension service.',
    final: true,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = steps[step];

  const handlePermission = async (type: 'camera' | 'location') => {
    try {
      if (type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        updateSettings({ cameraPermission: 'granted' });
      } else {
        await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        updateSettings({ locationPermission: 'granted' });
      }
    } catch {
      updateSettings(type === 'camera' ? { cameraPermission: 'denied' } : { locationPermission: 'denied' });
    }
    next();
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      updateSettings({ onboardingComplete: true });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress */}
      <div className="flex gap-1.5 p-4 pt-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col px-6 pb-8"
        >
          {current.image && (
            <div className="relative mx-auto mt-4 mb-6 w-full max-w-xs aspect-[3/4] rounded-2xl overflow-hidden shadow-elevated">
              <img src={onboardingHero} alt="Crop field" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="font-display text-2xl font-bold text-primary-foreground">SafeCrop</h1>
              </div>
            </div>
          )}

          {!current.image && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <current.icon className="w-10 h-10 text-primary" />
              </div>
            </div>
          )}

          <div className={current.image ? '' : 'mt-auto'}>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">{current.title}</h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">{current.description}</p>

            <div className="flex flex-col gap-3">
              {current.permission === 'camera' && (
                <>
                  <Button size="lg" className="w-full gap-2 text-base h-14 rounded-xl bg-gradient-hero" onClick={() => handlePermission('camera')}>
                    <Camera className="w-5 h-5" /> Allow Camera Access
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={next}>
                    Skip for now
                  </Button>
                </>
              )}
              {current.permission === 'location' && (
                <>
                  <Button size="lg" className="w-full gap-2 text-base h-14 rounded-xl bg-gradient-hero" onClick={() => handlePermission('location')}>
                    <MapPin className="w-5 h-5" /> Allow Location
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={next}>
                    Skip — I'll set region manually
                  </Button>
                </>
              )}
              {!current.permission && (
                <Button size="lg" className="w-full gap-2 text-base h-14 rounded-xl bg-gradient-hero" onClick={next}>
                  {current.final ? "Get Started" : "Continue"} <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

