import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import StreakCounter from '@/components/StreakCounter';
import StoryCard from '@/components/StoryCard';
import { colors } from '@/constants/colors';
import { getGreeting } from '@/utils/helpers';
import { useUser } from '@/hooks/useUser';
import { getRecommendedStories, getInProgressStories } from '@/services/storyService';
import { Story } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [recommendedStories, setRecommendedStories] = useState<Story[]>([]);
  const [inProgressStories, setInProgressStories] = useState<Story[]>([]);
  
  useEffect(() => {
    if (profile) {
      // Fetch personalized stories based on user profile
      const fetchStories = async () => {
        const recommended = await getRecommendedStories(profile);
        const inProgress = await getInProgressStories(user?.id);
        
        setRecommendedStories(recommended);
        setInProgressStories(inProgress);
      };
      
      fetchStories();
    }
  }, [profile, user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading your magical stories...</Text>
      </View>
    );
  }

  const greeting = getGreeting();
  const childName = profile?.child_name || 'Explorer';

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
        <StreakCounter streak={profile?.streak || 0} />
      </View>
      
      {/* Daily Story */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Your Daily Story</Text>
        <View style={styles.dailyStoryContainer}>
          {recommendedStories.length > 0 && (
            <StoryCard 
              story={recommendedStories[0]} 
              size="large"
              onPress={() => router.push(`/story/${recommendedStories[0].id}`)}
            />
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
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
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
          {recommendedStories.map(story => (
            <StoryCard 
              key={story.id} 
              story={story} 
              size="medium"
              onPress={() => router.push(`/story/${story.id}`)}
            />
          ))}
        </ScrollView>
      </View>
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