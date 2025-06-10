import { useState, useEffect, useRef } from 'react';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';
import { getStoryByIdWithUserData, createOrUpdateUserStory } from '@/services/storyService';
import { getPersonalizedStoryById } from '@/services/personalizedStoryService';
import { startReadingSession } from '@/services/readingSessionService';

interface UseStoryDataResult {
  story: Story | PersonalizedStory | null;
  loading: boolean;
  progress: number;
  setProgress: (progress: number) => void;
  isFavorite: boolean;
  setIsFavorite: (favorite: boolean) => void;
  isCompleted: boolean;
  setIsCompleted: (completed: boolean) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  shouldScrollToProgress: boolean;
  setShouldScrollToProgress: (should: boolean) => void;
}

export function useStoryData(
  storyId: string | undefined,
  userId: string | undefined,
  isPersonalized: boolean
): UseStoryDataResult {
  const [story, setStory] = useState<Story | PersonalizedStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [shouldScrollToProgress, setShouldScrollToProgress] = useState(false);
  const isMountedRef = useRef(true);

  // Load story data and start reading session
  useEffect(() => {
    isMountedRef.current = true;
    
    async function loadStoryAndStartSession() {
      if (!storyId || !userId) return;
      
      if (!isMountedRef.current) return;
      setLoading(true);
      
      try {
        let storyData: Story | PersonalizedStory | null = null;
        
        if (isPersonalized) {
          // Load personalized story
          storyData = await getPersonalizedStoryById(storyId, userId);
        } else {
          // Load regular story with user data
          storyData = await getStoryByIdWithUserData(storyId, userId);
        }
        
        if (storyData && isMountedRef.current) {
          setStory(storyData);
          const savedProgress = storyData.progress || 0;
          setProgress(savedProgress);
          setIsFavorite(storyData.is_favorite || false);
          setIsCompleted(storyData.completed || false);
          
          // If there's saved progress > 5%, we should scroll to it
          if (savedProgress > 0.05) {
            setShouldScrollToProgress(true);
          }
          
          // For regular stories, create or update user_story record
          if (!isPersonalized) {
            await createOrUpdateUserStory({
              user_id: userId,
              story_id: storyId,
              progress: savedProgress,
              is_favorite: storyData.is_favorite || false,
              completed: storyData.completed || false,
            });
          }
          
          // Start a new reading session (pass isPersonalized flag)
          const sessionId = await startReadingSession(userId, storyId, isPersonalized);
          if (isMountedRef.current) {
            setCurrentSessionId(sessionId);
          }
        }
      } catch (error) {
        console.error('Error loading story:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
    
    loadStoryAndStartSession();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [storyId, userId, isPersonalized]);

  return {
    story,
    loading,
    progress,
    setProgress,
    isFavorite,
    setIsFavorite,
    isCompleted,
    setIsCompleted,
    currentSessionId,
    setCurrentSessionId,
    shouldScrollToProgress,
    setShouldScrollToProgress,
  };
} 