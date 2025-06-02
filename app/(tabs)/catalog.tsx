import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import StoryCard from '@/components/StoryCard';
import CategoryBadge from '@/components/CategoryBadge';
import { colors } from '@/constants/colors';
import { getAllStories, searchStories } from '@/services/storyService';
import { Story, Category } from '@/types';
import { categories } from '@/constants/categories';

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadStories = async () => {
      setIsLoading(true);
      const allStories = await getAllStories();
      setStories(allStories);
      setFilteredStories(allStories);
      setIsLoading(false);
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
        <Text style={styles.title}>Story Catalog</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stories..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Category Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category: Category) => (
          <CategoryBadge
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onPress={() => selectCategory(category.id)}
          />
        ))}
      </ScrollView>
      
      {/* Stories Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.storiesGrid}
          renderItem={({ item }) => (
            <View style={styles.storyCardContainer}>
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
                No stories found. Try a different search or category.
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
    paddingHorizontal: 16,
  },
  header: {
    marginVertical: 24,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.white,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  categoriesContainer: {
    paddingBottom: 16,
  },
  storiesGrid: {
    paddingBottom: 24,
  },
  storyCardContainer: {
    width: '50%',
    padding: 8,
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
  },
});