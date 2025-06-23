import { supabase } from '@/lib/supabase';

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

export interface AIStoryLimitCheck {
  canGenerate: boolean;
  reason?: string;
  usageInfo: {
    lifetimeUsed: number;
    todayUsed: number;
    limit: number;
    resetTime?: Date;
  };
}

export interface AudioLimitCheck {
  canGenerate: boolean;
  reason?: string;
  usageInfo: {
    monthlyUsed: number;
    monthlyLimit: number;
    resetDate?: Date;
  };
}

export interface ReadingLimitCheck {
  canReadFull: boolean;
  maxProgressAllowed: number;
  reason?: string;
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

  async checkAIStoryGenerationLimit(userId: string): Promise<AIStoryLimitCheck> {
    try {
      const { data, error } = await supabase
        .rpc('check_ai_story_limits', { user_id: userId });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No usage data returned');
      }

      const result = data[0];
      const nextReset = new Date();
      
      if (result.is_premium) {
        // Premium: resets daily at midnight
        nextReset.setDate(nextReset.getDate() + 1);
        nextReset.setHours(0, 0, 0, 0);
      }

      return {
        canGenerate: result.can_generate,
        reason: result.reason || undefined,
        usageInfo: {
          lifetimeUsed: result.lifetime_used,
          todayUsed: result.today_used,
          limit: result.is_premium ? 2 : 2, // 2 daily for premium, 2 lifetime for free
          resetTime: result.is_premium ? nextReset : undefined
        }
      };
    } catch (error) {
      console.error('Error checking AI story limits:', error);
      // Fallback to safe defaults
      return {
        canGenerate: false,
        reason: 'Unable to check usage limits. Please try again.',
        usageInfo: {
          lifetimeUsed: 0,
          todayUsed: 0,
          limit: 0
        }
      };
    }
  }

  async incrementAIStoryUsage(userId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_ai_story_usage', { user_id: userId });
    if (error) {
      throw new Error(`Failed to increment AI story usage: ${error.message}`);
    }
  }

  async checkAudioGenerationLimit(userId: string): Promise<AudioLimitCheck> {
    try {
      const { data, error } = await supabase
        .rpc('check_audio_generation_limits', { user_id: userId });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No usage data returned');
      }

      const result = data[0];
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1, 1);
      nextReset.setHours(0, 0, 0, 0);

      return {
        canGenerate: result.can_generate,
        reason: result.reason || undefined,
        usageInfo: {
          monthlyUsed: result.monthly_used,
          monthlyLimit: result.is_premium ? 2 : 0,
          resetDate: result.is_premium ? nextReset : undefined
        }
      };
    } catch (error) {
      console.error('Error checking audio generation limits:', error);
      return {
        canGenerate: false,
        reason: 'Unable to check usage limits. Please try again.',
        usageInfo: {
          monthlyUsed: 0,
          monthlyLimit: 0
        }
      };
    }
  }

  async incrementAudioUsage(userId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_audio_usage', { user_id: userId });
    if (error) {
      throw new Error(`Failed to increment audio usage: ${error.message}`);
    }
  }

  async checkStoryReadingLimit(userId: string): Promise<ReadingLimitCheck> {
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

  /**
   * Initialize usage limits for a new user
   */
  async initializeUserUsage(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_usage_limits')
      .upsert({
        user_id: userId,
        ai_stories_generated_lifetime: 0,
        ai_stories_generated_today: 0,
        ai_stories_last_reset_date: new Date().toISOString().split('T')[0],
        audio_generations_this_month: 0,
        audio_generations_last_reset_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error initializing user usage:', error);
      throw new Error(`Failed to initialize usage tracking: ${error.message}`);
    }
  }

  /**
   * Get subscription analytics for admin/monitoring
   */
  async getSubscriptionAnalytics(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    conversionRate: number;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier');

    if (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    const totalUsers = data.length;
    const premiumUsers = data.filter(u => u.subscription_tier === 'premium').length;
    const freeUsers = totalUsers - premiumUsers;
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      premiumUsers,
      freeUsers,
      conversionRate
    };
  }
}

export const subscriptionService = new SubscriptionService(); 