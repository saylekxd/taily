# Manual Subscription Update Guide

This guide provides SQL queries to manually update user subscriptions in the Taily app database.

## Important Notes

- Always update **BOTH** tables: `profiles` and `user_subscriptions`
- After updating the database, users need to either:
  - Force close and reopen the app
  - Wait for the app to come to foreground (which triggers auto-refresh)
  - The subscription status will refresh automatically

## 1. Check Current Subscription Status

```sql
-- Check subscription status for a specific user
SELECT 
  p.id,
  p.child_name,
  p.subscription_tier,
  p.subscription_expires_at,
  us.subscription_status,
  us.is_active,
  us.expiry_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.id = 'YOUR_USER_ID_HERE';
```

## 2. Update Single User to Premium

```sql
-- Step 1: Update profiles table
UPDATE profiles 
SET 
  subscription_tier = 'premium',
  subscription_expires_at = '2025-12-31 23:59:59+00'::timestamptz,
  updated_at = now()
WHERE id = 'YOUR_USER_ID_HERE';

-- Step 2: Update user_subscriptions table
UPDATE user_subscriptions
SET 
  subscription_status = 'premium',
  is_active = true,
  expiry_date = '2025-12-31 23:59:59+00'::timestamptz,
  updated_at = now()
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 3: If no subscription record exists, create one
INSERT INTO user_subscriptions (
  user_id,
  subscription_status,
  is_active,
  expiry_date,
  product_id,
  platform,
  environment,
  store
) VALUES (
  'YOUR_USER_ID_HERE',
  'premium',
  true,
  '2025-12-31 23:59:59+00'::timestamptz,
  'com.saylekxd.Tailyapp.Annual',
  'ios',
  'PRODUCTION',
  'APP_STORE'
) ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  is_active = EXCLUDED.is_active,
  expiry_date = EXCLUDED.expiry_date,
  updated_at = now();
```

## 3. Update Multiple Users to Premium

```sql
-- Update multiple users by email domain (e.g., all @company.com users)
WITH target_users AS (
  SELECT p.id 
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email LIKE '%@company.com'
)
UPDATE profiles 
SET 
  subscription_tier = 'premium',
  subscription_expires_at = '2025-12-31 23:59:59+00'::timestamptz
WHERE id IN (SELECT id FROM target_users);

-- Also update their subscription records
WITH target_users AS (
  SELECT p.id 
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email LIKE '%@company.com'
)
INSERT INTO user_subscriptions (
  user_id,
  subscription_status,
  is_active,
  expiry_date,
  product_id
)
SELECT 
  id,
  'premium',
  true,
  '2025-12-31 23:59:59+00'::timestamptz,
  'com.saylekxd.Tailyapp.Annual'
FROM target_users
ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  is_active = EXCLUDED.is_active,
  expiry_date = EXCLUDED.expiry_date,
  updated_at = now();
```

## 4. Set Custom Expiration Date

```sql
-- Give a user premium for 30 days from now
UPDATE profiles 
SET 
  subscription_tier = 'premium',
  subscription_expires_at = (now() + interval '30 days')
WHERE id = 'YOUR_USER_ID_HERE';

UPDATE user_subscriptions
SET 
  subscription_status = 'premium',
  is_active = true,
  expiry_date = (now() + interval '30 days')
WHERE user_id = 'YOUR_USER_ID_HERE';
```

## 5. Revert User to Free Tier

```sql
-- Revert to free tier
UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_expires_at = null
WHERE id = 'YOUR_USER_ID_HERE';

UPDATE user_subscriptions
SET 
  subscription_status = 'free',
  is_active = false,
  expiry_date = null
WHERE user_id = 'YOUR_USER_ID_HERE';
```

## 6. Grant Trial Period

```sql
-- Grant 7-day trial
UPDATE profiles 
SET 
  subscription_tier = 'trial',
  subscription_expires_at = (now() + interval '7 days')
WHERE id = 'YOUR_USER_ID_HERE';

UPDATE user_subscriptions
SET 
  subscription_status = 'trial',
  is_active = true,
  trial_end_date = (now() + interval '7 days'),
  expiry_date = (now() + interval '7 days')
WHERE user_id = 'YOUR_USER_ID_HERE';
```

## 7. Find Users by Subscription Status

```sql
-- Find all premium users
SELECT 
  p.id,
  p.child_name,
  u.email,
  p.subscription_tier,
  p.subscription_expires_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.subscription_tier = 'premium'
ORDER BY p.subscription_expires_at DESC;

-- Find expired subscriptions
SELECT 
  p.id,
  p.child_name,
  u.email,
  p.subscription_tier,
  p.subscription_expires_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.subscription_tier = 'premium' 
  AND p.subscription_expires_at < now()
ORDER BY p.subscription_expires_at DESC;
```

## 8. Verify Update Success

```sql
-- Comprehensive check after update
SELECT 
  p.id,
  u.email,
  p.child_name,
  p.subscription_tier as profile_tier,
  p.subscription_expires_at as profile_expires,
  us.subscription_status as sub_status,
  us.is_active as sub_active,
  us.expiry_date as sub_expires,
  p.updated_at as profile_updated,
  us.updated_at as sub_updated
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.id = 'YOUR_USER_ID_HERE';
```

## Troubleshooting

If the subscription doesn't update in the app:

1. **Check both tables were updated** - Run the verification query above
2. **Force refresh the app** - Close and reopen the app completely
3. **Check for typos** - Ensure the user ID is correct
4. **Check subscription expiry** - Make sure the expiry date is in the future
5. **Check is_active flag** - Must be `true` for premium users

## Common Issues

- **Subscription not showing as premium**: Usually means only one table was updated
- **Premium features still locked**: App needs to refresh - force close and reopen
- **Subscription reverts**: Check if RevenueCat webhook is overriding your changes 