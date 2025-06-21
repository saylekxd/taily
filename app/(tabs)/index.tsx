import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Alert,
  Button
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles, Wand2, Plus } from 'lucide-react-native';
import StoryCard from '@/components/StoryCard';
import PersonalizedStoryCard from '@/components/PersonalizedStoryCard';
import PersonalizedStoryGenerator from '@/components/PersonalizedStoryGenerator';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { getRecommendedStories, getInProgressStories } from '@/services/storyService';
import { getDailyStory } from '@/services/dailyStoryService';
import { getUserPersonalizedStories, deletePersonalizedStory, getUserStoryLimitInfo } from '@/services/personalizedStoryService';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';
import * as Sentry from '@sentry/react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useUser();
  const { t } = useI18n();
  const [recommendedStories, setRecommendedStories] = useState<Story[]>([]);
  const [inProgressStories, setInProgressStories] = useState<Story[]>([]);
  const [personalizedStories, setPersonalizedStories] = useState<PersonalizedStory[]>([]);
  const [dailyStory, setDailyStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ currentCount: 0, maxCount: 2, canGenerate: true });

  useEffect(() => {
    loadStories();
  }, [user, profile]);

  const loadStories = async () => {
    if (!user?.id) return;
    
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
      
      // Get personalized stories
      const personalized = await getUserPersonalizedStories(user.id);
      setPersonalizedStories(personalized);
      
      // Get limit info
      const info = await getUserStoryLimitInfo(user.id);
      setLimitInfo(info);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePersonalizedStory = async (storyId: string) => {
    Alert.alert(
      t('story.deleteStory'),
      t('story.deleteStoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            const success = await deletePersonalizedStory(storyId, user?.id || '');
            if (success) {
              setPersonalizedStories(prev => prev.filter(s => s.id !== storyId));
              // Update limit info
              const info = await getUserStoryLimitInfo(user?.id || '');
              setLimitInfo(info);
            } else {
              Alert.alert(t('common.error'), t('story.deleteStoryError'));
            }
          }
        }
      ]
    );
  };

  const handleStoryGenerated = (story: PersonalizedStory) => {
    setPersonalizedStories(prev => [story, ...prev]);
    // Navigate to the new story
    router.push(`/story/${story.id}?personalized=true`);
    // Refresh limit info
    loadStories();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('home.loadingStories')}</Text>
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
        <Text style={styles.greeting}>
          {t('home.welcomeBack', { name: profile?.child_name || t('profile.explorer') })}
        </Text>
      </View>

      <Button title='Try!' onPress={ () => { 
        console.log('Button pressed - sending error to Sentry...');
        Sentry.captureException(new Error('First error'));
        console.log('Error sent to Sentry successfully!');
        alert('Error sent to Sentry! Check your Sentry dashboard.');
      }}/>

      {/* AI Personalized Stories Creation Button */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={[
            styles.aiStoryCreationCard,
            !limitInfo.canGenerate && styles.aiStoryCreationCardDisabled
          ]}
          onPress={() => limitInfo.canGenerate && setShowGenerator(true)}
          disabled={!limitInfo.canGenerate}
        >
          <View style={styles.aiStoryCreationContent}>
            <View style={styles.aiStoryCreationLeft}>
              <View style={styles.aiStoryIconContainer}>
                <Wand2 size={32} color={colors.white} />
              </View>
              <View style={styles.aiStoryTextContainer}>
                <Text style={styles.aiStoryTitle}>
                  {t('generator.createPersonalizedStory')}
                </Text>
                <Text style={styles.aiStorySubtitle}>
                  {profile?.child_name 
                    ? t('generator.storyWillBeAbout', { 
                        name: profile.child_name, 
                        theme: 'adventure' 
                      })
                    : t('generator.selectThemeToSeePreview')
                  }
                </Text>
              </View>
            </View>
            
            <View style={styles.aiStoryCreationRight}>
              <View style={styles.storiesCounterContainer}>
                <Text style={styles.storiesCounterNumber}>
                  {limitInfo.maxCount - limitInfo.currentCount}
                </Text>
                <Text style={styles.storiesCounterLabel}>
                  {t('generator.storiesRemaining', { 
                    remaining: limitInfo.maxCount - limitInfo.currentCount,
                    total: limitInfo.maxCount 
                  })}
                </Text>
              </View>
              
              {limitInfo.canGenerate ? (
                <View style={styles.createButtonContainer}>
                  <Plus size={20} color={colors.white} />
                </View>
              ) : (
                <View style={styles.createButtonDisabled}>
                  <Text style={styles.createButtonDisabledText}>
                    {t('generator.limitReached')}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Progress bar showing usage */}
          <View style={styles.usageProgressContainer}>
            <View style={styles.usageProgressBar}>
              <View 
                style={[
                  styles.usageProgressFill,
                  { width: `${(limitInfo.currentCount / limitInfo.maxCount) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.usageProgressText}>
              {limitInfo.currentCount} / {limitInfo.maxCount} {t('generator.storiesUsed')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Existing Personalized Stories Section */}
      {personalizedStories.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Sparkles size={20} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t('home.yourPersonalizedStories')}</Text>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {personalizedStories.map((story, index) => (
              <View key={story.id} style={[styles.horizontalCard, { marginLeft: index === 0 ? 0 : 12 }]}>
                <PersonalizedStoryCard 
                  story={story} 
                  size="medium"
                  onPress={() => router.push(`/story/${story.id}?personalized=true`)}
                  onDelete={() => handleDeletePersonalizedStory(story.id)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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

      {/* Personalized Story Generator Modal */}
      <PersonalizedStoryGenerator
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        onStoryGenerated={handleStoryGenerated}
      />
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginLeft: 8,
  },
  // AI Story Creation Card Styles
  aiStoryCreationCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiStoryCreationCardDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  aiStoryCreationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiStoryCreationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiStoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiStoryTextContainer: {
    flex: 1,
  },
  aiStoryTitle: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 4,
  },
  aiStorySubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  aiStoryCreationRight: {
    alignItems: 'center',
    marginLeft: 16,
  },
  storiesCounterContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  storiesCounterNumber: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    color: colors.white,
    lineHeight: 36,
  },
  storiesCounterLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    maxWidth: 80,
  },
  createButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButtonDisabledText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  usageProgressContainer: {
    marginTop: 8,
  },
  usageProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  usageProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
  },
  usageProgressText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  // Existing styles
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
});