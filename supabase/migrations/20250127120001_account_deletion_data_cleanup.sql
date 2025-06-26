-- Account Deletion Data Cleanup Migration
-- This migration creates functions to handle the actual deletion of user data when grace period expires

-- Function to safely delete all user-related data
CREATE OR REPLACE FUNCTION public.delete_user_data(
    target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INTEGER := 0;
    error_message TEXT;
BEGIN
    -- Start a transaction block for data consistency
    BEGIN
        -- Delete user's personalized stories
        DELETE FROM public.personalized_stories WHERE user_id = target_user_id;
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        -- Delete user's reading sessions
        DELETE FROM public.reading_sessions WHERE user_id = target_user_id;
        
        -- Delete user's story progress
        DELETE FROM public.user_stories WHERE user_id = target_user_id;
        
        -- Delete user's achievements
        DELETE FROM public.user_achievements WHERE user_id = target_user_id;
        
        -- Delete user's audio generation usage tracking
        DELETE FROM public.audio_generation_usage WHERE user_id = target_user_id;
        
        -- Delete user's audio generation jobs
        DELETE FROM public.audio_generation_jobs WHERE user_id = target_user_id;
        
        -- Delete user's usage limits
        DELETE FROM public.user_usage_limits WHERE user_id = target_user_id;
        
        -- Delete user's subscription data
        DELETE FROM public.user_subscriptions WHERE user_id = target_user_id;
        
        -- Delete user's revenue cat events
        DELETE FROM public.revenue_cat_events WHERE user_id = target_user_id;
        
        -- Delete the user's profile (this will cascade to auth.users due to foreign key)
        DELETE FROM public.profiles WHERE id = target_user_id;
        
        -- Delete from auth.users table
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'User data successfully deleted',
            'user_id', target_user_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Capture the error and return it
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        
        RETURN json_build_object(
            'success', false,
            'error', error_message,
            'user_id', target_user_id
        );
    END;
END;
$$;

-- Function to process expired deletion requests
CREATE OR REPLACE FUNCTION public.process_expired_deletion_requests()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_request RECORD;
    deletion_result JSON;
    processed_count INTEGER := 0;
    failed_count INTEGER := 0;
    results JSON[] := '{}';
BEGIN
    -- Find all deletion requests that have expired (past their scheduled deletion date)
    FOR expired_request IN 
        SELECT id, user_id, scheduled_deletion_date, confirmation_code
        FROM public.account_deletion_requests
        WHERE status = 'pending' 
        AND scheduled_deletion_date <= timezone('utc'::text, now())
    LOOP
        -- Update request status to processing
        UPDATE public.account_deletion_requests
        SET 
            status = 'processing',
            updated_at = timezone('utc'::text, now())
        WHERE id = expired_request.id;
        
        -- Attempt to delete user data
        SELECT public.delete_user_data(expired_request.user_id) INTO deletion_result;
        
        IF (deletion_result->>'success')::boolean THEN
            -- Mark deletion as completed
            UPDATE public.account_deletion_requests
            SET 
                status = 'completed',
                updated_at = timezone('utc'::text, now())
            WHERE id = expired_request.id;
            
            processed_count := processed_count + 1;
        ELSE
            -- Mark deletion as failed, keep the request for retry
            UPDATE public.account_deletion_requests
            SET 
                status = 'pending',
                updated_at = timezone('utc'::text, now())
            WHERE id = expired_request.id;
            
            failed_count := failed_count + 1;
        END IF;
        
        -- Add result to results array
        results := results || deletion_result;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_count', processed_count,
        'failed_count', failed_count,
        'total_requests', processed_count + failed_count,
        'results', results
    );
END;
$$;

-- Function to get deletion requests that need processing (for admin/system use)
CREATE OR REPLACE FUNCTION public.get_pending_deletion_requests()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    child_name TEXT,
    scheduled_deletion_date TIMESTAMP WITH TIME ZONE,
    days_until_deletion INTEGER,
    confirmation_code TEXT,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        adr.id,
        adr.user_id,
        au.email as user_email,
        p.child_name,
        adr.scheduled_deletion_date,
        EXTRACT(DAY FROM (adr.scheduled_deletion_date - timezone('utc'::text, now())))::INTEGER as days_until_deletion,
        adr.confirmation_code,
        adr.reason,
        adr.requested_at
    FROM public.account_deletion_requests adr
    LEFT JOIN auth.users au ON au.id = adr.user_id
    LEFT JOIN public.profiles p ON p.id = adr.user_id
    WHERE adr.status = 'pending'
    ORDER BY adr.scheduled_deletion_date ASC;
END;
$$;

-- Grant appropriate permissions for the cleanup functions
-- Note: These functions should typically only be called by system processes/admins
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_deletion_requests() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_deletion_requests() TO service_role;

-- Create an index for efficient querying of expired deletion requests
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_pending_expired 
ON public.account_deletion_requests (scheduled_deletion_date, status) 
WHERE status = 'pending';

-- Add a comment explaining the cleanup process
COMMENT ON FUNCTION public.process_expired_deletion_requests() IS 
'Function to process account deletion requests that have passed their grace period. Should be called by a scheduled job (e.g., daily cron) to automatically delete user accounts that have requested deletion and passed the 30-day grace period.';

COMMENT ON FUNCTION public.delete_user_data(UUID) IS 
'Function to safely delete all user-related data from all tables. This function ensures referential integrity and provides error handling. Should only be called after proper authorization and grace period validation.';

COMMENT ON TABLE public.account_deletion_requests IS 
'Table to track account deletion requests with 30-day grace period as required by App Store guidelines. Users can cancel deletion requests during the grace period using their confirmation code.';

-- Add environment tracking for subscriptions
ALTER TABLE revenue_cat_events 
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'PRODUCTION',
ADD COLUMN IF NOT EXISTS store TEXT DEFAULT 'APP_STORE';

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'PRODUCTION',
ADD COLUMN IF NOT EXISTS store TEXT DEFAULT 'APP_STORE';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_cat_events_environment ON revenue_cat_events(environment);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_environment ON user_subscriptions(environment); 