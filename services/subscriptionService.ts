import { supabase } from '@/lib/supabase';
import { revenueCatService } from './revenueCatService';

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt?: Date;
  status: 'free' | 'premium' | 'trial' | 'expired';
}

export interface UsageLimits {
  aiStories: {
    lifetimeUsed: number;
    lifetimeLimit: number;
    todayUsed: number;
    dailyLimit: number;
    canGenerate: boolean;
    resetTime?: Date;
  };
  audioGeneration: {
    monthlyUsed: number;
    monthlyLimit: number;
    canGenerate: boolean;
    resetDate?: Date;
  };
  storyReading: {
    canReadFull: boolean;
    maxProgressAllowed: number;
  };
}

class SubscriptionService {
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    return {
      isPremium: data?.subscription_tier === 'premium',
      expiresAt: data?.subscription_expires_at ? new Date(data.subscription_expires_at) : undefined,
      status: data?.subscription_tier || 'free'
    };
  }

  async checkAIStoryGenerationLimit(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    usageInfo: {
      lifetimeUsed: number;
      todayUsed: number;
      limit: number;
      resetTime?: Date;
    };
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    // Get or create usage record
    let { data: usage } = await supabase
      .from('user_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('user_usage_limits')
        .insert({ user_id: userId })
        .select()
        .single();
      usage = newUsage;
    }

    // Check if daily reset is needed (for premium users)
    const today = new Date().toISOString().split('T')[0];
    const lastReset = usage.ai_stories_last_reset_date ? 
      new Date(usage.ai_stories_last_reset_date).toISOString().split('T')[0] : null;
    
    if (isPremium && lastReset !== today) {
      // Reset daily counter for premium users
      await supabase
        .from('user_usage_limits')
        .update({
          ai_stories_generated_today: 0,
          ai_stories_last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      usage.ai_stories_generated_today = 0;
    }

    if (isPremium) {
      // Premium: 2 stories per day
      const canGenerate = usage.ai_stories_generated_today < 2;
      const nextReset = new Date();
      nextReset.setDate(nextReset.getDate() + 1);
      nextReset.setHours(0, 0, 0, 0);

      return {
        canGenerate,
        reason: canGenerate ? undefined : 'Daily limit of 2 AI stories reached. Resets at midnight.',
        usageInfo: {
          lifetimeUsed: usage.ai_stories_generated_lifetime,
          todayUsed: usage.ai_stories_generated_today,
          limit: 2,
          resetTime: nextReset
        }
      };
    } else {
      // Free: 2 lifetime stories
      const canGenerate = usage.ai_stories_generated_lifetime < 2;
      
      return {
        canGenerate,
        reason: canGenerate ? undefined : 'You\'ve used your 2 lifetime AI stories. Upgrade to Premium for 2 stories daily!',
        usageInfo: {
          lifetimeUsed: usage.ai_stories_generated_lifetime,
          todayUsed: usage.ai_stories_generated_today,
          limit: 2
        }
      };
    }
  }

  async incrementAIStoryUsage(userId: string): Promise<void> {
    await supabase.rpc('increment_ai_story_usage', { user_id: userId });
  }

  async checkAudioGenerationLimit(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    usageInfo: {
      monthlyUsed: number;
      monthlyLimit: number;
      resetDate?: Date;
    };
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    if (!isPremium) {
      return {
        canGenerate: false,
        reason: 'Audio generation is a Premium feature. Upgrade to generate AI story audio!',
        usageInfo: {
          monthlyUsed: 0,
          monthlyLimit: 0
        }
      };
    }

    // Get usage record
    let { data: usage } = await supabase
      .from('user_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('user_usage_limits')
        .insert({ user_id: userId })
        .select()
        .single();
      usage = newUsage;
    }

    // Check if monthly reset is needed
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastResetMonth = usage.audio_generations_last_reset_date ? 
      new Date(usage.audio_generations_last_reset_date).toISOString().slice(0, 7) : null;
    
    if (currentMonth !== lastResetMonth) {
      await supabase
        .from('user_usage_limits')
        .update({
          audio_generations_this_month: 0,
          audio_generations_last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      usage.audio_generations_this_month = 0;
    }

    const canGenerate = usage.audio_generations_this_month < 2;
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);

    return {
      canGenerate,
      reason: canGenerate ? undefined : 'Monthly limit of 2 audio generations reached. Resets next month.',
      usageInfo: {
        monthlyUsed: usage.audio_generations_this_month,
        monthlyLimit: 2,
        resetDate: nextReset
      }
    };
  }

  async incrementAudioUsage(userId: string): Promise<void> {
    await supabase.rpc('increment_audio_usage', { user_id: userId });
  }

  async checkStoryReadingLimit(userId: string): Promise<{
    canReadFull: boolean;
    maxProgressAllowed: number;
    reason?: string;
  }> {
    const { isPremium } = await this.getUserSubscriptionStatus(userId);
    
    if (isPremium) {
      return {
        canReadFull: true,
        maxProgressAllowed: 1.0,
        reason: undefined
      };
    } else {
      return {
        canReadFull: false,
        maxProgressAllowed: 0.2,
        reason: 'Upgrade to Premium to read complete stories!'
      };
    }
  }

  async getUserUsageLimits(userId: string): Promise<UsageLimits> {
    const [aiStoryCheck, audioCheck, readingCheck] = await Promise.all([
      this.checkAIStoryGenerationLimit(userId),
      this.checkAudioGenerationLimit(userId),
      this.checkStoryReadingLimit(userId)
    ]);

    return {
      aiStories: {
        lifetimeUsed: aiStoryCheck.usageInfo.lifetimeUsed,
        lifetimeLimit: aiStoryCheck.usageInfo.limit,
        todayUsed: aiStoryCheck.usageInfo.todayUsed,
        dailyLimit: aiStoryCheck.usageInfo.limit,
        canGenerate: aiStoryCheck.canGenerate,
        resetTime: aiStoryCheck.usageInfo.resetTime
      },
      audioGeneration: {
        monthlyUsed: audioCheck.usageInfo.monthlyUsed,
        monthlyLimit: audioCheck.usageInfo.monthlyLimit,
        canGenerate: audioCheck.canGenerate,
        resetDate: audioCheck.usageInfo.resetDate
      },
      storyReading: {
        canReadFull: readingCheck.canReadFull,
        maxProgressAllowed: readingCheck.maxProgressAllowed
      }
    };
  }
}

export const subscriptionService = new SubscriptionService(); 