# Sandbox Subscription Fix Guide

## Issue
When testing in sandbox, subscriptions are being cleared/reverted to free after navigation due to:
1. RevenueCat sync overwriting database values
2. Webhook events arriving late or out of order
3. Sandbox environment being unreliable

## Solutions Applied

### 1. **RevenueCat Service Protection**
- Added check to prevent downgrading premium users unless subscription is actually expired
- Added sandbox environment detection
- If user has premium in DB and not expired, sync is skipped

### 2. **Webhook Protection**
- Added sandbox handling to set default 1-year expiry for sandbox purchases
- Added check before deactivating to not downgrade active subscriptions
- Better environment tracking

### 3. **Delayed Sync**
- SubscriptionContext now waits 5 seconds before syncing with RevenueCat
- This allows purchase to be processed before checking status

## Manual Database Fix

If subscription is still being cleared, use these queries to manually set premium status:

```sql
-- Set user as premium with 1 year expiry (good for testing)
UPDATE profiles 
SET 
  subscription_tier = 'premium',
  subscription_expires_at = (CURRENT_TIMESTAMP + INTERVAL '1 year')::timestamptz,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'YOUR_USER_ID';

-- Update user_subscriptions table
INSERT INTO user_subscriptions (
  user_id,
  subscription_status,
  is_active,
  expiry_date,
  product_id,
  platform,
  environment,
  store,
  updated_at
) VALUES (
  'YOUR_USER_ID',
  'premium',
  true,
  (CURRENT_TIMESTAMP + INTERVAL '1 year')::timestamptz,
  'com.saylekxd.Tailyapp.Annual',
  'ios',
  'SANDBOX',
  'APP_STORE',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  is_active = EXCLUDED.is_active,
  expiry_date = EXCLUDED.expiry_date,
  environment = EXCLUDED.environment,
  updated_at = EXCLUDED.updated_at;

-- Verify the update
SELECT 
  p.id,
  p.subscription_tier,
  p.subscription_expires_at,
  us.subscription_status,
  us.is_active,
  us.expiry_date,
  us.environment
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.id = 'YOUR_USER_ID';
```

## Testing Steps

1. Make sandbox purchase
2. Wait for "Purchase successful" alert
3. Force close app
4. Reopen app
5. Check if premium features are available

## Debug Logging

Watch console logs for:
- "Syncing subscription status:" - Shows what RevenueCat is reporting
- "Skipping downgrade" - Indicates protection is working
- "Subscription sync completed successfully" - Confirms database update

## If Issues Persist

1. Check RevenueCat dashboard to confirm purchase processed
2. Check Supabase logs for webhook events
3. Use manual SQL queries above to force premium status
4. In sandbox, subscriptions may take up to 5 minutes to fully process 