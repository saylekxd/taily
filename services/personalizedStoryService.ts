import { supabase } from '@/lib/supabase';
import { generatePersonalizedStory, generateCoverImageUrl, StoryGenerationParams } from './aiStoryService';
import { subscriptionService } from './subscriptionService';
import { Story, UserProfile } from '@/types';

export interface PersonalizedStory extends Story {
  prompt_used?: string;
  model_used?: string;
}

/**
 * Generate and save a new personalized story
 */
export async function createPersonalizedStory(
  userId: string, 
  profile: UserProfile, 
  theme?: string
): Promise<PersonalizedStory> {
  try {
    // Check if user can generate more stories
    const limitCheck = await subscriptionService.checkAIStoryGenerationLimit(userId);
    if (!limitCheck.canGenerate) {
      throw new Error(limitCheck.reason || 'Cannot generate story');
    }

    // Prepare generation parameters
    const params: StoryGenerationParams = {
      childName: profile.child_name,
      age: profile.age,
      interests: profile.interests,
      readingLevel: profile.reading_level,
      theme,
      language: profile.language
    };

    // Generate the story using AI
    const generatedStory = await generatePersonalizedStory(params);
    
    // Generate cover image URL
    const coverImageUrl = generateCoverImageUrl(generatedStory.coverImagePrompt, profile.child_name);
    
    // Save to database
    const { data, error } = await supabase
      .from('personalized_stories')
      .insert({
        user_id: userId,
        title: generatedStory.title,
        content: generatedStory.content,
        cover_image: coverImageUrl,
        categories: generatedStory.categories,
        reading_time: generatedStory.readingTime,
        prompt_used: JSON.stringify(params),
        model_used: 'gemini-2.0-flash-exp'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving personalized story:', error);
      throw new Error('Failed to save your personalized story. Please try again.');
    }

    // Increment AI story usage after successful save
    await subscriptionService.incrementAIStoryUsage(userId);

    return transformDbPersonalizedStoryToStory(data);
  } catch (error) {
    console.error('Error creating personalized story:', error);
    throw error;
  }
}

/**
 * Get all personalized stories for a user
 */
export async function getUserPersonalizedStories(userId: string): Promise<PersonalizedStory[]> {
  try {
    const { data, error } = await supabase
      .from('personalized_stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching personalized stories:', error);
      return [];
    }

    return data?.map(transformDbPersonalizedStoryToStory) || [];
  } catch (error) {
    console.error('Error in getUserPersonalizedStories:', error);
    return [];
  }
}

/**
 * Get a specific personalized story by ID
 */
export async function getPersonalizedStoryById(storyId: string, userId: string): Promise<PersonalizedStory | null> {
  try {
    const { data, error } = await supabase
      .from('personalized_stories')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching personalized story:', error);
      return null;
    }

    return data ? transformDbPersonalizedStoryToStory(data) : null;
  } catch (error) {
    console.error('Error in getPersonalizedStoryById:', error);
    return null;
  }
}

/**
 * Delete a personalized story
 */
export async function deletePersonalizedStory(storyId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('personalized_stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting personalized story:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePersonalizedStory:', error);
    return false;
  }
}

/**
 * Get user's personalized story count and limit info
 */
export async function getUserStoryLimitInfo(userId: string): Promise<{ currentCount: number; maxCount: number; canGenerate: boolean }> {
  try {
    const limitCheck = await subscriptionService.checkAIStoryGenerationLimit(userId);
    
    return {
      currentCount: limitCheck.usageInfo.lifetimeUsed,
      maxCount: limitCheck.usageInfo.limit,
      canGenerate: limitCheck.canGenerate
    };
  } catch (error) {
    console.error('Error in getUserStoryLimitInfo:', error);
    return { currentCount: 0, maxCount: 2, canGenerate: true };
  }
}

/**
 * Transform database personalized story to app Story type
 */
function transformDbPersonalizedStoryToStory(dbStory: any): PersonalizedStory {
  return {
    id: dbStory.id,
    title: dbStory.title,
    content: dbStory.content,
    cover_image: dbStory.cover_image,
    categories: dbStory.categories || [],
    reading_time: dbStory.reading_time,
    has_audio: false, // Personalized stories don't have audio yet
    progress: 0,
    is_favorite: false,
    completed: false,
    is_new: true, // Personalized stories are always "new"
    prompt_used: dbStory.prompt_used,
    model_used: dbStory.model_used,
  };
}