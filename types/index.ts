// Story types
export interface Story {
  id: string;
  title: string;
  content?: string;
  cover_image: string;
  categories?: string[];
  reading_time?: number;
  progress?: number;
  is_favorite?: boolean;
  completed?: boolean;
  is_new?: boolean;
  has_audio?: boolean;
}

export interface StoryTemplate {
  id: string;
  title: string;
  template: string;
  category: string;
  moral: string;
  age_range: [number, number];
  reading_time: number;
}

// User types
export interface UserProfile {
  id: string;
  child_name: string;
  age: number;
  interests: string[];
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  language: 'en' | 'pl';
  streak: number;
  total_stories_read: number;
  total_reading_time: number;
  onboarding_completed: boolean;
}

// Reading Session types
export interface ReadingSession {
  id: string;
  user_id: string;
  story_id: string;
  duration: number; // in seconds
  completed: boolean;
  started_at: string;
  ended_at?: string;
  story?: Story; // Populated when joining with stories table
}

export interface ReadingSessionStats {
  totalSessions: number;
  totalReadingTime: number; // in seconds
  averageSessionTime: number; // in seconds
  completedSessions: number;
  dailyReadingTime: number; // in seconds for today
  weeklyReadingTime: number; // in seconds for this week
  mostReadStory?: {
    story: Story;
    sessionCount: number;
    totalTime: number;
  };
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  unlocked?: boolean;
  unlocked_at?: string;
}

// Category type
export interface Category {
  id: string;
  name: string;
  color: string;
}

// Interest type
export interface Interest {
  id: string;
  name: string;
}