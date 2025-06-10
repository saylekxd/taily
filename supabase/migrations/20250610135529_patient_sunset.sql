/*
  # Create personalized stories table

  1. New Tables
    - `personalized_stories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `content` (text)
      - `cover_image` (text)
      - `prompt_used` (text, for debugging/reference)
      - `model_used` (text, track which AI model was used)
      - `categories` (text array)
      - `reading_time` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `personalized_stories` table
    - Add policies for users to view and create their own personalized stories

  3. Changes
    - Users can generate up to 2 personalized stories
    - Stories are tied to user profiles and include child's name, age, and interests
*/

CREATE TABLE IF NOT EXISTS personalized_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  cover_image text,
  prompt_used text, -- Store the prompt for debugging/reference
  model_used text DEFAULT 'gemini-2.0-flash-exp', -- Track which AI model was used
  categories text[],
  reading_time integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE personalized_stories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own personalized stories"
  ON personalized_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personalized stories"
  ON personalized_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_personalized_stories_user_id ON personalized_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_stories_created_at ON personalized_stories(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_personalized_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personalized_stories_updated_at
  BEFORE UPDATE ON personalized_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_personalized_stories_updated_at();