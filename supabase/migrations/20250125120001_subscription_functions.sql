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

-- Function to reset daily AI story usage for premium users
CREATE OR REPLACE FUNCTION reset_daily_ai_usage_if_needed(user_id UUID)
RETURNS void AS $$
DECLARE
  current_date_str TEXT;
  last_reset_str TEXT;
BEGIN
  current_date_str := CURRENT_DATE::TEXT;
  
  SELECT ai_stories_last_reset_date::TEXT INTO last_reset_str
  FROM user_usage_limits 
  WHERE user_usage_limits.user_id = reset_daily_ai_usage_if_needed.user_id;
  
  -- Reset if date has changed
  IF last_reset_str IS NULL OR last_reset_str != current_date_str THEN
    UPDATE user_usage_limits 
    SET 
      ai_stories_generated_today = 0,
      ai_stories_last_reset_date = CURRENT_DATE,
      updated_at = timezone('utc'::text, now())
    WHERE user_usage_limits.user_id = reset_daily_ai_usage_if_needed.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly audio usage
CREATE OR REPLACE FUNCTION reset_monthly_audio_usage_if_needed(user_id UUID)
RETURNS void AS $$
DECLARE
  current_month_start DATE;
  last_reset_date DATE;
BEGIN
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT audio_generations_last_reset_date INTO last_reset_date
  FROM user_usage_limits 
  WHERE user_usage_limits.user_id = reset_monthly_audio_usage_if_needed.user_id;
  
  -- Reset if month has changed
  IF last_reset_date IS NULL OR last_reset_date < current_month_start THEN
    UPDATE user_usage_limits 
    SET 
      audio_generations_this_month = 0,
      audio_generations_last_reset_date = current_month_start,
      updated_at = timezone('utc'::text, now())
    WHERE user_usage_limits.user_id = reset_monthly_audio_usage_if_needed.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and get AI story generation limits
CREATE OR REPLACE FUNCTION check_ai_story_limits(user_id UUID)
RETURNS TABLE(
  can_generate BOOLEAN,
  lifetime_used INTEGER,
  today_used INTEGER,
  is_premium BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  user_tier TEXT;
  usage_record RECORD;
BEGIN
  -- Get user subscription tier
  SELECT subscription_tier INTO user_tier
  FROM profiles 
  WHERE id = check_ai_story_limits.user_id;
  
  -- Reset daily usage if needed for premium users
  IF user_tier = 'premium' THEN
    PERFORM reset_daily_ai_usage_if_needed(check_ai_story_limits.user_id);
  END IF;
  
  -- Get usage record
  SELECT * INTO usage_record
  FROM user_usage_limits 
  WHERE user_usage_limits.user_id = check_ai_story_limits.user_id;
  
  -- Create record if doesn't exist
  IF usage_record IS NULL THEN
    INSERT INTO user_usage_limits (user_id) VALUES (check_ai_story_limits.user_id);
    SELECT * INTO usage_record
    FROM user_usage_limits 
    WHERE user_usage_limits.user_id = check_ai_story_limits.user_id;
  END IF;
  
  -- Check limits based on subscription tier
  IF user_tier = 'premium' THEN
    -- Premium: 2 stories per day
    RETURN QUERY SELECT 
      (usage_record.ai_stories_generated_today < 2)::BOOLEAN,
      usage_record.ai_stories_generated_lifetime,
      usage_record.ai_stories_generated_today,
      true::BOOLEAN,
      CASE 
        WHEN usage_record.ai_stories_generated_today >= 2 
        THEN 'Daily limit of 2 AI stories reached. Resets at midnight.'
        ELSE NULL
      END;
  ELSE
    -- Free: 2 lifetime stories
    RETURN QUERY SELECT 
      (usage_record.ai_stories_generated_lifetime < 2)::BOOLEAN,
      usage_record.ai_stories_generated_lifetime,
      usage_record.ai_stories_generated_today,
      false::BOOLEAN,
      CASE 
        WHEN usage_record.ai_stories_generated_lifetime >= 2 
        THEN 'You''ve used your 2 lifetime AI stories. Upgrade to Premium for 2 stories daily!'
        ELSE NULL
      END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check audio generation limits
CREATE OR REPLACE FUNCTION check_audio_generation_limits(user_id UUID)
RETURNS TABLE(
  can_generate BOOLEAN,
  monthly_used INTEGER,
  is_premium BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  user_tier TEXT;
  usage_record RECORD;
BEGIN
  -- Get user subscription tier
  SELECT subscription_tier INTO user_tier
  FROM profiles 
  WHERE id = check_audio_generation_limits.user_id;
  
  -- Only premium users can generate audio
  IF user_tier != 'premium' THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      0::INTEGER,
      false::BOOLEAN,
      'Audio generation is a Premium feature. Upgrade to generate AI story audio!'::TEXT;
    RETURN;
  END IF;
  
  -- Reset monthly usage if needed
  PERFORM reset_monthly_audio_usage_if_needed(check_audio_generation_limits.user_id);
  
  -- Get usage record
  SELECT * INTO usage_record
  FROM user_usage_limits 
  WHERE user_usage_limits.user_id = check_audio_generation_limits.user_id;
  
  -- Create record if doesn't exist
  IF usage_record IS NULL THEN
    INSERT INTO user_usage_limits (user_id) VALUES (check_audio_generation_limits.user_id);
    SELECT * INTO usage_record
    FROM user_usage_limits 
    WHERE user_usage_limits.user_id = check_audio_generation_limits.user_id;
  END IF;
  
  -- Premium: 2 audio generations per month
  RETURN QUERY SELECT 
    (usage_record.audio_generations_this_month < 2)::BOOLEAN,
    usage_record.audio_generations_this_month,
    true::BOOLEAN,
    CASE 
      WHEN usage_record.audio_generations_this_month >= 2 
      THEN 'Monthly limit of 2 audio generations reached. Resets next month.'
      ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_ai_story_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_audio_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_ai_usage_if_needed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_audio_usage_if_needed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ai_story_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_audio_generation_limits(UUID) TO authenticated; 