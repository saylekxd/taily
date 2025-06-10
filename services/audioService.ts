import { supabase } from '@/lib/supabase';

export interface AudioUsage {
  usage_count: number;
  limit: number;
  month: number;
  year: number;
}

export interface AudioGenerationResult {
  success: boolean;
  audio_url?: string;
  duration?: number;
  usage_count?: number;
  limit?: number;
  error?: string;
}

export interface AudioGenerationJob {
  id: string;
  personalized_story_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

class AudioService {
  private MONTHLY_LIMIT = 5;

  /**
   * Generate audio for a personalized story using ElevenLabs via Edge Function
   */
  async generatePersonalizedStoryAudio(
    storyText: string,
    personalizedStoryId: string,
    voicePreference: 'alloy' | 'echo' | 'nova' = 'alloy'
  ): Promise<AudioGenerationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('generate-story-audio', {
        body: {
          story_text: storyText,
          personalized_story_id: personalizedStoryId,
          voice_preference: voicePreference,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate audio');
      }

      return response.data as AudioGenerationResult;
    } catch (error) {
      console.error('Error generating audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current month's audio generation usage for the user
   */
  async getCurrentUsage(): Promise<AudioUsage> {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const { data, error } = await supabase
        .from('audio_generation_usage')
        .select('usage_count')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return {
        usage_count: data?.usage_count || 0,
        limit: this.MONTHLY_LIMIT,
        month: currentMonth,
        year: currentYear,
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return {
        usage_count: 0,
        limit: this.MONTHLY_LIMIT,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      };
    }
  }

  /**
   * Check if user can generate more audio this month
   */
  async canGenerateAudio(): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    return usage.usage_count < usage.limit;
  }

  /**
   * Get audio generation jobs for the user
   */
  async getAudioGenerationJobs(limit: number = 10): Promise<AudioGenerationJob[]> {
    try {
      const { data, error } = await supabase
        .from('audio_generation_jobs')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting audio generation jobs:', error);
      return [];
    }
  }

  /**
   * Get audio URL for a regular story based on language preference
   */
  async getStoryAudioUrl(storyId: string, language: 'en' | 'pl' = 'en'): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`audio_url_${language}`)
        .eq('id', storyId)
        .single();

      if (error) throw error;
      return language === 'en' 
        ? (data as any)?.audio_url_en 
        : (data as any)?.audio_url_pl || null;
    } catch (error) {
      console.error('Error getting story audio URL:', error);
      return null;
    }
  }

  /**
   * Get audio duration for a regular story based on language
   */
  async getStoryAudioDuration(storyId: string, language: 'en' | 'pl' = 'en'): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`audio_duration_${language}`)
        .eq('id', storyId)
        .single();

      if (error) throw error;
      return language === 'en' 
        ? (data as any)?.audio_duration_en 
        : (data as any)?.audio_duration_pl || null;
    } catch (error) {
      console.error('Error getting story audio duration:', error);
      return null;
    }
  }

  /**
   * Update manual audio URLs for a story (ADMIN FUNCTION)
   * Use this to add manual audio files directly
   */
  async updateStoryAudio(
    storyId: string, 
    audioUrlEn?: string | null, 
    audioUrlPl?: string | null,
    audioDurationEn?: number | null,
    audioDurationPl?: number | null
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (audioUrlEn !== undefined) updateData.audio_url_en = audioUrlEn;
      if (audioUrlPl !== undefined) updateData.audio_url_pl = audioUrlPl;
      if (audioDurationEn !== undefined) updateData.audio_duration_en = audioDurationEn;
      if (audioDurationPl !== undefined) updateData.audio_duration_pl = audioDurationPl;

      const { error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', storyId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating story audio:', error);
      return false;
    }
  }

  /**
   * Bulk update audio URLs for multiple stories
   * Useful for setting up audio files for existing stories
   */
  async bulkUpdateStoryAudio(audioUpdates: Array<{
    storyId: string;
    audioUrlEn?: string;
    audioUrlPl?: string;
    audioDurationEn?: number;
    audioDurationPl?: number;
  }>): Promise<boolean> {
    try {
      for (const update of audioUpdates) {
        await this.updateStoryAudio(
          update.storyId,
          update.audioUrlEn,
          update.audioUrlPl,
          update.audioDurationEn,
          update.audioDurationPl
        );
      }
      return true;
    } catch (error) {
      console.error('Error bulk updating story audio:', error);
      return false;
    }
  }

  /**
   * Get audio URL for a personalized story
   */
  async getPersonalizedStoryAudioUrl(personalizedStoryId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('personalized_stories')
        .select('audio_url')
        .eq('id', personalizedStoryId)
        .single();

      if (error) throw error;
      return data?.audio_url || null;
    } catch (error) {
      console.error('Error getting personalized story audio URL:', error);
      return null;
    }
  }

  /**
   * Get audio duration for a personalized story
   */
  async getPersonalizedStoryAudioDuration(personalizedStoryId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('personalized_stories')
        .select('audio_duration')
        .eq('id', personalizedStoryId)
        .single();

      if (error) throw error;
      return data?.audio_duration || null;
    } catch (error) {
      console.error('Error getting personalized story audio duration:', error);
      return null;
    }
  }

  /**
   * Update user's language preference
   */
  async updateLanguagePreference(language: 'en' | 'pl'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating language preference:', error);
      return false;
    }
  }

  /**
   * Get user's language preference
   */
  async getUserLanguagePreference(): Promise<'en' | 'pl'> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (error) throw error;
      return data?.preferred_language || 'en';
    } catch (error) {
      console.error('Error getting language preference:', error);
      return 'en';
    }
  }

  /**
   * Check if story has audio available in specified language
   */
  async hasStoryAudio(storyId: string, language: 'en' | 'pl' = 'en'): Promise<boolean> {
    const audioUrl = await this.getStoryAudioUrl(storyId, language);
    return audioUrl !== null;
  }

  /**
   * Check if personalized story has audio available
   */
  async hasPersonalizedStoryAudio(personalizedStoryId: string): Promise<boolean> {
    const audioUrl = await this.getPersonalizedStoryAudioUrl(personalizedStoryId);
    return audioUrl !== null;
  }

  /**
   * Helper function to get all stories that need audio files
   * Useful for identifying which stories need manual audio
   */
  async getStoriesWithoutAudio(language?: 'en' | 'pl'): Promise<Array<{id: string, title: string, hasAudioEn: boolean, hasAudioPl: boolean}>> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, audio_url_en, audio_url_pl')
        .order('title');

      if (error) throw error;

      return (data || []).map(story => ({
        id: story.id,
        title: story.title,
        hasAudioEn: !!story.audio_url_en,
        hasAudioPl: !!story.audio_url_pl,
      })).filter(story => {
        if (language === 'en') return !story.hasAudioEn;
        if (language === 'pl') return !story.hasAudioPl;
        return !story.hasAudioEn || !story.hasAudioPl;
      });
    } catch (error) {
      console.error('Error getting stories without audio:', error);
      return [];
    }
  }
}

export const audioService = new AudioService(); 