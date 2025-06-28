import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import StoryCard from '@/components/StoryCard';
import CategoryBadge from '@/components/CategoryBadge';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { getAllStories, searchStories } from '@/services/storyService';
import { Story, Category } from '@/types';
import { getTranslatedCategories } from '@/constants/categories';

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 8;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (screenWidth - (HORIZONTAL_PADDING * 2) - (CARD_MARGIN * 3)) / 2;

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [stories, setStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get translated categories
  const translatedCategories = getTranslatedCategories(t);

  useEffect(() => {
    const loadStories = async () => {
      setIsLoading(true);
      try {
        const allStories = await getAllStories();
        setStories(allStories);
        setFilteredStories(allStories);
      } catch (error) {
        console.error('Error loading catalog stories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStories();
  }, []);

  useEffect(() => {
    filterStories();
  }, [searchQuery, selectedCategory, stories]);

  const filterStories = async () => {
    let result = [...stories];
    
    // Apply search query
    if (searchQuery.trim()) {
      result = await searchStories(searchQuery);
    }
    
    // Apply category filter
    if (selectedCategory) {
      result = result.filter(story => 
        story.categories && story.categories.includes(selectedCategory)
      );
    }
    
    setFilteredStories(result);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('catalog.title')}</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('catalog.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Category Filters */}
      <View style={styles.categoriesWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {translatedCategories.map((category: Category) => (
            <CategoryBadge
              key={category.id}
              category={category}
              isSelected={selectedCategory === category.id}
              onPress={() => selectCategory(category.id)}
            />
          ))}
        </ScrollView>
      </View>
      
      {/* Stories Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
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
                {t('catalog.noStories')}
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
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 52,
    color: colors.white,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    marginLeft: 8,
  },
  categoriesWrapper: {
    height: 52,
    marginBottom: 24,
  },
  categoriesContainer: {
    paddingHorizontal: 4,
    height: 52,
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
    lineHeight: 24,
  },
});