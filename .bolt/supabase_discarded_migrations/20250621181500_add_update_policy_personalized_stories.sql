-- Add UPDATE policy for personalized_stories table
-- This allows users to update their own stories with audio information
-- Fixes issue where audio URLs were not being saved after generation

CREATE POLICY "Users can update their own personalized stories" 
ON personalized_stories 
FOR UPDATE 
TO public 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id); 