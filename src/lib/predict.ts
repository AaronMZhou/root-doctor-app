import { PredictionResult } from './types';
import { mockPredict } from './mock-predict';

const PREDICT_API_URL = import.meta.env.VITE_PREDICT_API_URL?.replace(/\/$/, '');

function isValidPrediction(payload: unknown): payload is PredictionResult {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Record<string, unknown>;
  return (
    typeof data.predictedLabel === 'string' &&
    typeof data.confidence === 'number' &&
    Array.isArray(data.top3) &&
    typeof data.modelVersion === 'string'
  );
}

export async function predictLeaf(imageFile: File): Promise<PredictionResult> {
  if (!PREDICT_API_URL) {
    return mockPredict(imageFile);
  }

  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    const response = await fetch(`${PREDICT_API_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Prediction API failed (${response.status})`);
    }

    const result = await response.json();
    if (!isValidPrediction(result)) {
      throw new Error('Prediction API returned an invalid response shape.');
    }

    return result;
  } catch {
    // Fallback keeps the app usable when backend is unavailable.
    return mockPredict(imageFile);
  }
}
