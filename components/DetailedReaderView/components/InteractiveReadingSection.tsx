import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, CircleAlert as AlertCircle } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { InteractiveReadingState, ColorThemeStyle } from '../types';

interface InteractiveReadingSectionProps {
  interactiveState: InteractiveReadingState;
  colorTheme: ColorThemeStyle;
  onToggleListening: () => void;
  onToggleInteractiveMode: () => void;
  onToggleSoundEffects: () => void;
  isInteractiveAvailable?: boolean;
}

export default function InteractiveReadingSection({
  interactiveState,
  colorTheme,
  onToggleListening,
  onToggleInteractiveMode,
  onToggleSoundEffects,
  isInteractiveAvailable = true,
}: InteractiveReadingSectionProps) {
  const { t } = useI18n();

  if (!isInteractiveAvailable) {
    return (
      <View style={styles.unavailableContainer}>
        <AlertCircle size={20} color={colors.warning} />
        <Text style={[styles.unavailableText, { color: colorTheme.text }]}>
          {Platform.OS === 'web' 
            ? t('story.interactiveNotSupportedWeb')
            : t('story.interactiveNotSupported')
          }
        </Text>
      </View>
    );
  }

  if (!interactiveState.isEnabled) {
    return (
      <TouchableOpacity
        style={[styles.enableButton, { borderColor: colors.primary }]}
        onPress={onToggleInteractiveMode}
      >
        <Play size={16} color={colors.primary} />
        <Text style={[styles.enableButtonText, { color: colors.primary }]}>
          {t('story.enableInteractiveReading')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.interactiveControls}>
      <View style={styles.controlsRow}>
        {/* Microphone Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: interactiveState.isListening ? colors.primary : 'transparent' },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleListening}
        >
          {interactiveState.isListening ? (
            <Mic size={18} color={colors.white} />
          ) : (
            <MicOff size={18} color={colorTheme.text} />
          )}
        </TouchableOpacity>

        {/* Sound Effects Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: interactiveState.soundEffectsEnabled ? colors.primary : 'transparent' },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleSoundEffects}
        >
          {interactiveState.soundEffectsEnabled ? (
            <Volume2 size={18} color={colors.white} />
          ) : (
            <VolumeX size={18} color={colorTheme.text} />
          )}
        </TouchableOpacity>

        {/* Disable Interactive Mode */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: colors.error },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleInteractiveMode}
        >
          <Pause size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusRow}>
        {interactiveState.isListening && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.primary }]}>
            <Text style={styles.statusText}>
              {t('story.listening')}
            </Text>
          </View>
        )}

        {interactiveState.currentWord && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.accent }]}>
            <Text style={styles.statusText}>
              "{interactiveState.currentWord}"
            </Text>
          </View>
        )}

        {!interactiveState.soundEffectsEnabled && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.textSecondary }]}>
            <Text style={styles.statusText}>
              {t('story.soundsMuted')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  unavailableText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  enableButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginLeft: 8,
  },
  interactiveControls: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Nunito-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
}); 