import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Story } from '@/types';
import { PersonalizedStory } from '@/services/personalizedStoryService';

interface StoryHeaderProps {
  story: Story | PersonalizedStory;
  isPersonalized: boolean;
  readingTime: number;
  personalizedText: string;
}

const formatReadingTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function StoryHeader({ 
  story, 
  isPersonalized, 
  readingTime, 
  personalizedText 
}: StoryHeaderProps) {
  return (
    <View style={styles.storyHeader}>
      <Image 
        source={{ uri: story.cover_image }} 
        style={styles.coverImage} 
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.headerGradient}
      />
      
      {/* Personalized badge */}
      {isPersonalized && (
        <View style={styles.personalizedBadge}>
          <Sparkles size={16} color={colors.white} />
          <Text style={styles.personalizedText}>{personalizedText}</Text>
        </View>
      )}
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.category}>{story.categories?.join(' • ')}</Text>
        <Text style={styles.readingTime}>Reading time: {formatReadingTime(readingTime)}</Text>
      </View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  storyHeader: {
    height: height * 0.3,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  personalizedBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  personalizedText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.white,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    marginBottom: 8,
  },
  category: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  readingTime: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
}); 