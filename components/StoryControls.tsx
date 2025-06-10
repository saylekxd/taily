import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2,
  RotateCcw
} from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface StoryControlsProps {
  isPlaying: boolean;
  isFavorite: boolean;
  isPersonalized: boolean;
  onToggleReadAloud: () => void;
  onRevertReading: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
}

export default function StoryControls({
  isPlaying,
  isFavorite,
  isPersonalized,
  onToggleReadAloud,
  onRevertReading,
  onToggleFavorite,
  onShare,
}: StoryControlsProps) {
  return (
    <View style={styles.controlsContainer}>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleReadAloud}>
        {isPlaying ? (
          <Pause size={24} color={colors.white} />
        ) : (
          <Play size={24} color={colors.white} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onRevertReading}>
        <RotateCcw size={24} color={colors.white} />
      </TouchableOpacity>
      
      {/* Only show favorite button for regular stories */}
      {!isPersonalized && (
        <TouchableOpacity style={styles.controlButton} onPress={onToggleFavorite}>
          <Heart 
            size={24} 
            color={colors.white} 
            fill={isFavorite ? colors.error : 'transparent'} 
          />
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.controlButton} onPress={onShare}>
        <Share2 size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 