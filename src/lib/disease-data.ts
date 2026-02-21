import { DiseaseInfo, DiseaseClass } from './types';

export const DISEASE_DATA: Record<DiseaseClass, DiseaseInfo> = {
  Healthy: {
    label: 'Healthy',
    fullName: 'Healthy Leaf',
    description: 'No obvious disease patterns detected. The leaf appears to be in good condition with normal coloration and structure.',
    steps: [
      'Continue regular monitoring of your crops',
      'Maintain proper spacing between plants',
      'Ensure adequate nutrition and water supply',
      'Keep field clean of debris',
    ],
    color: 'hsl(var(--success))',
  },
  CBB: {
    label: 'CBB',
    fullName: 'Cassava Bacterial Blight',
    description: 'Bacterial blight typically presents as angular leaf spots, wilting, and die-back of shoots. It is caused by Xanthomonas axonopodis and can spread rapidly in wet conditions.',
    steps: [
      'Isolate affected plants immediately',
      'Remove and destroy infected leaves and stems',
      'Sanitize cutting tools between plants',
      'Avoid working with plants when wet',
      'Seek guidance from local agricultural extension officers',
    ],
    color: 'hsl(var(--destructive))',
  },
  CBSD: {
    label: 'CBSD',
    fullName: 'Cassava Brown Streak Disease',
    description: 'Brown streak disease shows yellow/necrotic patches on leaves and brown streaks on stems. Root necrosis can render tubers unusable. Spread by whitefly vectors.',
    steps: [
      'Monitor plants closely for stem and root symptoms',
      'Remove and destroy severely affected plants',
      'Use certified disease-free cuttings for new planting',
      'Manage whitefly populations',
      'Consult local agricultural experts for resistant varieties',
    ],
    color: 'hsl(var(--warning))',
  },
  CGM: {
    label: 'CGM',
    fullName: 'Cassava Green Mottle',
    description: 'Green mottle virus causes a characteristic light and dark green mosaic mottling pattern on leaves. It can reduce plant vigor and yield over time.',
    steps: [
      'Monitor the spread to neighboring plants',
      'Manage insect vectors (mites and whiteflies)',
      'Remove heavily symptomatic plants',
      'Use clean planting material',
      'Consult with agricultural extension services',
    ],
    color: 'hsl(var(--info))',
  },
  CMD: {
    label: 'CMD',
    fullName: 'Cassava Mosaic Disease',
    description: 'Mosaic disease causes chlorosis, leaf distortion, and stunted growth. It is the most widespread cassava disease in Africa, spread primarily by whiteflies.',
    steps: [
      'Remove and destroy affected plants promptly',
      'Manage whitefly populations with appropriate measures',
      'Plant resistant or tolerant varieties when available',
      'Use virus-free planting material',
      'Consult local extension officers for best management practices',
    ],
    color: 'hsl(var(--accent))',
  },
};

export const ALL_CLASSES: DiseaseClass[] = ['CBB', 'CBSD', 'CGM', 'CMD', 'Healthy'];
