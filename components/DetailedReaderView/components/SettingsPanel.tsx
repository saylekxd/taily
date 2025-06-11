import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { ColorTheme } from '@/types';
import { SettingsPanelProps } from '../types';
import { colorThemes } from '../constants';

export default function SettingsPanel({
  settings,
  colorTheme,
  onFontSizeIncrease,
  onFontSizeDecrease,
  onColorThemeChange,
  onFullscreenToggle,
}: SettingsPanelProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.settingsPanel, { backgroundColor: colorTheme.card }]}>
      {/* Font Size Controls */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingTitle, { color: colorTheme.text }]}>
          {t('story.textSize')}
        </Text>
        <View style={styles.fontControls}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: colorTheme.text + '30' }]}
            onPress={onFontSizeDecrease}
            disabled={settings.fontSize === 'small'}
          >
            <Text style={[styles.controlButtonText, { color: colorTheme.text }]}>A</Text>
          </TouchableOpacity>
          <Text style={[styles.currentFontSize, { color: colorTheme.text }]}>
            {settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}
          </Text>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: colorTheme.text + '30' }]}
            onPress={onFontSizeIncrease}
            disabled={settings.fontSize === 'xxlarge'}
          >
            <Text style={[styles.controlButtonText, { color: colorTheme.text, fontSize: 20 }]}>A</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Theme Controls */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingTitle, { color: colorTheme.text }]}>
          {t('story.theme')}
        </Text>
        <View style={styles.themeControls}>
          {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeButton,
                { backgroundColor: colorThemes[theme].background },
                settings.colorTheme === theme && { borderColor: colors.primary, borderWidth: 3 }
              ]}
              onPress={() => onColorThemeChange(theme)}
            >
              <View style={[styles.themePreview, { backgroundColor: colorThemes[theme].text }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fullscreen Toggle */}
      <TouchableOpacity
        style={[styles.settingButton, { borderColor: colorTheme.text + '30' }]}
        onPress={onFullscreenToggle}
      >
        {settings.isFullscreen ? (
          <Minimize2 size={20} color={colorTheme.text} />
        ) : (
          <Maximize2 size={20} color={colorTheme.text} />
        )}
        <Text style={[styles.settingButtonText, { color: colorTheme.text }]}>
          {settings.isFullscreen ? t('story.exitFullscreen') : t('story.fullscreenMode')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsPanel: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
  },
  currentFontSize: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginHorizontal: 20,
    minWidth: 60,
    textAlign: 'center',
  },
  themeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeButton: {
    width: 60,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  settingButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 