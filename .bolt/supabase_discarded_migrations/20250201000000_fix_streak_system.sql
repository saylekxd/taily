-- Add missing policies for reading_sessions table
CREATE POLICY "Users can insert their own reading sessions"
  ON reading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading sessions"
  ON reading_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to calculate and update user streaks from existing reading sessions
CREATE OR REPLACE FUNCTION calculate_user_streak(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  session_dates DATE[];
  unique_dates DATE[];
  current_date DATE := CURRENT_DATE;
  check_date DATE;
  i INTEGER;
BEGIN
  -- Get all dates when user completed reading sessions
  SELECT ARRAY_AGG(DISTINCT DATE(started_at) ORDER BY DATE(started_at) DESC)
  INTO session_dates
  FROM reading_sessions 
  WHERE user_id = user_uuid 
    AND completed = true;
  
  -- If no completed sessions, return 0
  IF session_dates IS NULL OR array_length(session_dates, 1) = 0 THEN
    RETURN 0;
  END IF;
  
  unique_dates := session_dates;
  
  -- Calculate current streak from today backwards
  FOR i IN 1..array_length(unique_dates, 1) LOOP
    check_date := current_date - (i - 1);
    
    IF unique_dates[i] = check_date THEN
      current_streak := current_streak + 1;
    ELSE
      EXIT; -- Break the streak
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to update all user streaks
CREATE OR REPLACE FUNCTION update_all_user_streaks()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  calculated_streak INTEGER;
BEGIN
  -- Update streak for all users who have profiles
  FOR user_record IN 
    SELECT id FROM profiles
  LOOP
    calculated_streak := calculate_user_streak(user_record.id);
    
    UPDATE profiles 
    SET streak = calculated_streak 
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the streak update for all existing users
SELECT update_all_user_streaks(); 