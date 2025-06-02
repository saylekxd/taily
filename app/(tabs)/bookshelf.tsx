import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@/hooks/useUser';
import StoryCard from '@/components/StoryCard';
import { colors } from '@/constants/colors';
import { getUserStories } from '@/services/storyService';
import { Story } from '@/types';

type TabType = 'all' | 'unread' | 'favorites' | 'audio';

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 8;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (screenWidth - (HORIZONTAL_PADDING * 2) - (CARD_MARGIN * 3)) / 2;

export default function BookshelfScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadStories = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    const userStories = await getUserStories(user.id);
    setStories(userStories);
    setIsLoading(false);
  }, [user?.id]);
  
  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const filteredStories = useCallback(() => {
    switch (activeTab) {
      case 'unread':
        return stories.filter(story => !story.completed);
      case 'favorites':
        return stories.filter(story => story.is_favorite);
      case 'audio':
        return stories.filter(story => story.has_audio);
      case 'all':
      default:
        return stories;
    }
  }, [activeTab, stories]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'audio', label: 'Audio' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookshelf</Text>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Stories Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your bookshelf...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStories()}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.storiesGrid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={[
              styles.storyCardContainer,
              { 
                width: CARD_WIDTH,
                marginLeft: index % 2 === 0 ? 0 : CARD_MARGIN,
                marginRight: index % 2 === 0 ? CARD_MARGIN : 0,
              }
            ]}>
              <StoryCard 
                story={item} 
                size="medium"
                onPress={() => router.push(`/story/${item.id}`)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'all' 
                  ? "Your bookshelf is empty. Explore the catalog to find stories!"
                  : activeTab === 'unread' 
                    ? "You've read all your stories. Discover new ones in the catalog!"
                    : activeTab === 'favorites' 
                      ? "You haven't favorited any stories yet."
                      : "No audio stories found in your bookshelf."
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  header: {
    marginVertical: 24,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    color: colors.white,
    letterSpacing: -0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: colors.card,
    minWidth: 70,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
  storiesGrid: {
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storyCardContainer: {
    height: 240,
    marginBottom: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 24,
  },
});