import { supabase } from '@/lib/supabase';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  hasReadToday: boolean;
}

/**
 * Calculate and update user's reading streak
 */
export async function updateUserStreak(userId: string): Promise<StreakData> {
  try {
    // Get all completed reading sessions grouped by date
    const { data: sessions, error } = await supabase
      .from('reading_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching reading sessions for streak:', error);
      return { currentStreak: 0, longestStreak: 0, hasReadToday: false };
    }

    if (!sessions || sessions.length === 0) {
      // Update profile with 0 streak
      await updateProfileStreak(userId, 0);
      return { currentStreak: 0, longestStreak: 0, hasReadToday: false };
    }

    // Group sessions by date
    const dateSet = new Set<string>();
    sessions.forEach(session => {
      const date = new Date(session.started_at);
      date.setHours(0, 0, 0, 0);
      dateSet.add(date.toISOString().split('T')[0]);
    });

    const uniqueDates = Array.from(dateSet).sort().reverse();
    
    // Check if user has read today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const hasReadToday = uniqueDates.includes(todayStr);

    // Calculate current streak
    let currentStreak = 0;
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const sessionDate = new Date(uniqueDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (sessionDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1; // Start with 1 for the first date
    
    if (uniqueDates.length > 0) {
      longestStreak = 1; // At least 1 if there are any reading days
      
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const nextDate = new Date(uniqueDates[i + 1]);
        const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Update the profile with the calculated streak
    await updateProfileStreak(userId, currentStreak);

    return { currentStreak, longestStreak, hasReadToday };
  } catch (error) {
    console.error('Error in updateUserStreak:', error);
    return { currentStreak: 0, longestStreak: 0, hasReadToday: false };
  }
}

/**
 * Get user's current streak data
 */
export async function getUserStreakData(userId: string): Promise<StreakData> {
  try {
    // First try to get from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('streak')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile streak:', profileError);
      // Fallback to calculating from sessions
      return await updateUserStreak(userId);
    }

    // Calculate additional data (longest streak and has read today)
    const { data: sessions, error: sessionsError } = await supabase
      .from('reading_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('started_at', { ascending: false });

    if (sessionsError || !sessions) {
      return { currentStreak: profile?.streak || 0, longestStreak: 0, hasReadToday: false };
    }

    // Check if user has read today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const hasReadToday = sessions.some(session => {
      const sessionDate = new Date(session.started_at);
      return sessionDate >= today && sessionDate < tomorrow;
    });

    // Calculate longest streak for completeness
    const dateSet = new Set<string>();
    sessions.forEach(session => {
      const date = new Date(session.started_at);
      date.setHours(0, 0, 0, 0);
      dateSet.add(date.toISOString().split('T')[0]);
    });

    const uniqueDates = Array.from(dateSet).sort().reverse();
    let longestStreak = 0;
    let tempStreak = 1;
    
    if (uniqueDates.length > 0) {
      longestStreak = 1;
      
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const nextDate = new Date(uniqueDates[i + 1]);
        const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { 
      currentStreak: profile?.streak || 0, 
      longestStreak, 
      hasReadToday 
    };
  } catch (error) {
    console.error('Error in getUserStreakData:', error);
    return { currentStreak: 0, longestStreak: 0, hasReadToday: false };
  }
}

/**
 * Update the streak value in the user's profile
 */
async function updateProfileStreak(userId: string, streak: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ streak })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile streak:', error);
    }
  } catch (error) {
    console.error('Error in updateProfileStreak:', error);
  }
}

/**
 * Check if user should receive a streak achievement
 */
export async function checkStreakAchievements(userId: string, currentStreak: number): Promise<void> {
  try {
    // Check for week streak achievement (7 days)
    if (currentStreak >= 7) {
      // Check if user already has this achievement
      const { data: existingAchievement } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', 'week_streak')
        .single();

      if (!existingAchievement) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: 'week_streak'
          });
        
        console.log('Week streak achievement granted!');
      }
    }
  } catch (error) {
    console.error('Error checking streak achievements:', error);
  }
} 