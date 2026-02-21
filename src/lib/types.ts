export type DiseaseClass = 'CBB' | 'CBSD' | 'CGM' | 'CMD' | 'Healthy';

export interface PredictionResult {
  predictedLabel: DiseaseClass;
  confidence: number;
  top3: { label: DiseaseClass; prob: number }[];
  modelVersion: string;
}

export interface ScanRecord {
  id: string;
  createdAt: string;
  imageUri?: string;
  predictedLabel: DiseaseClass;
  confidence: number;
  top3: { label: DiseaseClass; prob: number }[];
  lat?: number;
  lng?: number;
  regionText?: string;
  notes?: string;
}

export interface DiseaseInfo {
  label: DiseaseClass;
  fullName: string;
  description: string;
  steps: string[];
  color: string;
}
