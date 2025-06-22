import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Sparkles, Trash2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { PersonalizedStory } from '@/services/personalizedStoryService';
import { useI18n } from '@/hooks/useI18n';

type PersonalizedStoryCardProps = {
  story: PersonalizedStory;
  onPress?: () => void;
  onDelete?: () => void;
  size?: 'small' | 'medium' | 'large';
};

export default function PersonalizedStoryCard({ 
  story, 
  onPress,
  onDelete,
  size = 'medium'
}: PersonalizedStoryCardProps) {
  const { t } = useI18n();
  
  const cardDimensions = {
    small: { width: 120, height: 160 },
    medium: { width: undefined as any, height: 220 },
    large: { width: undefined as any, height: 220 },
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
      
      {/* Personalized badge */}
      <View style={styles.personalizedBadge}>
        <Sparkles size={12} color={colors.white} />
        <Text style={styles.personalizedText}>{t('story.personalized')}</Text>
      </View>
      
      {/* Delete button */}
      {onDelete && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={16} color={colors.white} />
        </TouchableOpacity>
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
  personalizedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  personalizedText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: colors.white,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 71, 111, 0.8)',
    borderRadius: 14,
    padding: 8,
  },
});