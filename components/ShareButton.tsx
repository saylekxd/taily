import React from 'react';
import { TouchableOpacity, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { shareService, ShareStoryOptions } from '@/services/shareService';

interface ShareButtonProps extends Omit<ShareStoryOptions, 'isPersonalized'> {
  isPersonalized: boolean;
  onShareComplete?: (success: boolean) => void;
  style?: ViewStyle;
  iconSize?: number;
  iconColor?: string;
  showText?: boolean;
  textStyle?: TextStyle;
  disabled?: boolean;
  variant?: 'icon' | 'text' | 'both';
  quickShare?: boolean; // Use minimal sharing content
}

export default function ShareButton({
  isPersonalized,
  storyContent,
  storyTitle,
  storyId,
  personalizedStoryId,
  onShareComplete,
  style,
  iconSize = 24,
  iconColor = colors.white,
  showText = false,
  textStyle,
  disabled = false,
  variant = 'icon',
  quickShare = false,
}: ShareButtonProps) {
  const handlePress = async () => {
    if (disabled) return;

    let shareSuccess = false;

    if (quickShare) {
      shareSuccess = await shareService.quickShare({
        isPersonalized,
        storyTitle,
        storyId,
        personalizedStoryId,
      });
    } else {
      shareSuccess = await shareService.shareStory({
        isPersonalized,
        storyContent,
        storyTitle,
        storyId,
        personalizedStoryId,
      });
    }

    onShareComplete?.(shareSuccess);
  };

  const renderContent = () => {
    switch (variant) {
      case 'text':
        return (
          <Text style={[styles.text, textStyle]}>
            Share Story
          </Text>
        );
      case 'both':
        return (
          <>
            <Share2 size={iconSize} color={iconColor} />
            <Text style={[styles.text, textStyle, { marginLeft: 8 }]}>
              Share
            </Text>
          </>
        );
      case 'icon':
      default:
        return <Share2 size={iconSize} color={iconColor} />;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'both' && styles.buttonWithText,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={`Share ${isPersonalized ? 'personalized' : ''} story`}
      accessibilityHint="Opens sharing options to share this story with others"
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWithText: {
    width: 'auto',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
}); 