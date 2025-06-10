import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import StoryCard from '@/components/StoryCard';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { getRecommendedStories, getInProgressStories } from '@/services/storyService';
import { getDailyStory } from '@/services/dailyStoryService';
import { Story } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, loading: authLoading, sessionError, retrySession } = useUser();
  const { t } = useI18n();
  const [recommendedStories, setRecommendedStories] = useState<Story[]>([]);
  const [inProgressStories, setInProgressStories] = useState<Story[]>([]);
  const [dailyStory, setDailyStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadStories();
    } else if (!authLoading && !user && !sessionError) {
      // No user and no error means user is logged out
      setIsLoading(false);
    }
  }, [user, profile, authLoading]);

  const loadStories = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get recommended stories
      const recommended = await getRecommendedStories(profile);
      setRecommendedStories(recommended);
      
      // Get user's stories with progress
      const inProgress = await getInProgressStories(user.id);
      setInProgressStories(inProgress);
      
      // Get daily story from the daily story service
      const daily = await getDailyStory();
      setDailyStory(daily);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session error state
  if (sessionError) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Text style={styles.errorSubtext}>Unable to connect. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retrySession}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading only when actually loading
  if (authLoading || (isLoading && user)) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('home.loadingStories')}</Text>
      </View>
    );
  }

  // If no user after loading, redirect to sign in
  if (!authLoading && !user) {
    router.replace('/auth/sign-in');
    return null;
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('home.welcomeBack', { name: profile?.child_name || t('profile.explorer') })}
        </Text>
      </View>

      {/* Daily Story */}
      {dailyStory && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('home.yourDailyStory')}</Text>
          <StoryCard 
            story={dailyStory} 
            size="large" 
            onPress={() => router.push(`/story/${dailyStory.id}`)}
          />
        </View>
      )}

      {!dailyStory && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('home.yourDailyStory')}</Text>
          <View style={styles.noDailyStoryContainer}>
            <Text style={styles.noDailyStoryText}>{t('home.noDailyStory')}</Text>
            <Text style={styles.noDailyStorySubtext}>{t('home.noDailyStorySubtext')}</Text>
          </View>
        </View>
      )}

      {/* Continue Reading */}
      {inProgressStories.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.continueReading')}</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/bookshelf')}
            >
              <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {inProgressStories.map((story, index) => (
              <View key={story.id} style={[styles.horizontalCard, { marginLeft: index === 0 ? 0 : 12 }]}>
                <StoryCard 
                  story={story} 
                  size="medium"
                  onPress={() => router.push(`/story/${story.id}`)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Recommended Stories */}
      {recommendedStories.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recommendedForYou')}</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/catalog')}
            >
              <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {recommendedStories.slice(0, 5).map((story, index) => (
              <View key={story.id} style={[styles.horizontalCard, { marginLeft: index === 0 ? 0 : 12 }]}>
                <StoryCard 
                  story={story} 
                  size="medium"
                  onPress={() => router.push(`/story/${story.id}`)}
                />
              </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 24,
  },
  greeting: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    lineHeight: 34,
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionContainer: {
    marginBottom: 32,
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
  },
  noDailyStoryContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  noDailyStoryText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  noDailyStorySubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  horizontalList: {
    paddingHorizontal: 4,
  },
  horizontalCard: {
    width: 180,
    height: 240,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.primary,
    marginRight: 4,
  },
  errorText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 8,
  },
  errorSubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
  },
});