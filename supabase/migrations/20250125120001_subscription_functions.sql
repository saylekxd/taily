-- Function to increment AI story usage atomically
CREATE OR REPLACE FUNCTION increment_ai_story_usage(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage_limits (user_id, ai_stories_generated_lifetime, ai_stories_generated_today, updated_at)
  VALUES (user_id, 1, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    ai_stories_generated_lifetime = user_usage_limits.ai_stories_generated_lifetime + 1,
    ai_stories_generated_today = user_usage_limits.ai_stories_generated_today + 1,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment audio usage atomically
CREATE OR REPLACE FUNCTION increment_audio_usage(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage_limits (user_id, audio_generations_this_month, updated_at)
  VALUES (user_id, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    audio_generations_this_month = user_usage_limits.audio_generations_this_month + 1,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_ai_story_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_audio_usage(UUID) TO authenticated; 