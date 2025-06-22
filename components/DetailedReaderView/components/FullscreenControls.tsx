import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Minimize2, Mic, MicOff } from 'lucide-react-native';
import { FullscreenControlsProps } from '../types';
import { colors } from '@/constants/colors';

export default function FullscreenControls({
  colorTheme,
  onToggleFullscreen,
  onClose,
  // Interactive reading props
  interactiveState,
  onToggleListening,
  onToggleInteractiveMode,
  onEnableAndStartListening,
  isInteractiveAvailable = true,
}: FullscreenControlsProps) {
  const handleMicrophonePress = () => {
    // Use the combined function that handles both enabling and starting listening
    onEnableAndStartListening?.();
  };

  const getMicrophoneIcon = () => {
    if (!interactiveState?.isEnabled || !interactiveState?.isListening) {
      return <MicOff size={16} color={colorTheme.text} />;
    }
    return <Mic size={16} color={colors.primary} />;
  };

  return (
    <View style={[styles.fullscreenControls, { backgroundColor: colorTheme.card + 'CC' }]}>
      {/* Microphone Button */}
      {isInteractiveAvailable && (
        <TouchableOpacity 
          style={[
            styles.fullscreenButton,
            interactiveState?.isListening && { backgroundColor: colors.primary + '20' }
          ]} 
          onPress={handleMicrophonePress}
        >
          {getMicrophoneIcon()}
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.fullscreenButton} onPress={onToggleFullscreen}>
        <Minimize2 size={16} color={colorTheme.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.fullscreenButton} onPress={onClose}>
        <X size={16} color={colorTheme.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    borderRadius: 20,
    padding: 6,
    zIndex: 1000,
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullscreenButton: {
    padding: 8,
    marginHorizontal: 1,
    borderRadius: 16,
  },
}); 