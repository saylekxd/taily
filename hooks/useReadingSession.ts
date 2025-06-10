import { useState, useEffect, useRef } from 'react';
import { createOrUpdateUserStory, getUserCompletedStoryCount } from '@/services/storyService';
import { endReadingSession } from '@/services/readingSessionService';
import { checkAndGrantAchievement } from '@/services/achievementService';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';

interface UseReadingSessionResult {
  readingTime: number;
  endCurrentSession: (completed?: boolean) => Promise<void>;
  progressRef: React.MutableRefObject<number>;
  isFavoriteRef: React.MutableRefObject<boolean>;
  isCompletedRef: React.MutableRefObject<boolean>;
  isMountedRef: React.MutableRefObject<boolean>;
}

export function useReadingSession(
  user: { id: string } | null,
  story: Story | PersonalizedStory | null,
  currentSessionId: string | null,
  progress: number,
  isFavorite: boolean,
  isCompleted: boolean,
  setIsCompleted: (completed: boolean) => void,
  isPersonalized: boolean
): UseReadingSessionResult {
  const [readingTime, setReadingTime] = useState(0);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  // Update progress, favorite, and completion status refs for auto-save
  const progressRef = useRef(progress);
  const isFavoriteRef = useRef(isFavorite);
  const isCompletedRef = useRef(isCompleted);
  
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { isFavoriteRef.current = isFavorite; }, [isFavorite]);
  useEffect(() => { isCompletedRef.current = isCompleted; }, [isCompleted]);

  // Handle reading time tracking and auto-save
  useEffect(() => {
    startTimeRef.current = Date.now();
    lastSaveTimeRef.current = Date.now();
    
    readingTimerRef.current = setInterval(() => {
      if (startTimeRef.current && isMountedRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setReadingTime(elapsedSeconds);
      }
    }, 1000);
    
    // Auto-save every 10 seconds
    autoSaveTimerRef.current = setInterval(async () => {
      if (!user?.id || !story?.id || !isMountedRef.current) return;
      
      const currentTime = Date.now();
      const timeSinceLastSave = Math.floor((currentTime - (lastSaveTimeRef.current || currentTime)) / 1000);
      
      try {
        // Only save for regular stories, not personalized ones
        if (!isPersonalized) {
          await createOrUpdateUserStory({
            user_id: user.id,
            story_id: story.id,
            progress: progressRef.current,
            is_favorite: isFavoriteRef.current,
            reading_time: Math.max(timeSinceLastSave, 10), // At least 10 seconds
            completed: isCompletedRef.current,
          });
        }
        
        lastSaveTimeRef.current = currentTime;
        console.log('Auto-saved progress:', { 
          progress: progressRef.current.toFixed(2), 
          is_favorite: isFavoriteRef.current, 
          reading_time: timeSinceLastSave,
          completed: isCompletedRef.current 
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 10000);
    
    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      
      // End reading session when leaving the screen
      endCurrentSession();
    };
  }, [user?.id, story?.id, isPersonalized]);

  // Check if story is completed when progress changes
  useEffect(() => {
    const completed = progress >= 0.95;
    if (completed && !isCompleted && isMountedRef.current) {
      setIsCompleted(true);
      endCurrentSession(true); // Mark as completed
    }
  }, [progress, isCompleted]);

  const endCurrentSession = async (completed: boolean = false) => {
    if (!currentSessionId || !user?.id || !story?.id) return;
    
    const finalCompleted = completed || isCompletedRef.current;
    const currentReadingTime = readingTime;
    
    // End the reading session
    await endReadingSession(currentSessionId, currentReadingTime, finalCompleted);
    
    // Update user_stories with final data (only for regular stories)
    if (!isPersonalized) {
      await createOrUpdateUserStory({
        user_id: user.id,
        story_id: story.id,
        progress: progressRef.current,
        is_favorite: isFavoriteRef.current,
        reading_time: currentReadingTime,
        completed: finalCompleted,
      });
    }
    
    console.log('Session ended:', { 
      progress: progressRef.current.toFixed(2), 
      reading_time: currentReadingTime, 
      completed: finalCompleted 
    });
    
    // Check for achievements if completed
    if (finalCompleted) {
      await checkAndGrantAchievement(user.id, 'first_story');
      
      const completedCount = await getUserCompletedStoryCount(user.id);
      if (completedCount === 10) {
        await checkAndGrantAchievement(user.id, 'story_lover');
      }
    }
  };

  return {
    readingTime,
    endCurrentSession,
    progressRef,
    isFavoriteRef,
    isCompletedRef,
    isMountedRef,
  };
} 