import { PredictionResult, DiseaseClass, DISEASE_CLASSES } from './types';
import { mockPredict } from './mock-predict';

const API_URL = import.meta.env.VITE_PREDICT_API_URL;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isDiseaseClass(label: string): label is DiseaseClass {
  return (DISEASE_CLASSES as readonly string[]).includes(label);
}

export async function predictLeaf(imageFile: File): Promise<PredictionResult> {
  if (!API_URL) {
    console.warn('VITE_PREDICT_API_URL not set — falling back to mock predictor');
    return mockPredict(imageFile);
  }

  try {
    const base64 = await fileToBase64(imageFile);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    const predictedLabel = isDiseaseClass(data.prediction)
      ? data.prediction
      : DISEASE_CLASSES[0];

    const top3 = (data.top3 ?? []).slice(0, 3).map(
      (item: { label: string; prob: number }) => ({
        label: isDiseaseClass(item.label) ? item.label : DISEASE_CLASSES[0],
        prob: item.prob,
      }),
    );

    return {
      predictedLabel,
      confidence: data.confidence,
      top3,
      modelVersion: 'modal-v1.0',
    };
  } catch (error) {
    console.error('Modal API failed, falling back to mock:', error);
    return mockPredict(imageFile);
  }
}
