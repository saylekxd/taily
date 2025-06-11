import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause } from 'lucide-react-native';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import { InteractiveControlsProps } from '../types';

export default function InteractiveControls({
  state,
  onToggleListening,
  onToggleInteractiveMode,
  onToggleSoundEffects,
  colorTheme,
}: InteractiveControlsProps) {
  const { t } = useI18n();

  // Don't render if interactive mode is not enabled
  if (!state.isEnabled) return null;

  return (
    <View style={[styles.container, { backgroundColor: colorTheme.card }]}>
      <Text style={[styles.title, { color: colorTheme.text }]}>
        {t('story.interactiveReading')}
      </Text>
      
      <View style={styles.controlsRow}>
        {/* Microphone Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: state.isListening ? colors.primary : 'transparent' },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleListening}
        >
          {state.isListening ? (
            <Mic size={20} color={colors.white} />
          ) : (
            <MicOff size={20} color={colorTheme.text} />
          )}
        </TouchableOpacity>

        {/* Sound Effects Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: state.soundEffectsEnabled ? colors.primary : 'transparent' },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleSoundEffects}
        >
          {state.soundEffectsEnabled ? (
            <Volume2 size={20} color={colors.white} />
          ) : (
            <VolumeX size={20} color={colorTheme.text} />
          )}
        </TouchableOpacity>

        {/* Interactive Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: colors.error },
            { borderColor: colorTheme.text + '30' }
          ]}
          onPress={onToggleInteractiveMode}
        >
          <Pause size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusRow}>
        {state.isListening && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.primary }]}>
            <Text style={styles.statusText}>
              {t('story.listening')}
            </Text>
          </View>
        )}

        {state.currentWord && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.accent }]}>
            <Text style={styles.statusText}>
              "{state.currentWord}"
            </Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: colorTheme.text + 'AA' }]}>
        {t('story.interactiveInstructions')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statusText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: colors.white,
  },
  instructions: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 