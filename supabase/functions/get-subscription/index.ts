// Get Subscription Details Edge Function
// Returns user's subscription and usage information

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUser, getSubscription, getCurrentUsage } from '../_shared/supabase.ts';

// Response uses camelCase to match Rust client expectations
interface SubscriptionResponse {
  subscription: {
    planId: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    messageCount: number;
    messageLimit: number;
    periodStart: string;
    periodEnd: string;
  } | null;
  allowedModels: string[];
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
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } : null,
      usage: usage ? {
        messageCount: usage.message_count,
        messageLimit: usage.message_limit,
        periodStart: usage.period_start,
        periodEnd: usage.period_end,
      } : null,
      allowedModels: allowedModels,
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
