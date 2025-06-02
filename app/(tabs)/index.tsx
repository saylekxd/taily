import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StoryCard from '@/components/StoryCard';
import StreakCounter from '@/components/StreakCounter';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { getRecommendedStories, getInProgressStories } from '@/services/storyService';
import { getDailyStory } from '@/services/dailyStoryService';
import { getUserStreakData } from '@/services/streakService';
import { Story } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useUser();
  const [recommendedStories, setRecommendedStories] = useState<Story[]>([]);
  const [inProgressStories, setInProgressStories] = useState<Story[]>([]);
  const [dailyStory, setDailyStory] = useState<Story | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const childName = profile?.child_name || 'Little Explorer';
  
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    async function loadStories() {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const [recommendedData, inProgressData, dailyStoryData, streakData] = await Promise.all([
          getRecommendedStories(profile),
          getInProgressStories(user.id),
          getDailyStory(),
          getUserStreakData(user.id)
        ]);
        
        setRecommendedStories(recommendedData);
        setInProgressStories(inProgressData);
        setDailyStory(dailyStoryData);
        setCurrentStreak(streakData.currentStreak);
      } catch (error) {
        console.error('Error loading stories:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [profile, user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading your stories...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{childName}!</Text>
        </View>
        <StreakCounter streak={currentStreak} />
      </View>
      
      {/* Daily Story */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Your Daily Story</Text>
        <View style={styles.dailyStoryContainer}>
          {dailyStory ? (
            <StoryCard 
              story={dailyStory} 
              size="large"
              onPress={() => router.push(`/story/${dailyStory.id}`)}
            />
          ) : (
            <View style={styles.noDailyStoryContainer}>
              <Text style={styles.noDailyStoryText}>No daily story available today</Text>
              <Text style={styles.noDailyStorySubtext}>Check back tomorrow for a new story!</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Continue Reading */}
      {inProgressStories.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Continue Reading</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/bookshelf')}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {inProgressStories.map(story => (
              <StoryCard 
                key={story.id} 
                story={story} 
                size="medium"
                onPress={() => router.push(`/story/${story.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Recommended Stories */}
      {recommendedStories.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/catalog')}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {recommendedStories.slice(0, 5).map(story => (
              <StoryCard 
                key={story.id} 
                story={story} 
                size="medium"
                onPress={() => router.push(`/story/${story.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 24,
  },
  greeting: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.textSecondary,
  },
  name: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    marginTop: 4,
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 16,
  },
  dailyStoryContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  noDailyStoryContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  noDailyStoryText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noDailyStorySubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  horizontalList: {
    paddingRight: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.primary,
    marginRight: 4,
  },
});