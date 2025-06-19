/*
  # Create sound effects and story analysis tables

  1. New Tables
    - `sound_effect_triggers`
      - `id` (uuid, primary key)
      - `word` (text, trigger word)
      - `sound_effect_url` (text, URL to sound effect)
      - `category` (text, sound category)
      - `created_at` (timestamp)

    - `story_sound_mappings`
      - `id` (uuid, primary key)
      - `story_id` (uuid, foreign key to stories)
      - `personalized_story_id` (uuid, foreign key to personalized_stories)
      - `word` (text, trigger word)
      - `sound_effect_url` (text, URL to sound effect)
      - `position_in_text` (integer, character position for highlighting)

  2. Security
    - Public read access for sound effects
    - No RLS needed for sound effect triggers (public data)

  3. Changes
    - Support for both regular and personalized stories
    - Word position tracking for highlighting
    - Sound effect categorization
*/

CREATE TABLE IF NOT EXISTS sound_effect_triggers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word TEXT NOT NULL,
  sound_effect_url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS story_sound_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  personalized_story_id UUID REFERENCES personalized_stories(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  sound_effect_url TEXT NOT NULL,
  position_in_text INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT check_story_reference CHECK (
    (story_id IS NOT NULL AND personalized_story_id IS NULL) OR
    (story_id IS NULL AND personalized_story_id IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sound_effect_triggers_word ON sound_effect_triggers(word);
CREATE INDEX IF NOT EXISTS idx_sound_effect_triggers_category ON sound_effect_triggers(category);
CREATE INDEX IF NOT EXISTS idx_story_sound_mappings_story_id ON story_sound_mappings(story_id);
CREATE INDEX IF NOT EXISTS idx_story_sound_mappings_personalized_story_id ON story_sound_mappings(personalized_story_id);
CREATE INDEX IF NOT EXISTS idx_story_sound_mappings_word ON story_sound_mappings(word);

-- Insert some default sound effects
INSERT INTO sound_effect_triggers (word, sound_effect_url, category) VALUES
('roar', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'animals'),
('meow', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'animals'),
('woof', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'animals'),
('chirp', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'animals'),
('splash', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'water'),
('thunder', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'weather'),
('wind', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'weather'),
('magic', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'fantasy'),
('sparkle', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'fantasy'),
('footsteps', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 'movement');