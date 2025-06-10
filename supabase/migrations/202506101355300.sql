-- Step 2.2: Add audio fields to existing stories table
ALTER TABLE stories 
ADD COLUMN audio_url_en TEXT,
ADD COLUMN audio_url_pl TEXT,
ADD COLUMN audio_duration_en INTEGER,
ADD COLUMN audio_duration_pl INTEGER;

-- Add audio fields to personalized_stories table (AI-generated only)
ALTER TABLE personalized_stories 
ADD COLUMN audio_url TEXT,
ADD COLUMN audio_duration INTEGER,
ADD COLUMN voice_id TEXT;

-- Create audio_generation_usage table for tracking monthly limits
CREATE TABLE audio_generation_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, month, year)
);

-- Enable RLS for audio_generation_usage
ALTER TABLE audio_generation_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_generation_usage
CREATE POLICY "Users can view their own audio usage"
  ON audio_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio usage"
  ON audio_generation_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio usage"
  ON audio_generation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create audio_generation_jobs table for tracking AI story generation
CREATE TABLE audio_generation_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  personalized_story_id UUID REFERENCES personalized_stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for audio_generation_jobs
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_generation_jobs
CREATE POLICY "Users can view their own audio jobs"
  ON audio_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);