import { Achievement } from '@/types';

// Base achievement structure with IDs for translation
const baseAchievements = [
  { 
    id: 'first_story', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
    unlocked: false
  },
  { 
    id: 'week_streak', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232691.png',
    unlocked: false
  },
  { 
    id: 'story_lover', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232692.png',
    unlocked: false
  },
  { 
    id: 'night_owl', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232689.png',
    unlocked: false
  },
  { 
    id: 'bookworm', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232687.png',
    unlocked: false
  },
  { 
    id: 'explorer', 
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232690.png',
    unlocked: false
  },
];

// Function to get translated achievements
export const getTranslatedAchievements = (t: (key: string) => string): Achievement[] => {
  return baseAchievements.map(achievement => ({
    ...achievement,
    name: t(`achievementNames.${achievement.id}`),
    description: t(`achievementDescriptions.${achievement.id}`),
  }));
};

// Export base achievements for backwards compatibility
export const achievements = baseAchievements.map(achievement => ({
  ...achievement,
  name: achievement.id, // Fallback to ID if no translation function provided
  description: achievement.id,
}));