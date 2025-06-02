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
  Share2 
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from '@/components/ProgressBar';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { getStoryById, updateStoryProgress, getUserCompletedStoryCount } from '@/services/storyService';
import { startReadingSession, endReadingSession } from '@/services/readingSessionService';
import { Story } from '@/types';
import { checkAndGrantAchievement } from '@/services/achievementService';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Load story data and start reading session
  useEffect(() => {
    async function loadStoryAndStartSession() {
      if (!id || !user?.id) return;
      
      setLoading(true);
      const storyData = await getStoryById(id);
      if (storyData) {
        setStory(storyData);
        setProgress(storyData.progress || 0);
        setIsFavorite(storyData.is_favorite || false);
        
        // Start a new reading session
        const sessionId = await startReadingSession(user.id, id);
        setCurrentSessionId(sessionId);
      }
      setLoading(false);
    }
    
    loadStoryAndStartSession();
  }, [id, user?.id]);

  // Handle reading time tracking
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    readingTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setReadingTime(elapsedSeconds);
      }
    }, 1000);
    
    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
      
      // End reading session when leaving the screen
      endCurrentSession();
    };
  }, []);

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
    if (completed && !isCompleted) {
      setIsCompleted(true);
      endCurrentSession(true); // Mark as completed
    }
  }, [progress, isCompleted]);

  const endCurrentSession = async (completed: boolean = false) => {
    if (!currentSessionId || !user?.id || !story?.id) return;
    
    const finalCompleted = completed || isCompleted;
    
    // End the reading session
    await endReadingSession(currentSessionId, readingTime, finalCompleted);
    
    // Update story progress
    await updateStoryProgress({
      user_id: user.id,
      story_id: story.id,
      progress,
      is_favorite: isFavorite,
      reading_time: readingTime,
      completed: finalCompleted,
      sessionId: currentSessionId,
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
    
    // Calculate progress as percentage scrolled
    const currentProgress = Math.min(
      scrollPosition / (contentHeight - scrollViewHeight),
      1
    );
    
    setProgress(currentProgress);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const toggleReadAloud = () => {
    if (!story?.content) return;
    
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
    } else {
      Speech.speak(story.content, {
        onStart: () => setIsPlaying(true),
        onDone: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
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
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleFavorite}>
          <Heart 
            size={24} 
            color={colors.white} 
            fill={isFavorite ? colors.error : 'transparent'} 
          />
        </TouchableOpacity>
        
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  completionText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 24,
    color: colors.white,
  },
});