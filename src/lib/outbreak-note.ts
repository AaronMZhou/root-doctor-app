import type { Tables } from '@/integrations/supabase/types';

export const OUTBREAK_NOTE_PREFIX = 'OUTBREAK_ALERT::';

export interface OutbreakNotePayload {
  summary: string;
  severity: string | null;
  radiusKm: number;
  nearbyCount: number;
  sourcePostId: string;
  evaluatedAt: string;
}

export interface OutbreakAlertLike {
  id: string;
  createdAt: string;
  diseaseLabel: string;
  lat: number;
  lng: number;
  userId: string;
  summary: string;
  severity: string | null;
  radiusKm: number;
  nearbyCount: number;
  sourcePostId: string;
  evaluatedAt: string;
}

function safeNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function serializeOutbreakNote(payload: OutbreakNotePayload): string {
  return `${OUTBREAK_NOTE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseOutbreakNote(note: string | null): OutbreakNotePayload | null {
  if (!note || !note.startsWith(OUTBREAK_NOTE_PREFIX)) return null;
  const raw = note.slice(OUTBREAK_NOTE_PREFIX.length);
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const summary = typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : 'Potential outbreak detected nearby.';
    const severity = typeof data.severity === 'string' && data.severity.trim() ? data.severity.trim() : null;
    const sourcePostId = typeof data.sourcePostId === 'string' ? data.sourcePostId : '';

    return {
      summary,
      severity,
      radiusKm: Math.max(1, safeNumber(data.radiusKm, 25)),
      nearbyCount: Math.max(0, Math.floor(safeNumber(data.nearbyCount, 0))),
      sourcePostId,
      evaluatedAt: typeof data.evaluatedAt === 'string' ? data.evaluatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function postToOutbreakAlert(post: Tables<'community_posts'>): OutbreakAlertLike | null {
  if (post.lat === null || post.lng === null) return null;
  const parsed = parseOutbreakNote(post.notes);
  if (!parsed) return null;

  return {
    id: post.id,
    createdAt: post.created_at,
    diseaseLabel: post.predicted_label,
    lat: post.lat,
    lng: post.lng,
    userId: post.user_id,
    summary: parsed.summary,
    severity: parsed.severity,
    radiusKm: parsed.radiusKm,
    nearbyCount: parsed.nearbyCount,
    sourcePostId: parsed.sourcePostId,
    evaluatedAt: parsed.evaluatedAt,
  };
}
