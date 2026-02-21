import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getBoundingBox, getDistanceKm } from '@/lib/geo';

const DEFAULT_WEBHOOK_URL = 'https://zhoumaaron.app.n8n.cloud/webhook/37f6ef04-f709-4a22-ae5e-217e38ab40b6';
const OUTBREAK_WEBHOOK_URL = import.meta.env.VITE_N8N_OUTBREAK_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const OUTBREAK_WEBHOOK_TOKEN = import.meta.env.VITE_N8N_OUTBREAK_WEBHOOK_TOKEN;

const DEFAULT_RADIUS_KM = 25;
const DEFAULT_LOOKBACK_HOURS = 72;
const DEDUPE_WINDOW_HOURS = 6;

type CommunityPostRow = Tables<'community_posts'>;
type OutbreakAlertRow = Tables<'outbreak_alerts'>;

interface EvaluateOutbreakInput {
  postId: string;
  createdBy: string;
  predictedLabel: string;
  confidence: number;
  createdAt: string;
  lat: number | null;
  lng: number | null;
}

interface WebhookDecision {
  outbreak: boolean;
  summary: string;
  diseaseLabel: string;
  radiusKm: number;
  severity: string | null;
}

export interface EvaluateOutbreakResult {
  status: 'created' | 'no_outbreak' | 'duplicate' | 'skipped' | 'error';
  alert?: OutbreakAlertRow;
  message?: string;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  if (typeof value === 'number') return value > 0;
  return false;
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseWebhookDecision(raw: unknown, fallbackLabel: string): WebhookDecision {
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested = (payload.result && typeof payload.result === 'object' ? payload.result : payload) as Record<string, unknown>;

  const outbreak = toBoolean(
    nested.outbreak ??
    nested.is_outbreak ??
    nested.outbreakDetected ??
    nested.significant_issue
  );

  const summaryValue = nested.summary ?? nested.description ?? nested.message;
  const summary = typeof summaryValue === 'string' && summaryValue.trim()
    ? summaryValue.trim()
    : 'Potential disease outbreak risk detected in your nearby area.';

  const diseaseValue = nested.disease ?? nested.disease_label ?? nested.predicted_label;
  const diseaseLabel = typeof diseaseValue === 'string' && diseaseValue.trim()
    ? diseaseValue.trim()
    : fallbackLabel;

  const radiusKm = Math.min(toNumber(nested.radiusKm ?? nested.radius_km, DEFAULT_RADIUS_KM), 100);
  const severityValue = nested.severity;
  const severity = typeof severityValue === 'string' && severityValue.trim() ? severityValue.trim() : null;

  return { outbreak, summary, diseaseLabel, radiusKm, severity };
}

async function fetchNearbyRecentScans(center: { lat: number; lng: number }, radiusKm: number, lookbackHours: number) {
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
  const box = getBoundingBox(center, radiusKm);

  const { data, error } = await supabase
    .from('community_posts')
    .select('id,predicted_label,confidence,created_at,lat,lng,user_id')
    .gte('created_at', since)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLng)
    .lte('lng', box.maxLng)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).filter((item) => {
    if (item.lat === null || item.lng === null) return false;
    return getDistanceKm(center, { lat: item.lat, lng: item.lng }) <= radiusKm;
  });
}

async function hasRecentDuplicateAlert(center: { lat: number; lng: number }, radiusKm: number, diseaseLabel: string) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const box = getBoundingBox(center, radiusKm);

  const { data, error } = await supabase
    .from('outbreak_alerts')
    .select('id,lat,lng,radius_km')
    .eq('disease_label', diseaseLabel)
    .gte('created_at', since)
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLng)
    .lte('lng', box.maxLng)
    .limit(50);

  if (error) throw error;

  return (data ?? []).some((alert) => {
    const distance = getDistanceKm(center, { lat: alert.lat, lng: alert.lng });
    return distance <= Math.min(alert.radius_km, radiusKm);
  });
}

async function callOutbreakWebhook(input: EvaluateOutbreakInput, nearbyScans: CommunityPostRow[]) {
  const body = {
    currentScan: {
      id: input.postId,
      predictedLabel: input.predictedLabel,
      confidence: input.confidence,
      createdAt: input.createdAt,
      lat: input.lat,
      lng: input.lng,
    },
    nearbyScans: nearbyScans.map(scan => ({
      id: scan.id,
      predictedLabel: scan.predicted_label,
      confidence: scan.confidence,
      createdAt: scan.created_at,
      lat: scan.lat,
      lng: scan.lng,
      userId: scan.user_id,
    })),
    config: {
      lookbackHours: DEFAULT_LOOKBACK_HOURS,
      defaultRadiusKm: DEFAULT_RADIUS_KM,
    },
    generatedAt: new Date().toISOString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (OUTBREAK_WEBHOOK_TOKEN) {
    headers['x-webhook-token'] = OUTBREAK_WEBHOOK_TOKEN;
  }

  const response = await fetch(OUTBREAK_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed (${response.status})`);
  }

  const text = await response.text();
  let raw: unknown = {};
  if (text.trim()) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = { message: text };
    }
  }
  return parseWebhookDecision(raw, input.predictedLabel);
}

export async function evaluateOutbreakForSharedScan(input: EvaluateOutbreakInput): Promise<EvaluateOutbreakResult> {
  if (input.lat === null || input.lng === null) {
    return { status: 'skipped', message: 'Scan has no location coordinates.' };
  }

  if (!OUTBREAK_WEBHOOK_URL) {
    return { status: 'skipped', message: 'No outbreak webhook URL configured.' };
  }

  try {
    const center = { lat: input.lat, lng: input.lng };
    const nearbyScans = await fetchNearbyRecentScans(center, DEFAULT_RADIUS_KM, DEFAULT_LOOKBACK_HOURS);
    const decision = await callOutbreakWebhook(input, nearbyScans);

    if (!decision.outbreak) {
      return { status: 'no_outbreak', message: decision.summary };
    }

    const duplicate = await hasRecentDuplicateAlert(center, decision.radiusKm, decision.diseaseLabel);
    if (duplicate) {
      return { status: 'duplicate', message: 'Similar outbreak alert already exists nearby.' };
    }

    const { data, error } = await supabase
      .from('outbreak_alerts')
      .insert({
        source_post_id: input.postId,
        created_by: input.createdBy,
        disease_label: decision.diseaseLabel,
        summary: decision.summary,
        is_outbreak: true,
        severity: decision.severity,
        lat: input.lat,
        lng: input.lng,
        radius_km: decision.radiusKm,
        nearby_count: nearbyScans.length,
        evaluated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return { status: 'created', alert: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate outbreak risk.';
    return { status: 'error', message };
  }
}
