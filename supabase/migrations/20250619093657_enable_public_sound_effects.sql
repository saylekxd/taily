/*
  # Enable public access to sound effects

  1. Security Changes
    - Enable RLS on sound_effect_triggers table
    - Create policy for public read access to sound effects
    - These are public data that all users should be able to access

  2. Context
    - Sound effect triggers are public data used for interactive reading
    - No sensitive information, safe for public access
    - Required for the interactive reading feature to work
*/

-- Enable RLS on sound_effect_triggers table
ALTER TABLE sound_effect_triggers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to sound effects
CREATE POLICY "Public read access for sound effects" ON sound_effect_triggers
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