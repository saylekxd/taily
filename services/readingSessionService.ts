import { supabase } from '@/lib/supabase';
import { ReadingSession, ReadingSessionStats, Story } from '@/types';
import { updateUserStreak, checkStreakAchievements, getUserStreakData } from '@/services/streakService';

/**
 * Start a new reading session
 */
export async function startReadingSession(userId: string, storyId: string, isPersonalized: boolean = false): Promise<string | null> {
  try {
    // For personalized stories, we don't create reading sessions since they don't exist in the stories table
    // and the foreign key constraint would fail. Personalized stories don't need session tracking.
    if (isPersonalized) {
      // Return a dummy session ID for personalized stories
      return `personalized-${storyId}-${Date.now()}`;
    }

    const { data, error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: userId,
        story_id: storyId,
        duration: 0,
        completed: false,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting reading session:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in startReadingSession:', error);
    return null;
  }
}

/**
 * Update an existing reading session
 */
export async function updateReadingSession(
  sessionId: string,
  duration: number,
  completed: boolean = false
): Promise<void> {
  try {
    // Skip database operations for personalized story sessions
    if (sessionId.startsWith('personalized-')) {
      return;
    }

    const updateData: any = {
      duration,
      completed,
    };

    // If session is completed, set ended_at
    if (completed) {
      updateData.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('reading_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating reading session:', error);
    }
  } catch (error) {
    console.error('Error in updateReadingSession:', error);
  }
}

/**
 * End a reading session
 */
export async function endReadingSession(
  sessionId: string,
  duration: number,
  completed: boolean = false
): Promise<void> {
  try {
    // For personalized story sessions, we still want to update streak if completed
    if (sessionId.startsWith('personalized-')) {
      if (completed) {
        // Extract user ID from the session ID format: personalized-{storyId}-{timestamp}
        // We need to get the user ID from somewhere else since it's not in the session ID
        // For now, we'll skip streak updates for personalized stories
        console.log('Personalized story completed - streak update skipped');
      }
      return;
    }

    const updateData: any = {
      duration,
      completed,
      ended_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabase
      .from('reading_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select('user_id')
      .single();

    if (error) {
      console.error('Error ending reading session:', error);
      return;
    }

    // If session is completed, update the user's streak
    if (completed && session?.user_id) {
      try {
        const streakData = await updateUserStreak(session.user_id);
        await checkStreakAchievements(session.user_id, streakData.currentStreak);
        console.log('Streak updated:', streakData);
      } catch (streakError) {
        console.error('Error updating streak after completing session:', streakError);
      }
    }
  } catch (error) {
    console.error('Error in endReadingSession:', error);
  }
}

/**
 * Get reading sessions for a user
 */
export async function getUserReadingSessions(
  userId: string,
  limit?: number,
  includeStory: boolean = false
): Promise<ReadingSession[]> {
  try {
    let query = supabase
      .from('reading_sessions')
      .select(includeStory ? 'id, user_id, story_id, duration, completed, started_at, ended_at, stories(id, title, content, cover_image, categories, reading_time, has_audio)' : '*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reading sessions:', error);
      return [];
    }

    return data?.map((session: any) => ({
      id: session.id,
      user_id: session.user_id,
      story_id: session.story_id,
      duration: session.duration,
      completed: session.completed,
      started_at: session.started_at,
      ended_at: session.ended_at,
      story: includeStory && session.stories ? transformDbStoryToStory(session.stories) : undefined,
    })) || [];
  } catch (error) {
    console.error('Error in getUserReadingSessions:', error);
    return [];
  }
}

/**
 * Get reading sessions for a specific story
 */
export async function getStoryReadingSessions(
  userId: string,
  storyId: string
): Promise<ReadingSession[]> {
  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching story reading sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStoryReadingSessions:', error);
    return [];
  }
}

/**
 * Get reading session statistics for a user
 */
export async function getReadingSessionStats(userId: string): Promise<ReadingSessionStats> {
  try {
    // Get all reading sessions
    const { data: sessions, error } = await supabase
      .from('reading_sessions')
      .select('id, user_id, story_id, duration, completed, started_at, ended_at, stories(id, title, content, cover_image, categories, reading_time, has_audio)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching reading session stats:', error);
      return createEmptyStats();
    }

    if (!sessions || sessions.length === 0) {
      return createEmptyStats();
    }

    // Calculate statistics
    const typedSessions = sessions as any[];
    const totalSessions = typedSessions.length;
    const completedSessions = typedSessions.filter(s => s.completed).length;
    const totalReadingTime = typedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageSessionTime = totalReadingTime / totalSessions;

    // Calculate daily reading time (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = typedSessions.filter(s => 
      new Date(s.started_at) >= today
    );
    const dailyReadingTime = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Calculate weekly reading time (this week)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions = typedSessions.filter(s => 
      new Date(s.started_at) >= weekStart
    );
    const weeklyReadingTime = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Find most read story
    const storyStats = new Map<string, { story: any, sessionCount: number, totalTime: number }>();
    
    typedSessions.forEach(session => {
      if (session.stories) {
        const storyId = session.story_id;
        const existing = storyStats.get(storyId);
        
        if (existing) {
          existing.sessionCount++;
          existing.totalTime += session.duration || 0;
        } else {
          storyStats.set(storyId, {
            story: session.stories,
            sessionCount: 1,
            totalTime: session.duration || 0,
          });
        }
      }
    });

    // Find the story with most sessions
    let mostReadStory: ReadingSessionStats['mostReadStory'];
    let maxSessions = 0;
    
    storyStats.forEach(stat => {
      if (stat.sessionCount > maxSessions) {
        maxSessions = stat.sessionCount;
        mostReadStory = {
          story: transformDbStoryToStory(stat.story),
          sessionCount: stat.sessionCount,
          totalTime: stat.totalTime,
        };
      }
    });

    return {
      totalSessions,
      totalReadingTime,
      averageSessionTime,
      completedSessions,
      dailyReadingTime,
      weeklyReadingTime,
      mostReadStory,
    };
  } catch (error) {
    console.error('Error in getReadingSessionStats:', error);
    return createEmptyStats();
  }
}

