/*
  # Add reading settings to profiles table

  1. Changes to profiles table
    - Add `reading_settings` JSONB column to store user reading preferences
    - Includes font size, color theme, and other accessibility settings
    - Default settings provide a good starting point

  2. Settings structure:
    - font_size: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge'
    - color_theme: 'dark' | 'light' | 'sepia' | 'high-contrast'
    - fullscreen_mode: boolean

  3. Security
    - Users can update their own reading settings
    - Reading settings are included in existing profile policies
*/

-- Add reading_settings column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reading_settings JSONB DEFAULT '{
  "font_size": "medium",
  "color_theme": "dark",
  "fullscreen_mode": false
}'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN profiles.reading_settings IS 'User reading preferences for detailed reader view - includes font_size, color_theme, and fullscreen_mode settings';

-- Create index for better performance when querying reading settings
CREATE INDEX IF NOT EXISTS idx_profiles_reading_settings 
ON profiles USING GIN (reading_settings);

-- Add constraint to ensure valid font_size values
ALTER TABLE profiles 
ADD CONSTRAINT check_reading_settings_font_size 
CHECK (
  reading_settings->>'font_size' IS NULL OR 
  reading_settings->>'font_size' IN ('small', 'medium', 'large', 'xlarge', 'xxlarge')
);

-- Add constraint to ensure valid color_theme values
ALTER TABLE profiles 
ADD CONSTRAINT check_reading_settings_color_theme 
CHECK (
  reading_settings->>'color_theme' IS NULL OR 
  reading_settings->>'color_theme' IN ('dark', 'light', 'sepia', 'high-contrast')
);

-- Add constraint to ensure fullscreen_mode is boolean
ALTER TABLE profiles 
ADD CONSTRAINT check_reading_settings_fullscreen_mode 
CHECK (
  reading_settings->>'fullscreen_mode' IS NULL OR 
  reading_settings->>'fullscreen_mode' IN ('true', 'false')
); 