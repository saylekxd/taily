import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Story } from '@/types';
import ProgressBar from './ProgressBar';

type StoryCardProps = {
  story: Story;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
};

export default function StoryCard({ 
  story, 
  size = 'medium',
  onPress 
}: StoryCardProps) {
  const cardDimensions: Record<string, { width: DimensionValue; height: number }> = {
    small: { width: 120, height: 160 },
    medium: { width: '100%', height: 220 },
    large: { width: '100%', height: 220 },
  };
  
  const fontSize = {
    small: 14,
    medium: 16,
    large: 20,
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          width: cardDimensions[size].width,
          height: cardDimensions[size].height,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: story.cover_image }} 
        style={styles.coverImage}
        resizeMode="cover"
      />
      
      {/* Favorite icon */}
      {story.is_favorite && (
        <View style={styles.favoriteIcon}>
          <Heart size={16} color={colors.white} fill={colors.error} />
        </View>
      )}
      
      {/* Reading progress bar */}
      {story.progress !== undefined && story.progress > 0 && story.progress < 1 && (
        <View style={styles.progressBarContainer}>
          <ProgressBar progress={story.progress} />
        </View>
      )}
      
      {/* Overlay gradient */}
      <View style={styles.overlay}>
        <Text 
          style={[
            styles.title, 
            { fontSize: fontSize[size] }
          ]}
          numberOfLines={2}
        >
          {story.title}
        </Text>
        
        {size !== 'small' && story.reading_time && (
          <Text style={styles.readingTime}>{story.reading_time} min</Text>
        )}
        
        {story.categories && story.categories.length > 0 && size === 'large' && (
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{story.categories[0]}</Text>
          </View>
        )}
        
        {/* "New" badge */}
        {story.is_new && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 14,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    color: colors.white,
    marginBottom: 4,
    lineHeight: 22,
  },
  readingTime: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.9,
  },
  categoryContainer: {
    position: 'absolute',
    top: -32,
    left: 14,
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  category: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.white,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 8,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  newBadge: {
    position: 'absolute',
    top: -38,
    right: 14,
    backgroundColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  newText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
});