/**
 * Get today's reading sessions
 */
export async function getTodayReadingSessions(userId: string): Promise<ReadingSession[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('id, user_id, story_id, duration, completed, started_at, ended_at, stories(id, title, content, cover_image, categories, reading_time, has_audio)')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString())
      .lt('started_at', tomorrow.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching today reading sessions:', error);
      return [];
    }

    return data?.map((session: any) => ({
      id: session.id,
      user_id: session.user_id,
      story_id: session.story_id,
      duration: session.duration,
      completed: session.completed,
      started_at: session.started_at,
      ended_at: session.ended_at,
      story: session.stories ? transformDbStoryToStory(session.stories) : undefined,
    })) || [];
  } catch (error) {
    console.error('Error in getTodayReadingSessions:', error);
    return [];
  }
}

/**
 * Check if user has read today (for streak calculation)
 */
export async function hasReadToday(userId: string): Promise<boolean> {
  try {
    const streakData = await getUserStreakData(userId);
    return streakData.hasReadToday;
  } catch (error) {
    console.error('Error in hasReadToday:', error);
    return false;
  }
}

/**
 * Get reading streaks and patterns
 */
export async function getReadingStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    const streakData = await getUserStreakData(userId);
    return { 
      currentStreak: streakData.currentStreak, 
      longestStreak: streakData.longestStreak 
    };
  } catch (error) {
    console.error('Error in getReadingStreak:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

// Helper functions
function createEmptyStats(): ReadingSessionStats {
  return {
    totalSessions: 0,
    totalReadingTime: 0,
    averageSessionTime: 0,
    completedSessions: 0,
    dailyReadingTime: 0,
    weeklyReadingTime: 0,
  };
}

function transformDbStoryToStory(dbStory: any): Story {
  return {
    id: dbStory.id,
    title: dbStory.title,
    content: dbStory.content,
    cover_image: dbStory.cover_image,
    categories: dbStory.categories || [],
    reading_time: dbStory.reading_time,
    has_audio: dbStory.has_audio || false,
    progress: 0,
    is_favorite: false,
    completed: false,
    is_new: false,
  };
}