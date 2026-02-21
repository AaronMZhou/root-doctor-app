import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScanRecord } from '@/lib/types';
import { getDiseaseInfo } from '@/lib/disease-data';
import { evaluateOutbreakForSharedScan } from '@/lib/outbreak-alerts';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: ScanRecord;
  imageFile?: File | null;
}

export default function ShareScanDialog({ open, onOpenChange, scan, imageFile }: Props) {
  const [notes, setNotes] = useState('');
  const [sharing, setSharing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const disease = getDiseaseInfo(scan.predictedLabel);

  const handleShare = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to share scans.', variant: 'destructive' });
      return;
    }

    setSharing(true);
    let imageUrl: string | null = null;

    // Upload image if available
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const { data: createdPost, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        predicted_label: scan.predictedLabel,
        confidence: scan.confidence,
        top3: scan.top3,
        image_url: imageUrl,
        lat: scan.lat,
        lng: scan.lng,
        notes: notes || null,
      })
      .select('id,predicted_label,confidence,lat,lng,created_at')
      .single();

    setSharing(false);

    if (error) {
      toast({ title: 'Failed to share', description: error.message, variant: 'destructive' });
    } else {
      if (createdPost) {
        const outbreakResult = await evaluateOutbreakForSharedScan({
          postId: createdPost.id,
          createdBy: user.id,
          predictedLabel: createdPost.predicted_label,
          confidence: createdPost.confidence,
          createdAt: createdPost.created_at,
          lat: createdPost.lat,
          lng: createdPost.lng,
        });

        if (outbreakResult.status === 'created') {
          toast({
            title: 'Outbreak alert sent',
            description: outbreakResult.alert?.summary ?? 'Nearby users were notified of a potential outbreak.',
            variant: 'destructive',
          });
        } else if (outbreakResult.status === 'no_outbreak') {
          toast({
            title: 'No outbreak alert',
            description: outbreakResult.message ?? 'The model did not detect a significant outbreak signal.',
          });
        } else if (outbreakResult.status === 'duplicate') {
          toast({
            title: 'Alert already exists',
            description: outbreakResult.message ?? 'A similar outbreak alert is already active nearby.',
          });
        } else if (outbreakResult.status === 'skipped') {
          toast({
            title: 'Outbreak check skipped',
            description: outbreakResult.message ?? 'Unable to run outbreak analysis for this scan.',
          });
        } else if (outbreakResult.status === 'error') {
          toast({
            title: 'Outbreak check failed',
            description: outbreakResult.message ?? 'Could not evaluate outbreak risk after sharing.',
            variant: 'destructive',
          });
        }
      }

      toast({ title: 'Shared!', description: 'Your scan is now visible to the community.' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share with Community
          </DialogTitle>
          <DialogDescription>
            Help nearby farmers by sharing this disease report. Your location and scan data will be visible to others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground">{disease.fullName}</p>
            <p className="text-xs text-muted-foreground">{Math.round(scan.confidence * 100)}% confidence</p>
            {scan.lat !== undefined && scan.lng !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Globe className="w-3 h-3" /> Location will be shared
              </p>
            )}
          </div>

          <Textarea
            placeholder="Add a note (optional)… e.g. 'Found on my east field'"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="rounded-xl resize-none"
            rows={3}
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
              Skip
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-hero"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
