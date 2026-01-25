// Stripe Webhook Handler Edge Function
// Processes Stripe events to sync subscription state

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.12.0?target=deno';

// Validate required environment variables at startup
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Plan configuration
const PLAN_CONFIG = {
  free: { messageLimit: 50 },
  pro: { messageLimit: 1000 },
};

// Map Stripe price IDs to plan IDs
const PRICE_TO_PLAN: Record<string, 'free' | 'pro'> = {
  // Pro Plan - $1/month (Live mode)
  price_0SsSKTEu2QaDui1JQS0gYvWA: 'pro',
};

function getPlanFromPriceId(priceId: string): 'free' | 'pro' {
  // Check if price ID maps to a known plan
  const plan = PRICE_TO_PLAN[priceId];
  if (plan) {
    return plan;
  }

  // For any unknown price ID that's not free, assume it's a paid plan (pro)
  // This handles cases where new prices are added in Stripe
  console.log(`Unknown price ID: ${priceId}, defaulting to pro`);
  return 'pro';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    const supabase = createServiceClient();

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user ID (client_reference_id) in checkout session:', session.id);
    throw new Error(
      `Checkout session ${session.id} missing client_reference_id - user will not be upgraded`
    );
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const planId = getPlanFromPriceId(priceId);

  // Get period dates from subscription item (newer API) or root (older API)
  const currentPeriodStart =
    (subscriptionItem as any)?.current_period_start ?? (subscription as any).current_period_start;
  const currentPeriodEnd =
    (subscriptionItem as any)?.current_period_end ?? (subscription as any).current_period_end;

  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
      current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating subscription after checkout:', error);
    throw error;
  }

  // Update usage limit for new plan
  await updateUsageLimit(supabase, userId, planId);

  console.log(`Checkout completed for user ${userId}, plan: ${planId}`);
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const planId = getPlanFromPriceId(priceId);

  // Get period dates from the subscription item (where they live in newer API versions)
  // Fall back to subscription root for older API versions
  const currentPeriodStart =
    (subscriptionItem as any)?.current_period_start ?? (subscription as any).current_period_start;
  const currentPeriodEnd =
    (subscriptionItem as any)?.current_period_end ?? (subscription as any).current_period_end;

  // Get user ID from subscription metadata (set during checkout creation)
  // This handles the race condition where this event arrives before checkout.session.completed
  const userId = subscription.metadata?.supabase_user_id;

  // Map Stripe status to our status
  let status: 'active' | 'canceled' | 'past_due' | 'trialing';
  switch (subscription.status) {
    case 'active':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    case 'trialing':
      status = 'trialing';
      break;
    case 'incomplete':
    case 'incomplete_expired':
      // Payment failed during initial checkout - treat as canceled
      console.log(`Subscription ${subscription.id} has incomplete status: ${subscription.status}`);
      status = 'canceled';
      break;
    default:
      console.warn(`Unknown subscription status: ${subscription.status}, defaulting to active`);
      status = 'active';
  }

  // Update subscription record
  // Primary: Use user_id from metadata (reliable, handles race condition)
  // Fallback: Use stripe_customer_id (for older subscriptions without metadata)
  let data, error;

  if (userId) {
    ({ data, error } = await supabase
      .from('subscriptions')
      .update({
        stripe_customer_id: customerId, // Also set this for future lookups
        stripe_subscription_id: subscription.id,
        plan_id: planId,
        status,
        current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('user_id', userId)
      .select('user_id')
      .single());
  } else {
    // Fallback for subscriptions without metadata
    ({ data, error } = await supabase
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        plan_id: planId,
        status,
        current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('stripe_customer_id', customerId)
      .select('user_id')
      .single());
  }

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Update usage limit for new plan
  if (data?.user_id) {
    await updateUsageLimit(supabase, data.user_id, planId);
  }

  console.log(
    `Subscription updated for user ${data?.user_id ?? customerId}, plan: ${planId}, status: ${status}`
  );
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.supabase_user_id;

  // Downgrade to free plan
  // Primary: Use user_id from metadata; Fallback: stripe_customer_id
  let data, error;

  if (userId) {
    ({ data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        cancel_at_period_end: false,
      })
      .eq('user_id', userId)
      .select('user_id')
      .single());
  } else {
    ({ data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        cancel_at_period_end: false,
      })
      .eq('stripe_customer_id', customerId)
      .select('user_id')
      .single());
  }

  if (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }

  // Update usage limit to free tier
  if (data?.user_id) {
    await updateUsageLimit(supabase, data.user_id, 'free');
  }

  console.log(`Subscription deleted for user ${data?.user_id ?? customerId}, downgraded to free`);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  // Mark subscription as past_due
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error marking subscription as past_due:', error);
    throw error;
  }

  console.log(`Payment failed for customer ${customerId}`);
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  // Get the subscription to find the user
  const { data: subscriptionData, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (subError || !subscriptionData) {
    console.error('Error finding subscription for invoice:', subError);
    throw new Error(
      `Cannot find subscription for customer ${customerId} - invoice paid but usage not reset`
    );
  }

  // Use invoice period dates if available, otherwise fall back to subscription period
  let periodStart: Date;
  let periodEnd: Date;

  if (invoice.period_start && invoice.period_end) {
    // Use invoice billing period (most accurate)
    periodStart = new Date(invoice.period_start * 1000);
    periodEnd = new Date(invoice.period_end * 1000);
  } else {
    // Fallback: calculate from current date (calendar month)
    periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  }

  const messageLimit =
    PLAN_CONFIG[subscriptionData.plan_id as keyof typeof PLAN_CONFIG]?.messageLimit ?? 50;

  // Upsert usage record for new period
  const { error: usageError } = await supabase.from('usage').upsert(
    {
      user_id: subscriptionData.user_id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      message_count: 0,
      message_limit: messageLimit,
    },
    {
      onConflict: 'user_id,period_start',
    }
  );

  if (usageError) {
    console.error('Error resetting usage:', usageError);
    throw usageError;
  }

  // Mark subscription as active (in case it was past_due)
  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId);

  console.log(`Invoice paid for customer ${customerId}, usage reset`);
}

async function updateUsageLimit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  planId: 'free' | 'pro'
) {
  const messageLimit = PLAN_CONFIG[planId]?.messageLimit ?? 50;
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { error } = await supabase
    .from('usage')
    .update({ message_limit: messageLimit })
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString());

  if (error) {
    console.error('Error updating usage limit:', error);
  }
}
