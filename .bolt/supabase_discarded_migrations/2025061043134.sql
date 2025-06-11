-- Migration: Add audio support with language options and usage tracking
-- This migration adds:
-- 1. Audio fields to stories table with language support (EN/PL)
-- 2. Audio fields to personalized_stories table (AI-generated only)
-- 3. Audio generation usage tracking table for monthly limits
-- 4. Audio generation jobs table for tracking AI story generation

-- Add audio fields to stories table with language support
ALTER TABLE stories 
ADD COLUMN audio_url_en TEXT,
ADD COLUMN audio_url_pl TEXT,
ADD COLUMN audio_duration_en INTEGER, -- Duration in seconds
ADD COLUMN audio_duration_pl INTEGER; -- Duration in seconds

-- Add audio fields to personalized_stories table (AI-generated only)
ALTER TABLE personalized_stories 
ADD COLUMN audio_url TEXT,
ADD COLUMN audio_duration INTEGER, -- Duration in seconds
ADD COLUMN voice_id TEXT; -- ElevenLabs voice ID used

-- Create audio_generation_usage table for tracking monthly limits
CREATE TABLE audio_generation_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
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
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
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

CREATE POLICY "Users can insert their own audio jobs"
  ON audio_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio jobs"
  ON audio_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Add language preference to profiles table
ALTER TABLE profiles 
ADD COLUMN preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'pl'));

-- Create indexes for better performance
CREATE INDEX idx_audio_usage_user_month_year ON audio_generation_usage(user_id, month, year);
CREATE INDEX idx_audio_jobs_user_status ON audio_generation_jobs(user_id, status);
CREATE INDEX idx_personalized_stories_audio ON personalized_stories(user_id) WHERE audio_url IS NOT NULL;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for audio_generation_usage
CREATE TRIGGER update_audio_usage_updated_at 
    BEFORE UPDATE ON audio_generation_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 