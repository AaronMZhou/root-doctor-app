-- Outbreak alerts generated from nearby scan analysis
CREATE TABLE public.outbreak_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disease_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_outbreak BOOLEAN NOT NULL DEFAULT true,
  severity TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 25,
  nearby_count INTEGER NOT NULL DEFAULT 0,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outbreak_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view outbreak alerts"
  ON public.outbreak_alerts
  FOR SELECT
  USING (true);

CREATE POLICY "Auth users can create outbreak alerts"
  ON public.outbreak_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Realtime notifications for in-app alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbreak_alerts;
