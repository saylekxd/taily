-- Account Deletion System Migration
-- This migration creates the necessary tables and functions for account deletion as required by App Store guidelines

-- Create account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    scheduled_deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    confirmation_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create unique index to prevent duplicate deletion requests
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_user_id_pending_idx 
ON public.account_deletion_requests (user_id) 
WHERE status = 'pending';

-- Enable RLS for account deletion requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own deletion requests
CREATE POLICY "Users can view own deletion requests" ON public.account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only create their own deletion requests
CREATE POLICY "Users can create own deletion requests" ON public.account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can cancel their own pending deletion requests
CREATE POLICY "Users can cancel own deletion requests" ON public.account_deletion_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Function to create account deletion request
CREATE OR REPLACE FUNCTION public.request_account_deletion(
    deletion_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
    confirmation_code_text TEXT;
    scheduled_date TIMESTAMP WITH TIME ZONE;
    existing_request_count INTEGER;
BEGIN
    -- Get the current user ID
    user_uuid := auth.uid();
    
    -- Check if user is authenticated
    IF user_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Check for existing pending deletion requests
    SELECT COUNT(*) INTO existing_request_count
    FROM public.account_deletion_requests
    WHERE user_id = user_uuid AND status = 'pending';
    
    IF existing_request_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'A deletion request is already pending for this account'
        );
    END IF;
    
    -- Generate confirmation code (8 character random string)
    confirmation_code_text := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Set deletion date to 30 days from now (App Store requirement for grace period)
    scheduled_date := timezone('utc'::text, now()) + interval '30 days';
    
    -- Insert deletion request
    INSERT INTO public.account_deletion_requests (
        user_id,
        reason,
        scheduled_deletion_date,
        confirmation_code,
        status
    ) VALUES (
        user_uuid,
        deletion_reason,
        scheduled_date,
        confirmation_code_text,
        'pending'
    );
    
    RETURN json_build_object(
        'success', true,
        'confirmation_code', confirmation_code_text,
        'scheduled_deletion_date', scheduled_date,
        'message', 'Account deletion has been scheduled. You have 30 days to cancel this request.'
    );
END;
$$;

-- Function to cancel account deletion request
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(
    confirmation_code_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
    deletion_request_id UUID;
BEGIN
    -- Get the current user ID
    user_uuid := auth.uid();
    
    -- Check if user is authenticated
    IF user_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Find and update the deletion request
    UPDATE public.account_deletion_requests
    SET 
        status = 'cancelled',
        updated_at = timezone('utc'::text, now())
    WHERE 
        user_id = user_uuid 
        AND confirmation_code = confirmation_code_input 
        AND status = 'pending'
    RETURNING id INTO deletion_request_id;
    
    -- Check if request was found and updated
    IF deletion_request_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No pending deletion request found with that confirmation code'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Account deletion request has been successfully cancelled'
    );
END;
$$;

-- Function to get account deletion status
CREATE OR REPLACE FUNCTION public.get_account_deletion_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
    deletion_request RECORD;
BEGIN
    -- Get the current user ID
    user_uuid := auth.uid();
    
    -- Check if user is authenticated
    IF user_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Find pending deletion request
    SELECT * INTO deletion_request
    FROM public.account_deletion_requests
    WHERE user_id = user_uuid AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Return status
    IF deletion_request IS NULL THEN
        RETURN json_build_object(
            'success', true,
            'has_pending_deletion', false
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'has_pending_deletion', true,
            'scheduled_deletion_date', deletion_request.scheduled_deletion_date,
            'confirmation_code', deletion_request.confirmation_code,
            'requested_at', deletion_request.requested_at,
            'reason', deletion_request.reason
        );
    END IF;
END;
$$;

-- Create updated_at trigger for account_deletion_requests
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_account_deletion_requests_updated_at 
    BEFORE UPDATE ON public.account_deletion_requests 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_deletion_status() TO authenticated; 