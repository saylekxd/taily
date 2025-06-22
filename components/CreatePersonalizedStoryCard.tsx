import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Sparkles, Plus } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import FloatingStars from './FloatingStars';

interface CreatePersonalizedStoryCardProps {
  onPress: () => void;
  currentCount: number;
  maxCount: number;
  canGenerate: boolean;
  renewalTime?: string; // Time when limit resets (e.g., "24 hours")
}

export default function CreatePersonalizedStoryCard({
  onPress,
  currentCount,
  maxCount,
  canGenerate,
  renewalTime = "24 hours"
}: CreatePersonalizedStoryCardProps) {
  const { t } = useI18n();
  
  const remainingCount = maxCount - currentCount;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { opacity: canGenerate ? 1 : 0.6 }
      ]}
      onPress={canGenerate ? onPress : undefined}
      activeOpacity={0.8}
      disabled={!canGenerate}
    >
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Image 
            source={require('@/assets/images/badgetaily_photo.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </View>
        
        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {canGenerate ? t('home.createNewStory') : t('home.limitReached')}
          </Text>
          
          <Text style={styles.subtitle}>
            {canGenerate 
              ? t('home.personalizedForYou')
              : t('home.waitForRenewal')
            }
          </Text>
        </View>
        
        {/* Counter badge */}
        <View style={styles.counterContainer}>
          <View style={[
            styles.counterBadge,
            { backgroundColor: canGenerate ? colors.accent : colors.textSecondary }
          ]}>
            <Text style={styles.counterText}>
              {remainingCount}/{maxCount}
            </Text>
          </View>
          
          <Text style={styles.renewalText}>
            {canGenerate 
              ? t('home.storiesLeft')
              : t('home.renewsIn', { time: renewalTime })
            }
          </Text>
        </View>
      </View>
      
      {/* Sparkles decoration */}
      <View style={styles.sparkleDecoration}>
        <Sparkles size={12} color={colors.accent + '40'} />
      </View>
      <View style={[styles.sparkleDecoration, styles.sparkleTwo]}>
        <Sparkles size={8} color={colors.accent + '30'} />
      </View>

      {/* Soft animated floating stars */}
      <FloatingStars isVisible={canGenerate} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
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
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  iconImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  textContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  counterContainer: {
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  counterText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
  },
  renewalText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sparkleDecoration: {
    position: 'absolute',
    top: 16,
    right: 20,
  },
  sparkleTwo: {
    top: 40,
    right: 32,
  },
}); 