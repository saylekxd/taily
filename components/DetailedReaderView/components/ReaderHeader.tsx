import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Settings, Mic, MicOff } from 'lucide-react-native';
import { ReaderHeaderProps } from '../types';
import { colors } from '@/constants/colors';

export default function ReaderHeader({
  title,
  onClose,
  onSettingsToggle,
  colorTheme,
  isFullscreen,
  // Interactive reading props
  interactiveState,
  onToggleListening,
  onToggleInteractiveMode,
  onEnableAndStartListening,
  isInteractiveAvailable = true,
}: ReaderHeaderProps) {
  if (isFullscreen) return null;

  const handleMicrophonePress = () => {
    // Use the combined function that handles both enabling and starting listening
    onEnableAndStartListening?.();
  };

  const getMicrophoneIcon = () => {
    if (!interactiveState?.isEnabled || !interactiveState?.isListening) {
      return <MicOff size={24} color={colorTheme.text} />;
    }
    return <Mic size={24} color={colors.primary} />;
  };

  return (
    <View style={[styles.header, { 
      backgroundColor: colorTheme.background,
      borderBottomColor: colorTheme.text + '20'
    }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <X size={24} color={colorTheme.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.headerTitle, { color: colorTheme.text }]} numberOfLines={1}>
        {title}
      </Text>
      
      <View style={styles.headerRight}>
        {/* Microphone Button */}
        {isInteractiveAvailable && (
          <TouchableOpacity 
            style={[
              styles.headerButton,
              interactiveState?.isListening && { backgroundColor: colors.primary + '20' }
            ]} 
            onPress={handleMicrophonePress}
          >
            {getMicrophoneIcon()}
          </TouchableOpacity>
        )}
        
        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={onSettingsToggle}
        >
          <Settings size={24} color={colorTheme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
}); 