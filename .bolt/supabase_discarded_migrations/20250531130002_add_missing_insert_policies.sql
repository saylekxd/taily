-- Add INSERT policy for user_achievements table
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add INSERT policy for reading_sessions table
CREATE POLICY "Users can insert their own reading sessions" ON public.reading_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for reading_sessions table
CREATE POLICY "Users can update their own reading sessions" ON public.reading_sessions
  FOR UPDATE
  USING (auth.uid() = user_id); 