import { supabase } from '@/lib/supabase';
import { Story } from '@/types';

interface DailyStorySchedule {
  id: string;
  current_story_id: string;
  current_order_index: number;
  last_rotation_date: string;
  rotation_interval_days: number;
  created_at: string;
  updated_at: string;
}

interface DailyStoryInfo {
  id: string;
  story_id: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current daily story
 */
export async function getDailyStory(): Promise<Story | null> {
  try {
    // Check if we need to rotate to the next story
    await checkAndRotateDailyStory();

    // Get the current daily story from the schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('daily_story_schedule')
      .select('*')
      .limit(1)
      .single();

    if (scheduleError) {
      console.error('Error fetching daily story schedule:', scheduleError);
      return null;
    }

    if (!schedule) {
      console.log('No daily story schedule found');
      return null;
    }

    // Get the actual story data
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', schedule.current_story_id)
      .single();

    if (storyError) {
      console.error('Error fetching daily story:', storyError);
      return null;
    }

    return story ? transformDbStoryToStory(story) : null;

  } catch (error) {
    console.error('Error in getDailyStory:', error);
    return null;
  }
}

/**
 * Check if we need to rotate to the next daily story
 */
async function checkAndRotateDailyStory(): Promise<void> {
  try {
    // Get the current schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('daily_story_schedule')
      .select('*')
      .limit(1)
      .single();

    if (scheduleError || !schedule) {
      console.log('No schedule found, initializing...');
      await initializeDailyStorySchedule();
      return;
    }

    // Check if it's time to rotate
    const lastRotationDate = new Date(schedule.last_rotation_date);
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate.getTime() - lastRotationDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference >= schedule.rotation_interval_days) {
      await rotateToNextDailyStory();
    }

  } catch (error) {
    console.error('Error checking daily story rotation:', error);
  }
}

/**
 * Rotate to the next daily story
 */
async function rotateToNextDailyStory(): Promise<void> {
  try {
    // Get all active daily stories
    const { data: dailyStories, error: storiesError } = await supabase
      .from('daily_stories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (storiesError || !dailyStories || dailyStories.length === 0) {
      console.error('No active daily stories found');
      return;
    }

    // Get current schedule
    const { data: currentSchedule, error: scheduleError } = await supabase
      .from('daily_story_schedule')
      .select('*')
      .limit(1)
      .single();

    if (scheduleError || !currentSchedule) {
      console.error('No current schedule found');
      return;
    }

    // Find the next story in rotation
    const currentIndex = currentSchedule.current_order_index;
    const nextIndex = (currentIndex % dailyStories.length) + 1;
    
    const nextStory = dailyStories.find(story => story.order_index === nextIndex) || dailyStories[0];

    // Update the schedule
    const { error: updateError } = await supabase
      .from('daily_story_schedule')
      .update({
        current_story_id: nextStory.story_id,
        current_order_index: nextStory.order_index,
        last_rotation_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSchedule.id);

    if (updateError) {
      console.error('Error updating daily story schedule:', updateError);
    } else {
      console.log(`Daily story rotated to story with order_index: ${nextStory.order_index}`);
    }

  } catch (error) {
    console.error('Error rotating daily story:', error);
  }
}

/**
 * Initialize the daily story schedule if it doesn't exist
 */
async function initializeDailyStorySchedule(): Promise<void> {
  try {
    // Get the first active daily story
    const { data: firstStory, error: storyError } = await supabase
      .from('daily_stories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (storyError || !firstStory) {
      console.error('No active daily stories found for initialization');
      return;
    }

    // Clear any existing schedules (there should only be one)
    await supabase
      .from('daily_story_schedule')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Create new schedule
    const { error: insertError } = await supabase
      .from('daily_story_schedule')
      .insert({
        current_story_id: firstStory.story_id,
        current_order_index: firstStory.order_index,
        last_rotation_date: new Date().toISOString().split('T')[0],
        rotation_interval_days: 2, // Rotate every 2 days
      });

    if (insertError) {
      console.error('Error initializing daily story schedule:', insertError);
    } else {
      console.log('Daily story schedule initialized');
    }

  } catch (error) {
    console.error('Error in initializeDailyStorySchedule:', error);
  }
}

/**
 * Add a story to the daily rotation
 */
export async function addStoryToDailyRotation(storyId: string): Promise<boolean> {
  try {
    // Check if story already exists in rotation
    const { data: existingStory, error: checkError } = await supabase
      .from('daily_stories')
      .select('*')
      .eq('story_id', storyId)
      .single();

    if (existingStory) {
      console.log('Story already in daily rotation');
      return false;
    }

    // Get the next order index
    const { data: maxOrderStory, error: maxError } = await supabase
      .from('daily_stories')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = (maxOrderStory?.order_index || 0) + 1;

    // Add story to rotation
    const { error: insertError } = await supabase
      .from('daily_stories')
      .insert({
        story_id: storyId,
        order_index: nextOrderIndex,
        is_active: true,
      });

    if (insertError) {
      console.error('Error adding story to daily rotation:', insertError);
      return false;
    }

    console.log(`Story added to daily rotation with order_index: ${nextOrderIndex}`);
    return true;

  } catch (error) {
    console.error('Error in addStoryToDailyRotation:', error);
    return false;
  }
}

/**
 * Remove a story from the daily rotation
 */
export async function removeStoryFromDailyRotation(storyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_stories')
      .delete()
      .eq('story_id', storyId);

    if (error) {
      console.error('Error removing story from daily rotation:', error);
      return false;
    }

    console.log('Story removed from daily rotation');
    return true;

  } catch (error) {
    console.error('Error in removeStoryFromDailyRotation:', error);
    return false;
  }
}

/**
 * Get all stories in the daily rotation
 */
export async function getDailyRotationStories(): Promise<Story[]> {
  try {
    const { data: dailyStories, error } = await supabase
      .from('daily_stories')
      .select(`
        *,
        stories (*)
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching daily rotation stories:', error);
      return [];
    }

    return dailyStories?.map(dailyStory => transformDbStoryToStory(dailyStory.stories)) || [];

  } catch (error) {
    console.error('Error in getDailyRotationStories:', error);
    return [];
  }
}

/**
 * Force rotate to the next daily story (for testing/admin purposes)
 */
export async function forceRotateDailyStory(): Promise<void> {
  await rotateToNextDailyStory();
}

/**
 * Transform database story object to app Story type
 */
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