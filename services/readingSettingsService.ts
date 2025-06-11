import { supabase } from '@/lib/supabase';
import { ReadingSettings, FontSize, ColorTheme } from '@/types';

/**
 * Default reading settings
 */
export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  font_size: 'medium',
  color_theme: 'dark',
  fullscreen_mode: false,
};

/**
 * Get user's reading settings
 */
export async function getUserReadingSettings(userId: string): Promise<ReadingSettings> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('reading_settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching reading settings:', error);
      return DEFAULT_READING_SETTINGS;
    }

    // If no settings exist, return defaults
    if (!data?.reading_settings) {
      return DEFAULT_READING_SETTINGS;
    }

    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_READING_SETTINGS,
      ...data.reading_settings,
    };
  } catch (error) {
    console.error('Error in getUserReadingSettings:', error);
    return DEFAULT_READING_SETTINGS;
  }
}

/**
 * Update user's reading settings
 */
export async function updateUserReadingSettings(
  userId: string, 
  settings: Partial<ReadingSettings>
): Promise<ReadingSettings> {
  try {
    // Get current settings first
    const currentSettings = await getUserReadingSettings(userId);
    
    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ reading_settings: updatedSettings })
      .eq('id', userId);

    if (error) {
      console.error('Error updating reading settings:', error);
      throw new Error('Failed to update reading settings');
    }

    return updatedSettings;
  } catch (error) {
    console.error('Error in updateUserReadingSettings:', error);
    throw error;
  }
}

/**
 * Update specific reading setting
 */
export async function updateReadingSetting<K extends keyof ReadingSettings>(
  userId: string,
  key: K,
  value: ReadingSettings[K]
): Promise<ReadingSettings> {
  try {
    return await updateUserReadingSettings(userId, { [key]: value });
  } catch (error) {
    console.error(`Error updating reading setting ${key}:`, error);
    throw error;
  }
}

/**
 * Reset reading settings to default
 */
export async function resetReadingSettings(userId: string): Promise<ReadingSettings> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ reading_settings: DEFAULT_READING_SETTINGS })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting reading settings:', error);
      throw new Error('Failed to reset reading settings');
    }

    return DEFAULT_READING_SETTINGS;
  } catch (error) {
    console.error('Error in resetReadingSettings:', error);
    throw error;
  }
}

/**
 * Get available font sizes
 */
export function getAvailableFontSizes(): FontSize[] {
  return ['small', 'medium', 'large', 'xlarge', 'xxlarge'];
}

/**
 * Get available color themes
 */
export function getAvailableColorThemes(): ColorTheme[] {
  return ['dark', 'light', 'sepia', 'high-contrast'];
}

/**
 * Get next font size (for increment button)
 */
export function getNextFontSize(currentSize: FontSize): FontSize {
  const sizes = getAvailableFontSizes();
  const currentIndex = sizes.indexOf(currentSize);
  return currentIndex < sizes.length - 1 ? sizes[currentIndex + 1] : currentSize;
}

/**
 * Get previous font size (for decrement button)
 */
export function getPreviousFontSize(currentSize: FontSize): FontSize {
  const sizes = getAvailableFontSizes();
  const currentIndex = sizes.indexOf(currentSize);
  return currentIndex > 0 ? sizes[currentIndex - 1] : currentSize;
} 