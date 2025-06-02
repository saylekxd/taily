import { Category } from '@/types';
import { colors } from './colors';

// Base categories structure with IDs for translation
const baseCategories = [
  {
    id: 'age_3_plus',
    color: colors.primary,
  },
  {
    id: 'age_5_plus',
    color: colors.secondary,
  },
  {
    id: 'age_8_plus',
    color: colors.accent,
  },
  {
    id: 'animals',
    color: '#8B5CF6',
  },
  {
    id: 'adventure',
    color: '#F59E0B',
  },
  {
    id: 'fairy_tale',
    color: '#EC4899',
  },
  {
    id: 'science',
    color: '#10B981',
  },
  {
    id: 'fantasy',
    color: '#6366F1',
  },
  {
    id: 'bedtime',
    color: '#8B5CF6',
  },
  {
    id: 'audio',
    color: '#F43F5E',
  },
];

// Function to get translated categories
export const getTranslatedCategories = (t: (key: string) => string): Category[] => {
  return baseCategories.map(category => ({
    ...category,
    name: t(`categories.${category.id}`),
  }));
};

// Export base categories for backwards compatibility
export const categories: Category[] = baseCategories.map(category => ({
  ...category,
  name: category.id, // Fallback to ID if no translation function provided
}));