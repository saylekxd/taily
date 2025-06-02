import { Interest } from '@/types';

// Base interests structure with IDs for translation
const baseInterests = [
  { id: 'animals' },
  { id: 'adventure' },
  { id: 'fairy_tales' },
  { id: 'science' },
  { id: 'nature' },
  { id: 'fantasy' },
  { id: 'space' },
  { id: 'dinosaurs' },
  { id: 'princesses' },
  { id: 'superheroes' },
  { id: 'robots' },
  { id: 'sports' },
  { id: 'music' },
  { id: 'friendship' },
  { id: 'vehicles' },
];

// Function to get translated interests
export const getTranslatedInterests = (t: (key: string) => string): Interest[] => {
  return baseInterests.map(interest => ({
    ...interest,
    name: t(`interests.${interest.id}`),
  }));
};

// Export base interests for backwards compatibility
export const interests: Interest[] = baseInterests.map(interest => ({
  ...interest,
  name: interest.id, // Fallback to ID if no translation function provided
}));