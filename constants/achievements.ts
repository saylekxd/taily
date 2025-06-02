import { Achievement } from '@/types';

export const achievements: Achievement[] = [
  { 
    id: 'first_story', 
    name: 'First Story', 
    description: 'Read your first story',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
    unlocked: false
  },
  { 
    id: 'week_streak', 
    name: 'Week Reader', 
    description: '7 days reading streak',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232691.png',
    unlocked: false
  },
  { 
    id: 'story_lover', 
    name: 'Story Lover', 
    description: 'Read 10 stories',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232692.png',
    unlocked: false
  },
  { 
    id: 'night_owl', 
    name: 'Night Owl', 
    description: 'Read a story after 8pm',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232689.png',
    unlocked: false
  },
  { 
    id: 'bookworm', 
    name: 'Bookworm', 
    description: 'Read for more than 1 hour in a day',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232687.png',
    unlocked: false
  },
  { 
    id: 'explorer', 
    name: 'Explorer', 
    description: 'Read stories from 5 different categories',
    icon_url: 'https://cdn-icons-png.flaticon.com/512/2232/2232690.png',
    unlocked: false
  },
];