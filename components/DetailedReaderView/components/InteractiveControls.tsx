import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import { InteractiveControlsProps } from '../types';

export default function InteractiveControls({
  state,
  onToggleListening,
  onToggleInteractiveMode,
  onToggleSoundEffects,
  colorTheme,
  error,
  isAvailable = true,
  onClearError,
}: InteractiveControlsProps & {
  error?: string | null;
  isAvailable?: boolean;
  onClearError?: () => void;
}) {
  const { t } = useI18n();

  // Don't render if not available on this platform
  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colorTheme.card }]}>
        <View style={styles.unavailableContainer}>
          <AlertCircle size={24} color={colors.warning} />
          <Text style={[styles.unavailableText, { color: colorTheme.text }]}>
            {Platform.OS === 'web' 
              ? t('story.interactiveNotSupportedWeb')
              : t('story.interactiveNotSupported')
            }
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colorTheme.card }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          {onClearError && (
            <TouchableOpacity onPress={onClearError} style={styles.clearErrorButton}>
              <Text style={[styles.clearErrorText, { color: colorTheme.text }]}>
                {t('common.dismiss')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Don't render if interactive mode is not enabled
  if (!state.isEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: colorTheme.card }]}>
        <View style={styles.enableContainer}>
          <TouchableOpacity
            style={[styles.enableButton, { borderColor: colors.primary }]}
            onPress={onToggleInteractiveMode}
          >
            <Play size={20} color={colors.primary} />
            <Text style={[styles.enableButtonText, { color: colors.primary }]}>
              {t('story.enableInteractiveReading')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.enableDescription, { color: colorTheme.text + 'AA' }]}>
            {t('story.interactiveReadingDescription')}
          </Text>
        </View>
      </View>
    );
  }

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

        {!state.soundEffectsEnabled && (
          <View style={[styles.statusIndicator, { backgroundColor: colors.textSecondary }]}>
            <Text style={styles.statusText}>
              {t('story.soundsMuted')}
            </Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: colorTheme.text + 'AA' }]}>
        {state.isListening 
          ? t('story.speakTriggerWords')
          : t('story.tapMicrophoneToStart')
        }
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
    flexWrap: 'wrap',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 2,
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
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  unavailableText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  errorText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  clearErrorButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearErrorText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
  },
  enableContainer: {
    alignItems: 'center',
    padding: 16,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    marginBottom: 12,
  },
  enableButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    marginLeft: 8,
  },
  enableDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});