import { DISEASE_CLASSES, DiseaseInfo, DiseaseClass } from './types';

const HEALTHY_STEPS = [
  'Continue routine scouting for early symptom detection.',
  'Maintain good irrigation and balanced nutrition practices.',
  'Keep weeds and plant debris under control around fields.',
  'Use clean tools and quality planting material.',
];

const ISSUE_STEPS = [
  'Inspect nearby plants and mark affected zones for monitoring.',
  'Remove heavily affected leaves or plants where agronomically appropriate.',
  'Improve spacing, airflow, and field hygiene to reduce spread risk.',
  'Use crop-appropriate disease management guidance from local extension experts.',
];

const ISSUE_COLORS = [
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(var(--info))',
];

function toReadableLabel(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseClassLabel(label: string): { plant: string; condition: string; isHealthy: boolean } {
  const [plantRaw = label, conditionRaw = ''] = label.split('___');
  const isHealthy = conditionRaw.toLowerCase() === 'healthy' || label === 'Healthy';

  return {
    plant: toReadableLabel(plantRaw),
    condition: toReadableLabel(conditionRaw || 'healthy'),
    isHealthy,
  };
}

function buildDiseaseInfo(label: DiseaseClass, index: number): DiseaseInfo {
  const { plant, condition, isHealthy } = parseClassLabel(label);

  return {
    label,
    fullName: isHealthy ? `${plant} (Healthy)` : `${plant} - ${condition}`,
    description: isHealthy
      ? `No obvious disease symptoms were detected for ${plant}. Continue regular monitoring to catch issues early.`
      : `Potential signs of ${condition} were detected on ${plant}. Treat this as decision support and confirm with local agronomy guidance.`,
    steps: isHealthy ? HEALTHY_STEPS : ISSUE_STEPS,
    color: isHealthy ? 'hsl(var(--success))' : ISSUE_COLORS[index % ISSUE_COLORS.length],
  };
}

export const ALL_CLASSES: DiseaseClass[] = [...DISEASE_CLASSES];

export const DISEASE_DATA: Record<DiseaseClass, DiseaseInfo> = Object.fromEntries(
  ALL_CLASSES.map((label, index) => [label, buildDiseaseInfo(label, index)])
) as Record<DiseaseClass, DiseaseInfo>;

export function isHealthyLabel(label: string): boolean {
  return label === 'Healthy' || label.toLowerCase().endsWith('___healthy');
}

export function getDiseaseInfo(label: string): DiseaseInfo {
  const known = (DISEASE_DATA as Record<string, DiseaseInfo>)[label];
  if (known) return known;

  const { plant, condition, isHealthy } = parseClassLabel(label);
  const fullName = label.includes('___')
    ? (isHealthy ? `${plant} (Healthy)` : `${plant} - ${condition}`)
    : toReadableLabel(label);

  return {
    label,
    fullName,
    description: 'This label is not part of the currently configured disease set. Verify model/version alignment.',
    steps: [
      'Confirm model class configuration and retrain/redeploy if needed.',
      'Review this sample manually before taking field action.',
    ],
    color: isHealthy ? 'hsl(var(--success))' : 'hsl(var(--warning))',
  };
}
