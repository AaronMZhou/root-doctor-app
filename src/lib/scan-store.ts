import { ScanRecord } from './types';

const STORAGE_KEY = 'safecrop_scans';
const SETTINGS_KEY = 'safecrop_settings';

export interface AppSettings {
  storePhotos: boolean;
  onboardingComplete: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt';
  locationPermission: 'granted' | 'denied' | 'prompt';
}

const DEFAULT_SETTINGS: AppSettings = {
  storePhotos: false,
  onboardingComplete: false,
  cameraPermission: 'prompt',
  locationPermission: 'prompt',
};

export function getScans(): ScanRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveScan(scan: ScanRecord): void {
  const scans = getScans();
  scans.unshift(scan);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

export function clearScans(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(partial: Partial<AppSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
}

export function exportHistory(format: 'csv' | 'json'): string {
  const scans = getScans();
  if (format === 'json') {
    return JSON.stringify(scans, null, 2);
  }

  const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const headers = ['id', 'createdAt', 'predictedLabel', 'confidence', 'lat', 'lng', 'regionText', 'notes']
    .map(escapeCsv)
    .join(',');
  const rows = scans.map(s => [
    s.id,
    s.createdAt,
    s.predictedLabel,
    s.confidence,
    s.lat ?? '',
    s.lng ?? '',
    s.regionText ?? '',
    s.notes ?? '',
  ].map(escapeCsv).join(','));

  return [headers, ...rows].join('\n');
}

