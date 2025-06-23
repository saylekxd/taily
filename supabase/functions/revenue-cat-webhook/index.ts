import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { event } = payload;

    // Verify webhook signature (recommended for production)
    // const signature = req.headers.get('X-RevenueCat-Signature');
    // if (!verifyWebhookSignature(signature, JSON.stringify(payload))) {
    //   return new Response('Invalid signature', { status: 401 });
    // }

    // Log the webhook event
    await supabase
      .from('revenue_cat_events')
      .insert({
        user_id: event.app_user_id,
        event_type: event.type,
        revenue_cat_customer_id: event.app_user_id,
        product_id: event.product_id,
        subscription_id: event.id,
        event_data: event,
        processed_at: new Date().toISOString()
      });

    // Handle different event types
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
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function handleSubscriptionActivation(supabase: any, event: any) {
  const userId = event.app_user_id;
  const expiryDate = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  
  // Update profiles table
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'premium',
      subscription_expires_at: expiryDate
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      subscription_status: 'premium',
      revenue_cat_customer_id: event.app_user_id,
      product_id: event.product_id,
      expiry_date: expiryDate,
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}

async function handleSubscriptionDeactivation(supabase: any, event: any) {
  const userId = event.app_user_id;
  
  // Update profiles table
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_expires_at: null
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('user_subscriptions')
    .update({
      subscription_status: 'expired',
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

async function handleBillingIssue(supabase: any, event: any) {
  const userId = event.app_user_id;
  
  // Update subscription status to indicate billing issue
  await supabase
    .from('user_subscriptions')
    .update({
      subscription_status: 'billing_issue',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  // Note: Don't immediately revoke access, give user time to resolve
} 