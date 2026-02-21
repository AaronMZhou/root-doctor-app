import { PredictionResult, DiseaseClass } from './types';
import { ALL_CLASSES } from './disease-data';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export async function mockPredict(imageFile: File): Promise<PredictionResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  const seed = hashString(imageFile.name + imageFile.size + imageFile.lastModified);
  const rand = seededRandom(seed);

  // Pick primary class deterministically
  const primaryIdx = seed % ALL_CLASSES.length;
  const primaryLabel = ALL_CLASSES[primaryIdx];

  // Generate confidence
  const confidence = 0.65 + rand() * 0.3; // 65-95%

  // Generate remaining probabilities
  const remaining = 1 - confidence;
  const others = ALL_CLASSES.filter(c => c !== primaryLabel);
  const rawProbs = others.map(() => rand());
  const sum = rawProbs.reduce((a, b) => a + b, 0);
  const normalizedProbs = rawProbs.map(p => (p / sum) * remaining);

  const top3: { label: DiseaseClass; prob: number }[] = [
    { label: primaryLabel, prob: Math.round(confidence * 1000) / 1000 },
    ...others
      .map((label, i) => ({ label, prob: Math.round(normalizedProbs[i] * 1000) / 1000 }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 2),
  ];

  return {
    predictedLabel: primaryLabel,
    confidence: Math.round(confidence * 1000) / 1000,
    top3,
    modelVersion: 'mock-v1.0',
  };
}
