// Get Subscription Details Edge Function
// Returns user's subscription and usage information

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUser, getSubscription, getCurrentUsage } from '../_shared/supabase.ts';

interface SubscriptionResponse {
  subscription: {
    plan_id: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  usage: {
    message_count: number;
    message_limit: number;
    period_start: string;
    period_end: string;
  } | null;
  allowed_models: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    const user = await getUser(authHeader);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get subscription and usage
    const subscription = await getSubscription(user.id);
    const usage = await getCurrentUsage(user.id);

    // Determine allowed models based on plan
    const allowedModels = subscription?.plan_id === 'pro'
      ? ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514']
      : ['claude-haiku-4-5-20251001'];

    const response: SubscriptionResponse = {
      subscription: subscription ? {
        plan_id: subscription.plan_id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      } : null,
      usage: usage ? {
        message_count: usage.message_count,
        message_limit: usage.message_limit,
        period_start: usage.period_start,
        period_end: usage.period_end,
      } : null,
      allowed_models: allowedModels,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to get subscription' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
