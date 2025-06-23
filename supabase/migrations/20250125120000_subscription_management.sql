-- User subscription status and RevenueCat integration
CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_status TEXT CHECK (subscription_status IN ('free', 'premium', 'trial', 'expired')) DEFAULT 'free',
  revenue_cat_customer_id TEXT,
  revenue_cat_subscription_id TEXT,
  product_id TEXT, -- 'premium_monthly', 'premium_yearly'
  purchase_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- Usage tracking for freemium limits and premium quotas
CREATE TABLE user_usage_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- AI Story limits
  ai_stories_generated_lifetime INTEGER DEFAULT 0,
  ai_stories_generated_today INTEGER DEFAULT 0,
  ai_stories_last_reset_date DATE DEFAULT CURRENT_DATE,
  -- Audio generation limits (premium only)
  audio_generations_this_month INTEGER DEFAULT 0,
  audio_generations_last_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  -- Story reading progress tracking handled by existing user_stories.progress
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- RevenueCat webhook events log
CREATE TABLE revenue_cat_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'initial_purchase', 'renewal', 'cancellation', 'billing_issue', etc.
  revenue_cat_customer_id TEXT NOT NULL,
  product_id TEXT,
  subscription_id TEXT,
  event_data JSONB,
  processed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_cat_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage limits"
  ON user_usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits"
  ON user_usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage limits"
  ON user_usage_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Revenue cat events are system-managed only
CREATE POLICY "Users can view their own revenue cat events"
  ON revenue_cat_events FOR SELECT
  USING (auth.uid() = user_id);

-- Add subscription fields to profiles for quick access
ALTER TABLE profiles 
ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
ADD COLUMN subscription_expires_at TIMESTAMPTZ,
ADD COLUMN revenue_cat_customer_id TEXT;

-- Create index for quick subscription lookups
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_revenue_cat_customer ON profiles(revenue_cat_customer_id);

-- Initialize usage limits for existing users
INSERT INTO user_usage_limits (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_usage_limits WHERE user_id IS NOT NULL); 