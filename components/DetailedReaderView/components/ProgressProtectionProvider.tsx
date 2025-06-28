import React from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/services/subscriptionService';

interface ProgressProtectionProviderProps {
  storyId?: string;
  personalizedStoryId?: string;
  children: (protectedOnProgressChange: (progress: number) => Promise<void>) => React.ReactNode;
  onProgressChange?: (progress: number) => void;
  onPaywallTriggered?: (message: string) => void;
}

export default function ProgressProtectionProvider({
  storyId,
  personalizedStoryId,
  children,
  onProgressChange,
  onPaywallTriggered,
}: ProgressProtectionProviderProps) {
  const { user, isGuestMode } = useUser();
  const isPersonalized = !!personalizedStoryId;

  const handleProtectedProgressUpdate = async (newProgress: number) => {
    // For personalized stories, no limits
    if (isPersonalized) {
      onProgressChange?.(newProgress);
      return;
    }

    // Check if this is the daily story (completely free for everyone)
    try {
      const { data: dailyStoryData } = await supabase
        .from('daily_story_schedule')
        .select('current_story_id')
        .single();
      
      const isDailyStory = dailyStoryData?.current_story_id === storyId;
      
      if (isDailyStory) {
        // Daily story is completely free for everyone (guests and authenticated users)
        onProgressChange?.(newProgress);
        return;
      }
    } catch (error) {
      console.error('Error checking daily story:', error);
      // Continue with the regular limit checks below if we can't determine daily story status
    }

    // For guest users on regular stories (not daily story)
    if (isGuestMode) {
      // Regular stories have 30% limit for guests
      const maxGuestProgress = 0.3;
      if (newProgress > maxGuestProgress) {
        // Use setTimeout to prevent state update during render
        setTimeout(() => {
          onPaywallTriggered?.("Sign up to continue reading the full story!");
        }, 0);
        return;
      }
      onProgressChange?.(newProgress);
      return;
    }

    // For authenticated users on regular stories (not daily story), check subscription limits
    if (user?.id) {
      const userId = user.id;
      const readingCheck = await subscriptionService.checkStoryReadingLimit(userId);
      
      if (!readingCheck.canReadFull && newProgress > readingCheck.maxProgressAllowed) {
        // Use setTimeout to prevent state update during render
        setTimeout(() => {
          onPaywallTriggered?.(readingCheck.reason || 'Upgrade to continue reading the full story!');
        }, 0);
        return; // Don't update progress beyond limit
      }
    }
    
    onProgressChange?.(newProgress);
  };

  return <>{children(handleProtectedProgressUpdate)}</>;
} 