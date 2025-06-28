import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2,
  RotateCcw,
  Volume2,
  Mic,
  Eye
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { audioService, AudioUsage } from '@/services/audioService';
import { subscriptionService } from '@/services/subscriptionService';
import { useUser } from '@/hooks/useUser';
import ShareButton from '@/components/ShareButton';
import { PaywallTrigger } from '@/components/paywall/PaywallTrigger';

interface StoryControlsProps {
  storyId?: string;
  personalizedStoryId?: string;
  isPersonalized: boolean;
  isFavorite: boolean;
  onRevertReading: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenDetailedReader: () => void;
  storyContent?: string; // For AI audio generation
  storyTitle?: string; // For sharing
}

export default function StoryControls({
  storyId,
  personalizedStoryId,
  isPersonalized,
  isFavorite,
  onRevertReading,
  onToggleFavorite,
  onShare,
  onOpenDetailedReader,
  storyContent,
  storyTitle,
}: StoryControlsProps) {
  const [usage, setUsage] = useState<AudioUsage | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'en' | 'pl'>('en');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState<string>();
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  const { profile, user, isGuestMode } = useUser();

  const audioPlayer = useAudioPlayer({
    storyId,
    personalizedStoryId,
    language: userLanguage,
  });

  // Load user language from profile and check audio availability
  useEffect(() => {
    loadUserLanguageFromProfile();
    loadSubscriptionStatus();
    if (isPersonalized) {
      loadUsage();
    }
  }, [profile, user]);

  // Check audio availability when language changes
  useEffect(() => {
    checkAudioAvailability();
  }, [storyId, personalizedStoryId, userLanguage]);

  const loadUserLanguageFromProfile = () => {
    // Get language from user profile, fallback to 'en'
    const language = profile?.language || 'en';
    setUserLanguage(language);
  };

  const loadSubscriptionStatus = async () => {
    try {
      setIsCheckingSubscription(true);
      
      // Guest users are not premium
      if (isGuestMode || !user?.id) {
        setIsPremium(false);
        return;
      }

      const subscriptionStatus = await subscriptionService.getUserSubscriptionStatus(user.id);
      setIsPremium(subscriptionStatus.isPremium);
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setIsPremium(false);
    } finally {
      setIsCheckingSubscription(false);
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

  const handlePlayAudio = async () => {
    // Check subscription status before allowing audio playback
    if (!isPremium) {
      setPaywallMessage('Audio playback is a Premium feature. Upgrade to listen to stories!');
      setShowPaywall(true);
      return;
    }

    // If user is premium, proceed with audio playback
    await audioPlayer.togglePlayPause();
  };

  const handleGenerateAudio = async () => {
    if (!isPersonalized || !personalizedStoryId || !storyContent) return;

    // Check if user can generate audio
    const limitCheck = await audioService.canGenerateAudio();
    if (!limitCheck.canGenerate) {
      setPaywallMessage(limitCheck.reason);
      setShowPaywall(true);
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
        // Check if error is subscription-related
        if (result.error?.includes('Premium') || result.error?.includes('limit')) {
          setPaywallMessage(result.error);
          setShowPaywall(true);
        } else {
          Alert.alert(
            'Generation Failed',
            result.error || 'Failed to generate audio. Please try again.',
            [{ text: 'OK' }]
          );
        }
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
    // Show loading while checking subscription
    if (isCheckingSubscription) {
      return (
        <TouchableOpacity style={[styles.controlButton, styles.disabledButton]} disabled>
          <ActivityIndicator size={24} color={colors.white} />
        </TouchableOpacity>
      );
    }

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
            style={[styles.controlButton, (audioPlayer.isLoading || !isPremium) && styles.disabledButton]} 
            onPress={handlePlayAudio}
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
            style={[styles.controlButton, (audioPlayer.isLoading || !isPremium) && styles.disabledButton]} 
            onPress={handlePlayAudio}
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
        
        {/* Detailed Reader Button */}
        <TouchableOpacity style={styles.controlButton} onPress={onOpenDetailedReader}>
          <Eye size={24} color={colors.white} />
        </TouchableOpacity>
        
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
        <ShareButton
          isPersonalized={isPersonalized}
          storyContent={storyContent}
          storyTitle={storyTitle}
          storyId={storyId}
          personalizedStoryId={personalizedStoryId}
          onShareComplete={(success) => {
            if (success) {
              onShare?.();
            }
          }}
        />
      </View>

      {/* Error Display */}
      {audioPlayer.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{audioPlayer.error}</Text>
        </View>
      )}
      
      <PaywallTrigger 
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="audio_generation"
        customMessage={paywallMessage}
      />
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
    zIndex: 10,
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