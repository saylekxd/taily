import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  Play, 
  Pause, 
  Heart, 
  BookOpen, 
  Share2,
  RotateCcw,
  Sparkles
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from '@/components/ProgressBar';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { getStoryByIdWithUserData, createOrUpdateUserStory, getUserCompletedStoryCount } from '@/services/storyService';
import { getPersonalizedStoryById } from '@/services/personalizedStoryService';
import { startReadingSession, endReadingSession } from '@/services/readingSessionService';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';
import { checkAndGrantAchievement } from '@/services/achievementService';

export default function StoryScreen() {
  const { id, personalized } = useLocalSearchParams<{ id: string; personalized?: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { t } = useI18n();
  const [story, setStory] = useState<Story | PersonalizedStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [shouldScrollToProgress, setShouldScrollToProgress] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  // Load story data and start reading session
  useEffect(() => {
    isMountedRef.current = true;
    
    async function loadStoryAndStartSession() {
      if (!id || !user?.id) return;
      
      if (!isMountedRef.current) return;
      setLoading(true);
      
      try {
        let storyData: Story | PersonalizedStory | null = null;
        
        if (personalized === 'true') {
          // Load personalized story
          storyData = await getPersonalizedStoryById(id, user.id);
        } else {
          // Load regular story with user data
          storyData = await getStoryByIdWithUserData(id, user.id);
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
          if (personalized !== 'true') {
            await createOrUpdateUserStory({
              user_id: user.id,
              story_id: id,
              progress: savedProgress,
              is_favorite: storyData.is_favorite || false,
              completed: storyData.completed || false,
            });
          }
          
          // Start a new reading session (pass isPersonalized flag)
          const sessionId = await startReadingSession(user.id, id, personalized === 'true');
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
  }, [id, user?.id, personalized]);

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
        if (personalized !== 'true') {
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
  }, [user?.id, story?.id, personalized]); // Only depend on user and story IDs

  // Update progress, favorite, and completion status refs for auto-save
  const progressRef = useRef(progress);
  const isFavoriteRef = useRef(isFavorite);
  const isCompletedRef = useRef(isCompleted);
  
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { isFavoriteRef.current = isFavorite; }, [isFavorite]);
  useEffect(() => { isCompletedRef.current = isCompleted; }, [isCompleted]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        Speech.stop();
      }
    };
  }, [isPlaying]);

  // Check if story is completed when progress changes
  useEffect(() => {
    const completed = progress >= 0.95;
    if (completed && !isCompleted && isMountedRef.current) {
      setIsCompleted(true);
      endCurrentSession(true); // Mark as completed
    }
  }, [progress, isCompleted]);

  // Auto-scroll to saved progress when content is ready
  useEffect(() => {
    if (shouldScrollToProgress && contentHeight > 0 && scrollViewHeight > 0 && progress > 0) {
      const scrollPosition = progress * (contentHeight - scrollViewHeight);
      
      console.log('Auto-scroll conditions met:', {
        shouldScrollToProgress,
        contentHeight,
        scrollViewHeight,
        progress: progress.toFixed(2),
        calculatedScrollPosition: scrollPosition.toFixed(0)
      });
      
      setTimeout(() => {
        if (isMountedRef.current) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollPosition),
            animated: true,
          });
          setShouldScrollToProgress(false);
          console.log('✅ Auto-scrolled to saved progress:', { 
            progress: `${(progress * 100).toFixed(1)}%`, 
            scrollPosition: scrollPosition.toFixed(0) 
          });
        }
      }, 1000); // Increased delay to ensure content is fully rendered
    }
  }, [shouldScrollToProgress, contentHeight, scrollViewHeight, progress]);

  const endCurrentSession = async (completed: boolean = false) => {
    if (!currentSessionId || !user?.id || !story?.id) return;
    
    const finalCompleted = completed || isCompletedRef.current;
    const currentReadingTime = readingTime;
    
    // End the reading session
    await endReadingSession(currentSessionId, currentReadingTime, finalCompleted);
    
    // Update user_stories with final data (only for regular stories)
    if (personalized !== 'true') {
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

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    
    // Update dimensions for auto-scroll calculation
    setScrollViewHeight(scrollViewHeight);
    setContentHeight(contentHeight);
    
    // Calculate progress as percentage scrolled
    const currentProgress = Math.min(
      scrollPosition / (contentHeight - scrollViewHeight),
      1
    );
    
    if (isMountedRef.current) {
      setProgress(currentProgress);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    setContentHeight(contentHeight);
    console.log('Content size changed:', { contentWidth, contentHeight });
  };

  const handleScrollViewLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
    console.log('ScrollView layout changed:', { height });
  };

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
      
      // Reset the last save time
      lastSaveTimeRef.current = Date.now();
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
      
      // Reset the last save time to avoid double-counting reading time
      lastSaveTimeRef.current = Date.now();
      console.log('Manual save: favorite toggled to', newFavoriteState);
    }
  };

  const toggleReadAloud = () => {
    if (!story?.content) return;
    
    if (isPlaying) {
      Speech.stop();
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    } else {
      Speech.speak(story.content, {
        onStart: () => isMountedRef.current && setIsPlaying(true),
        onDone: () => isMountedRef.current && setIsPlaying(false),
        onStopped: () => isMountedRef.current && setIsPlaying(false),
        onError: () => isMountedRef.current && setIsPlaying(false),
      });
    }
  };

  const shareStory = () => {
    // Implement share functionality
    console.log('Share story:', story?.title);
  };

  const formatReadingTime = () => {
    const minutes = Math.floor(readingTime / 60);
    const seconds = readingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      <View style={styles.storyHeader}>
        <Image 
          source={{ uri: story.cover_image }} 
          style={styles.coverImage} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.headerGradient}
        />
        
        {/* Personalized badge */}
        {isPersonalizedStory && (
          <View style={styles.personalizedBadge}>
            <Sparkles size={16} color={colors.white} />
            <Text style={styles.personalizedText}>{t('story.personalized')}</Text>
          </View>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{story.title}</Text>
          <Text style={styles.category}>{story.categories?.join(' • ')}</Text>
          <Text style={styles.readingTime}>Reading time: {formatReadingTime()}</Text>
        </View>
      </View>
      
      {/* Story Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentContainer}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
        scrollEventThrottle={16}
      >
        <Text style={styles.storyContent}>{story.content}</Text>
        
        {/* End of story spacer */}
        <View style={styles.endSpacer} />
      </ScrollView>
      
      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleReadAloud}>
          {isPlaying ? (
            <Pause size={24} color={colors.white} />
          ) : (
            <Play size={24} color={colors.white} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={revertReading}>
          <RotateCcw size={24} color={colors.white} />
        </TouchableOpacity>
        
        {/* Only show favorite button for regular stories */}
        {!isPersonalizedStory && (
          <TouchableOpacity style={styles.controlButton} onPress={toggleFavorite}>
            <Heart 
              size={24} 
              color={colors.white} 
              fill={isFavorite ? colors.error : 'transparent'} 
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.controlButton} onPress={shareStory}>
          <Share2 size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
      
      {/* Completion Message */}
      {isCompleted && (
        <View style={styles.completionBanner}>
          <Text style={styles.completionText}>🎉 Story completed!</Text>
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  storyHeader: {
    height: height * 0.3,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  personalizedBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  personalizedText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.white,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    marginBottom: 8,
  },
  category: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  readingTime: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  storyContent: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 18,
    color: colors.white,
    lineHeight: 28,
  },
  endSpacer: {
    height: 100,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionBanner: {
    position: 'absolute',
    top: 100, // Adjust to not overlay navbar
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1, // Lower z-index so navbar stays on top
  },
  completionText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 24,
    color: colors.white,
  },
});