import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDiseaseInfo, isHealthyLabel } from '@/lib/disease-data';
import CommunityMap, { MapIssuePoint } from '@/components/CommunityMap';
import OutbreakWidget from '@/components/OutbreakWidget';
import BottomNav from '@/components/BottomNav';

interface CommunityPost {
  id: string;
  user_id: string;
  predicted_label: string;
  confidence: number;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'loading' | 'ready' | 'unavailable' | 'denied'>('loading');
  const { user } = useAuth();

  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!postsData) { setPosts([]); setLoading(false); return; }

    // Fetch profiles for the user_ids
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) ?? []);

    setPosts(postsData.map(p => ({
      ...p,
      profiles: { display_name: profileMap.get(p.user_id) ?? null },
    })) as CommunityPost[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationState('ready');
      },
      (error) => {
        setLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const handleDelete = async (postId: string) => {
    await supabase.from('community_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const mapIssues = useMemo<MapIssuePoint[]>(() => {
    return posts
      .filter(post => post.lat !== null && post.lng !== null)
      .map(post => ({
        id: post.id,
        lat: post.lat as number,
        lng: post.lng as number,
        label: getDiseaseInfo(post.predicted_label).fullName,
        confidence: post.confidence,
        displayName: post.profiles?.display_name || 'Anonymous',
        createdAt: post.created_at,
      }));
  }, [posts]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-foreground">Community</h1>
        </div>
        <p className="text-sm text-muted-foreground">Disease reports from nearby farmers</p>
      </div>

      <div className="flex-1 px-5 space-y-3">
        <OutbreakWidget />

        {(userLocation || mapIssues.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card p-3 shadow-card"
          >
            <p className="text-xs font-semibold text-foreground mb-2">Issue map</p>
            <CommunityMap issues={mapIssues} userLocation={userLocation} />
            <p className="text-[10px] text-muted-foreground mt-2">
              {locationState === 'ready' && 'Showing your location and shared issue reports.'}
              {locationState === 'loading' && 'Getting your location for nearby context...'}
              {locationState === 'denied' && 'Location access is off. Enable it to see your marker.'}
              {locationState === 'unavailable' && 'Location unavailable on this device/browser.'}
            </p>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No community reports yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Scan a leaf and share your findings!</p>
          </div>
        ) : (
          posts.map((post, i) => {
            const disease = getDiseaseInfo(post.predicted_label);
            const isHealthy = isHealthyLabel(post.predicted_label);
            const isOwn = post.user_id === user?.id;
            const displayName = post.profiles?.display_name || 'Anonymous';
            const hasCoordinates = post.lat !== null && post.lng !== null;
            const distanceKm = hasCoordinates && userLocation
              ? getDistance(userLocation.lat, userLocation.lng, post.lat as number, post.lng as number)
              : null;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground ${isHealthy ? 'bg-success' : 'bg-destructive'}`}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isOwn && (
                    <button onClick={() => handleDelete(post.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {post.image_url && (
                  <img src={post.image_url} alt="Leaf scan" className="w-full aspect-[4/3] object-cover rounded-xl mb-3" />
                )}

                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isHealthy ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                    {disease?.fullName ?? post.predicted_label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(post.confidence * 100)}% confidence
                  </span>
                </div>

                {post.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{post.notes}</p>
                )}

                {hasCoordinates && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex flex-wrap items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {(post.lat as number).toFixed(2)}, {(post.lng as number).toFixed(2)}
                    {distanceKm !== null && <span>• {distanceKm.toFixed(1)} km away</span>}
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
