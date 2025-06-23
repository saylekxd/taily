/*
  # Enable public access to sound effects

  1. Security Changes
    - Enable RLS on sound_effect_triggers table
    - Create policy for public read access to sound effects
    - Enable RLS on story_sound_mappings table
    - Create policy for public read access to story sound mappings
    - These are public data that all users should be able to access

  2. Context
    - Sound effect triggers are public data used for interactive reading
    - Story sound mappings are also public data for story-specific effects
    - No sensitive information, safe for public access
    - Required for the interactive reading feature to work
*/

-- Enable RLS on sound_effect_triggers table
ALTER TABLE sound_effect_triggers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to sound effects
CREATE POLICY "Public read access for sound effects" ON sound_effect_triggers
  FOR SELECT
  USING (true);

-- Enable RLS on story_sound_mappings table
ALTER TABLE story_sound_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to story sound mappings
CREATE POLICY "Public read access for story sound mappings" ON story_sound_mappings
  FOR SELECT
  USING (true);

-- Verify the data was inserted correctly by checking count
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM sound_effect_triggers;
    RAISE NOTICE 'Sound effect triggers count: %', row_count;
    
    IF row_count < 10 THEN
        RAISE WARNING 'Expected 10 sound effect triggers, but found %', row_count;
    END IF;
END $$; 