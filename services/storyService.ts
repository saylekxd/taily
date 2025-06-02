import { supabase } from '@/lib/supabase';
import { Story, UserProfile } from '@/types';
import { startReadingSession, endReadingSession } from './readingSessionService';

/**
 * Get a list of recommended stories based on user profile
 */
export async function getRecommendedStories(profile: UserProfile | null): Promise<Story[]> {
  try {
    // Fetch all stories from database
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stories:', error);
      return [];
    }

    if (!profile || !stories) {
      return stories?.map(transformDbStoryToStory) || [];
    }

    // Filter stories based on user profile
    const filteredStories = stories.filter(story => {
      const ageMatch = story.age_range && 
        profile.age >= story.age_range[0] && 
        profile.age <= story.age_range[1];
      
      const interestMatch = story.categories && profile.interests && 
        story.categories.some((category: string) => 
          profile.interests.includes(category) || 
          category.includes('age_') // Include age-appropriate categories
        );
      
      return ageMatch || interestMatch;
    });

    return filteredStories.map(transformDbStoryToStory);
  } catch (error) {
    console.error('Error in getRecommendedStories:', error);
    return [];
  }
}

/**
 * Get stories that the user has started but not completed
 */
export async function getInProgressStories(userId: string | undefined): Promise<Story[]> {
  if (!userId) {
    return [];
  }

  try {
    const { data: userStories, error } = await supabase
      .from('user_stories')
      .select(`
        *,
        stories (*)
      `)
      .eq('user_id', userId)
      .eq('completed', false)
      .gt('progress', 0)
      .order('last_read_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching in-progress stories:', error);
      return [];
    }

    return userStories?.map(userStory => ({
      ...transformDbStoryToStory(userStory.stories),
      progress: userStory.progress,
      is_favorite: userStory.is_favorite,
      completed: userStory.completed,
    })) || [];
  } catch (error) {
    console.error('Error in getInProgressStories:', error);
    return [];
  }
}

/**
 * Get a specific story by ID
 */
export async function getStoryById(storyId: string): Promise<Story | null> {
  try {
    const { data: story, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (error) {
      console.error('Error fetching story:', error);
      return null;
    }

    return story ? transformDbStoryToStory(story) : null;
  } catch (error) {
    console.error('Error in getStoryById:', error);
    return null;
  }
}

/**
 * Get all stories with pagination
 */
export async function getAllStories(page: number = 0, limit: number = 20): Promise<Story[]> {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching all stories:', error);
      return [];
    }

    return stories?.map(transformDbStoryToStory) || [];
  } catch (error) {
    console.error('Error in getAllStories:', error);
    return [];
  }
}

/**
 * Search stories by query
 */
export async function searchStories(query: string): Promise<Story[]> {
  if (!query.trim()) {
    return getAllStories();
  }

  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching stories:', error);
      return [];
    }

    // Additional filtering by categories if they contain the query
    const filteredStories = stories?.filter(story => 
      story.title.toLowerCase().includes(query.toLowerCase()) ||
      story.content?.toLowerCase().includes(query.toLowerCase()) ||
      (story.categories && story.categories.some((category: string) => 
        category.toLowerCase().includes(query.toLowerCase())
      ))
    ) || [];

    return filteredStories.map(transformDbStoryToStory);
  } catch (error) {
    console.error('Error in searchStories:', error);
    return [];
  }
}

/**
 * Get stories for a specific user (with their reading progress)
 */
export async function getUserStories(userId: string): Promise<Story[]> {
  try {
    const { data: userStories, error } = await supabase
      .from('user_stories')
      .select(`
        *,
        stories (*)
      `)
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    if (error) {
      console.error('Error fetching user stories:', error);
      return [];
    }

    return userStories?.map(userStory => ({
      ...transformDbStoryToStory(userStory.stories),
      progress: userStory.progress,
      is_favorite: userStory.is_favorite,
      completed: userStory.completed,
    })) || [];
  } catch (error) {
    console.error('Error in getUserStories:', error);
    return [];
  }
}

/**
 * Get user's favorite stories
 */
export async function getFavoriteStories(userId: string): Promise<Story[]> {
  try {
    const { data: userStories, error } = await supabase
      .from('user_stories')
      .select(`
        *,
        stories (*)
      `)
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('last_read_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite stories:', error);
      return [];
    }

    return userStories?.map(userStory => ({
      ...transformDbStoryToStory(userStory.stories),
      progress: userStory.progress,
      is_favorite: userStory.is_favorite,
      completed: userStory.completed,
    })) || [];
  } catch (error) {
    console.error('Error in getFavoriteStories:', error);
    return [];
  }
}

/**
 * Get stories by category
 */
export async function getStoriesByCategory(category: string): Promise<Story[]> {
  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .contains('categories', [category])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stories by category:', error);
      return [];
    }

    return stories?.map(transformDbStoryToStory) || [];
  } catch (error) {
    console.error('Error in getStoriesByCategory:', error);
    return [];
  }
}

/**
 * Update a user's story progress
 */
export async function updateStoryProgress(params: {
  user_id: string;
  story_id: string;
  progress: number;
  is_favorite: boolean;
  reading_time: number;
  completed: boolean;
  sessionId?: string; // Optional session ID to track the session
}): Promise<void> {
  try {
    // First, try to update existing user_story record
    const { data: existingUserStory, error: fetchError } = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', params.user_id)
      .eq('story_id', params.story_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is ok
      console.error('Error fetching user story:', fetchError);
      return;
    }

    const updateData = {
      user_id: params.user_id,
      story_id: params.story_id,
      progress: params.progress,
      is_favorite: params.is_favorite,
      completed: params.completed,
      reading_time: params.reading_time,
      last_read_at: new Date().toISOString(),
    };

    if (existingUserStory) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_stories')
        .update({
          progress: params.progress,
          is_favorite: params.is_favorite,
          completed: params.completed,
          reading_time: (existingUserStory.reading_time || 0) + params.reading_time,
          last_read_at: new Date().toISOString(),
        })
        .eq('user_id', params.user_id)
        .eq('story_id', params.story_id);

      if (updateError) {
        console.error('Error updating user story:', updateError);
        return;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_stories')
        .insert(updateData);

      if (insertError) {
        console.error('Error inserting user story:', insertError);
        return;
      }
    }

    // If story is completed, update user's total_stories_read and reading time
    if (params.completed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_stories_read, total_reading_time')
        .eq('id', params.user_id)
        .single();

      if (profile) {
        const wasAlreadyCompleted = existingUserStory?.completed || false;
        const storyCountIncrement = wasAlreadyCompleted ? 0 : 1;

        await supabase
          .from('profiles')
          .update({
            total_stories_read: (profile.total_stories_read || 0) + storyCountIncrement,
            total_reading_time: (profile.total_reading_time || 0) + params.reading_time,
          })
          .eq('id', params.user_id);
      }
    }

  } catch (error) {
    console.error('Error in updateStoryProgress:', error);
  }
}

/**
 * Get user's completed story count
 */
export async function getUserCompletedStoryCount(userId: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('user_stories')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('completed', true);

    if (error) {
      console.error('Error fetching completed story count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUserCompletedStoryCount:', error);
    return 0;
  }
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
    // These will be set by other functions if user-specific data is available
    progress: 0,
    is_favorite: false,
    completed: false,
    is_new: false, // Could be determined by checking created_at vs user's last login
  };
}