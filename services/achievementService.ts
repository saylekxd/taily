import { supabase } from '@/lib/supabase';
import { achievements } from '@/constants/achievements';
import { Achievement } from '@/types';

/**
 * Get all achievements for a user with unlock status
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  // Get user's unlocked achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);
  
  // Map the base achievements with unlock status
  return achievements.map(achievement => {
    const userAchievement = userAchievements?.find(
      ua => ua.achievement_id === achievement.id
    );
    
    return {
      ...achievement,
      unlocked: !!userAchievement,
      unlocked_at: userAchievement?.unlocked_at,
    };
  });
}

/**
 * Check if a user qualifies for an achievement and grant it if they do
 */
export async function checkAndGrantAchievement(userId: string, achievementId: string): Promise<boolean> {
  // Check if user already has this achievement
  const { data: existingAchievement, error: checkError } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking achievement:', checkError);
    return false;
  }
  
  // If user already has this achievement, return
  if (existingAchievement) {
    return false;
  }
  
  // Grant the achievement
  const { error: grantError } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
    });
  
  if (grantError) {
    console.error('Error granting achievement:', grantError);
    return false;
  }
  
  return true;
}