import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Download, Trash2, Camera, MapPin, Shield, ChevronRight, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getSettings, updateSettings, clearScans, exportHistory, getScans } from '@/lib/scan-store';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings);
  const [showAdmin, setShowAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleStorePhotos = (checked: boolean) => {
    updateSettings({ storePhotos: checked });
    setSettings(prev => ({ ...prev, storePhotos: checked }));
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = exportHistory(format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safecrop-history.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`History exported as ${format.toUpperCase()}`);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      clearScans();
      toast.success('History cleared');
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      <div className="flex-1 px-5 space-y-4">
        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Account
          </h3>

          {user ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Signed in</p>
                <p className="text-xs text-muted-foreground break-all">{user.email}</p>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={handleSignOut} disabled={signingOut}>
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Sign in to share scans and participate in community alerts.</p>
              <Button className="w-full bg-gradient-hero" onClick={() => navigate('/auth')}>
                Sign In / Create Account
              </Button>
            </div>
          )}
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Privacy
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Store photos locally</p>
              <p className="text-xs text-muted-foreground">Save captured images with scan data</p>
            </div>
            <Switch checked={settings.storePhotos} onCheckedChange={toggleStorePhotos} />
          </div>
        </motion.div>

        {/* Permissions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Permissions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Camera className="w-4 h-4 text-muted-foreground" /> Camera
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                settings.cameraPermission === 'granted' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
              }`}>
                {settings.cameraPermission}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Location
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                settings.locationPermission === 'granted' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
              }`}>
                {settings.locationPermission}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            To change permissions, update them in your browser settings for this site.
          </p>
        </motion.div>

        {/* Data */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Data Management</h3>
          <p className="text-xs text-muted-foreground mb-3">{getScans().length} scans stored locally</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4" /> Export as CSV
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4" /> Export as JSON
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2 text-destructive hover:text-destructive" onClick={handleClear}>
              <Trash2 className="w-4 h-4" /> Clear All History
            </Button>
          </div>
        </motion.div>

        {/* Admin toggle */}
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-card shadow-card text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> Model Management
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showAdmin ? 'rotate-90' : ''}`} />
        </button>

        {showAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <p className="text-sm text-foreground mb-2">Current Model: <strong>mock-v1.0</strong></p>
            <p className="text-xs text-muted-foreground mb-3">
              Using deterministic mock predictions based on image metadata.
            </p>
            <Button variant="outline" size="sm" disabled className="gap-2">
              Switch to Real Model (coming soon)
            </Button>
          </motion.div>
        )}

        <div className="text-center text-xs text-muted-foreground py-4">
          SafeCrop Prototype v1.0
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

