import { useState, useEffect } from 'react';
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
import GuestModeBanner from '@/components/GuestModeBanner';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { getUserStories, getFavoriteStories } from '@/services/storyService';
import { Story } from '@/types';

type TabType = 'all' | 'unread' | 'favorites' | 'audio';

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 8;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (screenWidth - (HORIZONTAL_PADDING * 2) - (CARD_MARGIN * 3)) / 2;

export default function BookshelfScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuestMode } = useUser();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const tabs = [
    { id: 'all' as TabType, label: t('bookshelf.myStories') },
    { id: 'unread' as TabType, label: t('bookshelf.inProgress') },
    { id: 'favorites' as TabType, label: t('bookshelf.favorites') },
    { id: 'audio' as TabType, label: 'Audio' },
  ];

  useEffect(() => {
    loadStories();
  }, [user?.id, activeTab]);

  const loadStories = async () => {
    if (!user?.id || isGuestMode) return;
    
    setIsLoading(true);
    try {
      let storiesData: Story[] = [];
      
      switch (activeTab) {
        case 'favorites':
          storiesData = await getFavoriteStories(user.id);
          break;
        case 'all':
        default:
          storiesData = await getUserStories(user.id);
          break;
      }
      
      setStories(storiesData);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStories = () => {
    return stories; // Already filtered by the API call
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'all':
        return t('bookshelf.bookshelfEmpty');
      case 'unread':
        return t('bookshelf.allStoriesRead');
      case 'favorites':
        return t('bookshelf.noFavorites');
      case 'audio':
        return t('bookshelf.noAudioStories');
      default:
        return t('bookshelf.noStories');
    }
  };

  // Show guest mode message for guest users
  if (isGuestMode) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('bookshelf.myBookshelf')}</Text>
        </View>
        
        <GuestModeBanner />
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('guest.signUpToUnlock')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('bookshelf.myBookshelf')}</Text>
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
          <Text style={styles.loadingText}>{t('bookshelf.loadingBookshelf')}</Text>
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
                {getEmptyMessage()}
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