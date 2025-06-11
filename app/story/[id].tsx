import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ProgressBar from '@/components/ProgressBar';
import StoryHeader from '@/components/StoryHeader';
import StoryContent from '@/components/StoryContent';
import StoryControls from '@/components/StoryControls';
import CompletionBanner from '@/components/CompletionBanner';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { useStoryData } from '@/hooks/useStoryData';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScrollTracking } from '@/hooks/useScrollTracking';

import { createOrUpdateUserStory } from '@/services/storyService';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';

export default function StoryScreen() {
  const { id, personalized } = useLocalSearchParams<{ id: string; personalized?: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { t } = useI18n();
  
  // Use the extracted story data hook
  const {
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
  } = useStoryData(id, user?.id, personalized === 'true');
  
  // Use the extracted reading session hook
  const {
    readingTime,
    endCurrentSession,
    progressRef,
    isFavoriteRef,
    isCompletedRef,
    isMountedRef,
  } = useReadingSession(
    user,
    story,
    currentSessionId,
    progress,
    isFavorite,
    isCompleted,
    setIsCompleted,
    personalized === 'true'
  );
  
  // Use the extracted scroll tracking hook
  const {
    contentHeight,
    scrollViewHeight,
    scrollViewRef,
    handleScroll,
    handleContentSizeChange,
    handleScrollViewLayout,
  } = useScrollTracking(
    progress,
    setProgress,
    shouldScrollToProgress,
    setShouldScrollToProgress,
    isMountedRef
  );
  
  // Note: Speech synthesis is now handled within StoryControls component
  
  const revertReading = async () => {
    // Reset progress to beginning
    if (isMountedRef.current) {
      setProgress(0);
      setIsCompleted(false);
    }
    
    // Scroll to top
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
    
    // Update user_stories with reset progress (only for regular stories)
    if (user?.id && story?.id && personalized !== 'true') {
      await createOrUpdateUserStory({
        user_id: user.id,
        story_id: story.id,
        progress: 0,
        is_favorite: isFavorite,
        completed: false,
      });
      
      console.log('Reading progress reverted to beginning');
    }
  };

  const toggleFavorite = async () => {
    const newFavoriteState = !isFavorite;
    if (isMountedRef.current) {
      setIsFavorite(newFavoriteState);
    }
    
    // Immediately update user_stories table (only for regular stories)
    if (user?.id && story?.id && personalized !== 'true') {
      await createOrUpdateUserStory({
        user_id: user.id,
        story_id: story.id,
        is_favorite: newFavoriteState,
      });
      
      console.log('Manual save: favorite toggled to', newFavoriteState);
    }
  };

  const shareStory = () => {
    // Implement share functionality
    console.log('Share story:', story?.title);
  };

  const handleProgressUpdate = (newProgress: number) => {
    if (isMountedRef.current) {
      setProgress(newProgress);
    }
  };

  if (loading || !story) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading story...</Text>
      </View>
    );
  }

  const isPersonalizedStory = personalized === 'true';

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <ProgressBar progress={progress} />
      
      {/* Story Header */}
      <StoryHeader 
        story={story}
        isPersonalized={isPersonalizedStory}
        readingTime={readingTime}
        personalizedText={t('story.personalized')}
      />
      
      {/* Story Content */}
      <StoryContent
        content={story.content || ''}
        scrollViewRef={scrollViewRef}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      />
      
      {/* Bottom Controls */}
      <StoryControls
        storyId={isPersonalizedStory ? undefined : story.id}
        personalizedStoryId={isPersonalizedStory ? story.id : undefined}
        isPersonalized={isPersonalizedStory}
        isFavorite={isFavorite}
        onRevertReading={revertReading}
        onToggleFavorite={toggleFavorite}
        onShare={shareStory}
        storyContent={story.content}
        storyTitle={story.title}
        onProgressUpdate={handleProgressUpdate}
      />
      
      {/* Completion Message */}
      <CompletionBanner
        isCompleted={isCompleted}
        completionText="🎉 Story completed!"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
});