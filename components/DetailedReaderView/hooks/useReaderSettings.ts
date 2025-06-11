import { useState, useEffect } from 'react';
import { FontSize, ColorTheme } from '@/types';
import { useUser } from '@/hooks/useUser';
import { 
  getUserReadingSettings,
  updateReadingSetting,
  getNextFontSize,
  getPreviousFontSize,
  DEFAULT_READING_SETTINGS
} from '@/services/readingSettingsService';
import { ReaderSettings } from '../types';

export function useReaderSettings(isModalVisible: boolean) {
  const { user } = useUser();
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 'medium',
    colorTheme: 'dark',
    isFullscreen: false,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load user's reading settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setIsLoadingSettings(false);
        return;
      }

      try {
        const userSettings = await getUserReadingSettings(user.id);
        setSettings({
          fontSize: userSettings.font_size,
          colorTheme: userSettings.color_theme,
          isFullscreen: userSettings.fullscreen_mode,
        });
      } catch (error) {
        console.error('Error loading reading settings:', error);
        // Use default settings on error
        const defaults = DEFAULT_READING_SETTINGS;
        setSettings({
          fontSize: defaults.font_size,
          colorTheme: defaults.color_theme,
          isFullscreen: defaults.fullscreen_mode,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (isModalVisible) {
      loadSettings();
    }
  }, [isModalVisible, user?.id]);

  // Save settings when they change
  const saveSettingToDatabase = async (key: keyof typeof DEFAULT_READING_SETTINGS, value: any) => {
    if (!user?.id) return;

    try {
      await updateReadingSetting(user.id, key, value);
    } catch (error) {
      console.error(`Error saving ${key} setting:`, error);
    }
  };

  const increaseFontSize = async () => {
    const nextSize = getNextFontSize(settings.fontSize);
    if (nextSize !== settings.fontSize) {
      setSettings(prev => ({ ...prev, fontSize: nextSize }));
      await saveSettingToDatabase('font_size', nextSize);
    }
  };

  const decreaseFontSize = async () => {
    const prevSize = getPreviousFontSize(settings.fontSize);
    if (prevSize !== settings.fontSize) {
      setSettings(prev => ({ ...prev, fontSize: prevSize }));
      await saveSettingToDatabase('font_size', prevSize);
    }
  };

  const toggleFullscreen = async () => {
    const newFullscreen = !settings.isFullscreen;
    setSettings(prev => ({ ...prev, isFullscreen: newFullscreen }));
    await saveSettingToDatabase('fullscreen_mode', newFullscreen);
  };

  const handleColorThemeChange = async (theme: ColorTheme) => {
    setSettings(prev => ({ ...prev, colorTheme: theme }));
    await saveSettingToDatabase('color_theme', theme);
  };

  return {
    settings,
    isLoadingSettings,
    increaseFontSize,
    decreaseFontSize,
    toggleFullscreen,
    handleColorThemeChange,
  };
} 