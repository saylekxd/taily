import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  id?: string;
  expiration_at_ms?: number;
  environment?: 'SANDBOX' | 'PRODUCTION';
  store?: 'APP_STORE' | 'PLAY_STORE';
  customer_info?: any;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    // Handle both possible payload structures:
    // 1. { event: { type: ..., app_user_id: ... } } - wrapped in event property
    // 2. { type: ..., app_user_id: ... } - direct event data
    let event: RevenueCatEvent;
    if (payload.event && typeof payload.event === 'object') {
      event = payload.event;
    } else if (payload.type && payload.app_user_id) {
      event = payload;
    } else {
      console.error('Invalid webhook payload structure:', payload);
      return new Response('Invalid payload structure - missing event data', { status: 400 });
    }

    console.log('RevenueCat webhook received:', {
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      environment: event.environment,
      store: event.store
    });

    // Enhanced logging for debugging
    if (!event.app_user_id) {
      console.error('Missing app_user_id in webhook event:', event);
      return new Response('Invalid event: missing app_user_id', { status: 400 });
    }

    // Log the webhook event with enhanced error handling
    try {
      await supabase
        .from('revenue_cat_events')
        .insert({
          user_id: event.app_user_id,
          event_type: event.type,
          revenue_cat_customer_id: event.app_user_id,
          product_id: event.product_id || null,
          subscription_id: event.id || null,
          event_data: event,
          environment: event.environment || 'UNKNOWN',
          store: event.store || 'UNKNOWN',
          processed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook event:', logError);
      // Continue processing even if logging fails
    }

    // Handle different event types with better error handling
    try {
      switch (event.type) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'PRODUCT_CHANGE':
          await handleSubscriptionActivation(supabase, event);
          break;
        
        case 'CANCELLATION':
        case 'EXPIRATION':
          await handleSubscriptionDeactivation(supabase, event);
          break;
        
        case 'BILLING_ISSUE':
          await handleBillingIssue(supabase, event);
          break;
        
        case 'NON_RENEWING_PURCHASE':
          console.log('Non-renewing purchase event - no action needed');
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (handlerError) {
      console.error(`Error handling ${event.type} event:`, handlerError);
      // Return error for critical subscription events
      if (['INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'EXPIRATION'].includes(event.type)) {
        throw handlerError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed_event: event.type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function handleSubscriptionActivation(supabase: any, event: RevenueCatEvent) {
  const userId = event.app_user_id;
  const expiryDate = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const isSandbox = event.environment === 'SANDBOX';
  
  console.log(`Activating subscription for user ${userId}, expires: ${expiryDate}, sandbox: ${isSandbox}`);
  
  try {
    // For sandbox purchases, set a longer expiry if not provided
    let effectiveExpiryDate = expiryDate;
    if (isSandbox && !expiryDate) {
      // Give sandbox purchases 1 year by default
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      effectiveExpiryDate = oneYearFromNow.toISOString();
      console.log(`Sandbox purchase without expiry - setting to: ${effectiveExpiryDate}`);
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'premium',
        subscription_expires_at: effectiveExpiryDate,
        revenue_cat_customer_id: event.app_user_id
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // Update subscription record
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        subscription_status: 'premium',
        revenue_cat_customer_id: event.app_user_id,
        product_id: event.product_id,
        expiry_date: effectiveExpiryDate,
        is_active: true,
        environment: event.environment || 'PRODUCTION',
        store: event.store || 'APP_STORE',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
      console.error('Failed to update subscription:', subscriptionError);
      throw new Error(`Subscription update failed: ${subscriptionError.message}`);
    }

    console.log(`Successfully activated subscription for user ${userId}`);
  } catch (error) {
    console.error(`Error in handleSubscriptionActivation for user ${userId}:`, error);
    throw error;
  }
}

async function handleSubscriptionDeactivation(supabase: any, event: RevenueCatEvent) {
  const userId = event.app_user_id;
  const isSandbox = event.environment === 'SANDBOX';
  
  console.log(`Deactivating subscription for user ${userId}, sandbox: ${isSandbox}`);
  
  try {
    // Check current subscription status before deactivating
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (currentProfile) {
      const currentExpiry = currentProfile.subscription_expires_at ? new Date(currentProfile.subscription_expires_at) : null;
      const now = new Date();
      
      // In sandbox, be more careful about deactivating
      if (isSandbox && currentExpiry && currentExpiry > now) {
        console.log(`Skipping deactivation in sandbox - subscription still valid until ${currentExpiry}`);
        return;
      }
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_expires_at: null
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // Update subscription record
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({
        subscription_status: 'expired',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Failed to update subscription:', subscriptionError);
      throw new Error(`Subscription update failed: ${subscriptionError.message}`);
    }

    console.log(`Successfully deactivated subscription for user ${userId}`);
  } catch (error) {
    console.error(`Error in handleSubscriptionDeactivation for user ${userId}:`, error);
    throw error;
  }
}

async function handleBillingIssue(supabase: any, event: RevenueCatEvent) {
  const userId = event.app_user_id;
  
  console.log(`Handling billing issue for user ${userId}`);
  
  try {
    // Update subscription status to indicate billing issue
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({
        subscription_status: 'billing_issue',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Failed to update subscription for billing issue:', subscriptionError);
      throw new Error(`Subscription update failed: ${subscriptionError.message}`);
    }
    
    console.log(`Successfully marked billing issue for user ${userId}`);
    // Note: Don't immediately revoke access, give user time to resolve
  } catch (error) {
    console.error(`Error in handleBillingIssue for user ${userId}:`, error);
    throw error;
  }
} 