import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2,
  RotateCcw,
  Volume2,
  Languages,
  Mic
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { audioService, AudioUsage } from '@/services/audioService';

interface StoryControlsProps {
  storyId?: string;
  personalizedStoryId?: string;
  isPersonalized: boolean;
  isFavorite: boolean;
  onRevertReading: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  storyContent?: string; // For AI audio generation
}

export default function StoryControls({
  storyId,
  personalizedStoryId,
  isPersonalized,
  isFavorite,
  onRevertReading,
  onToggleFavorite,
  onShare,
  storyContent,
}: StoryControlsProps) {
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [usage, setUsage] = useState<AudioUsage | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const audioPlayer = useAudioPlayer({
    storyId,
    personalizedStoryId,
    language,
  });

  // Load user language preference and usage on mount
  useEffect(() => {
    loadUserPreferences();
    checkAudioAvailability();
    if (isPersonalized) {
      loadUsage();
    }
  }, [storyId, personalizedStoryId, language]);

  const loadUserPreferences = async () => {
    try {
      const userLanguage = await audioService.getUserLanguagePreference();
      setLanguage(userLanguage);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const currentUsage = await audioService.getCurrentUsage();
      setUsage(currentUsage);
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const checkAudioAvailability = async () => {
    const available = await audioPlayer.isAudioAvailable();
    setHasAudio(available);
  };

  const handleLanguageToggle = async () => {
    const newLanguage = language === 'en' ? 'pl' : 'en';
    setLanguage(newLanguage);
    
    // Update user preference
    await audioService.updateLanguagePreference(newLanguage);
    
    // Check if audio is available in new language
    await checkAudioAvailability();
  };

  const handleGenerateAudio = async () => {
    if (!isPersonalized || !personalizedStoryId || !storyContent) return;

    // Check if user can generate audio
    const canGenerate = await audioService.canGenerateAudio();
    if (!canGenerate) {
      Alert.alert(
        'Monthly Limit Reached',
        `You've reached your monthly limit of ${usage?.limit || 5} audio generations. Your limit will reset next month.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingAudio(true);

    try {
      const result = await audioService.generatePersonalizedStoryAudio(
        storyContent,
        personalizedStoryId,
        'alloy' // Default voice for children
      );

      if (result.success) {
        Alert.alert(
          'Audio Generated!',
          'Your story audio has been generated successfully.',
          [{ text: 'OK' }]
        );
        
        // Reload audio player and usage
        await audioPlayer.loadAudio();
        await loadUsage();
        await checkAudioAvailability();
      } else {
        Alert.alert(
          'Generation Failed',
          result.error || 'Failed to generate audio. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while generating audio.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const renderAudioButton = () => {
    if (isPersonalized) {
      // For personalized stories
      if (!hasAudio) {
        return (
          <TouchableOpacity 
            style={[styles.controlButton, isGeneratingAudio && styles.disabledButton]} 
            onPress={handleGenerateAudio}
            disabled={isGeneratingAudio}
          >
            {isGeneratingAudio ? (
              <ActivityIndicator size={24} color={colors.white} />
            ) : (
              <Mic size={24} color={colors.white} />
            )}
          </TouchableOpacity>
        );
      } else {
        return (
          <TouchableOpacity 
            style={[styles.controlButton, audioPlayer.isLoading && styles.disabledButton]} 
            onPress={audioPlayer.togglePlayPause}
            disabled={audioPlayer.isLoading}
          >
            {audioPlayer.isLoading ? (
              <ActivityIndicator size={24} color={colors.white} />
            ) : audioPlayer.isPlaying ? (
              <Pause size={24} color={colors.white} />
            ) : (
              <Play size={24} color={colors.white} />
            )}
          </TouchableOpacity>
        );
      }
    } else {
      // For regular stories
      if (!hasAudio) {
        return (
          <TouchableOpacity style={[styles.controlButton, styles.disabledButton]} disabled>
            <Volume2 size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      } else {
        return (
          <TouchableOpacity 
            style={[styles.controlButton, audioPlayer.isLoading && styles.disabledButton]} 
            onPress={audioPlayer.togglePlayPause}
            disabled={audioPlayer.isLoading}
          >
            {audioPlayer.isLoading ? (
              <ActivityIndicator size={24} color={colors.white} />
            ) : audioPlayer.isPlaying ? (
              <Pause size={24} color={colors.white} />
            ) : (
              <Play size={24} color={colors.white} />
            )}
          </TouchableOpacity>
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Audio Progress Bar (only show when audio is available and playing/paused) */}
      {hasAudio && audioPlayer.duration > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(audioPlayer.position / audioPlayer.duration) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>
            {formatTime(audioPlayer.position)} / {formatTime(audioPlayer.duration)}
          </Text>
        </View>
      )}

      {/* Usage Indicator for Personalized Stories */}
      {isPersonalized && usage && (
        <View style={styles.usageContainer}>
          <Text style={styles.usageText}>
            Audio generations: {usage.usage_count}/{usage.limit} this month
          </Text>
        </View>
      )}

      <View style={styles.controlsContainer}>
        {/* Audio Control Button */}
        {renderAudioButton()}
        
        {/* Language Toggle (only for regular stories with audio) */}
        {!isPersonalized && hasAudio && (
          <TouchableOpacity style={styles.controlButton} onPress={handleLanguageToggle}>
            <Languages size={24} color={colors.white} />
            <Text style={styles.languageText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
        
        {/* Revert Reading Button */}
        <TouchableOpacity style={styles.controlButton} onPress={onRevertReading}>
          <RotateCcw size={24} color={colors.white} />
        </TouchableOpacity>
        
        {/* Favorite Button (only for regular stories) */}
        {!isPersonalized && (
          <TouchableOpacity style={styles.controlButton} onPress={onToggleFavorite}>
            <Heart 
              size={24} 
              color={colors.white} 
              fill={isFavorite ? colors.error : 'transparent'} 
            />
          </TouchableOpacity>
        )}
        
        {/* Share Button */}
        <TouchableOpacity style={styles.controlButton} onPress={onShare}>
          <Share2 size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {audioPlayer.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{audioPlayer.error}</Text>
        </View>
      )}
    </View>
  );
}

// Helper function to format time in mm:ss
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.cardLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  usageContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  usageText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.5,
  },
  languageText: {
    position: 'absolute',
    bottom: -2,
    fontSize: 8,
    color: colors.white,
    fontWeight: 'bold',
  },
  errorContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
}); 