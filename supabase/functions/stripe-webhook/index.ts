// Stripe Webhook Handler Edge Function
// Processes Stripe events to sync subscription state

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.12.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Plan configuration
const PLAN_CONFIG = {
  free: { messageLimit: 50 },
  pro: { messageLimit: 1000 },
};

// Map Stripe price IDs to plan IDs
const PRICE_TO_PLAN: Record<string, 'free' | 'pro'> = {
  // These will be your actual Stripe price IDs
  // price_free: 'free',
  // price_pro_monthly: 'pro',
};

function getPlanFromPriceId(priceId: string): 'free' | 'pro' {
  return PRICE_TO_PLAN[priceId] ?? 'free';
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
    console.error('No user ID in checkout session');
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const planId = getPlanFromPriceId(priceId);

  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
  const priceId = subscription.items.data[0]?.price.id;
  const planId = getPlanFromPriceId(priceId);

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
    default:
      status = 'active';
  }

  // Update subscription record
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_customer_id', customerId)
    .select('user_id')
    .single();

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Update usage limit for new plan
  if (data?.user_id) {
    await updateUsageLimit(supabase, data.user_id, planId);
  }

  console.log(`Subscription updated for customer ${customerId}, plan: ${planId}, status: ${status}`);
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Downgrade to free plan
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
    })
    .eq('stripe_customer_id', customerId)
    .select('user_id')
    .single();

  if (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }

  // Update usage limit to free tier
  if (data?.user_id) {
    await updateUsageLimit(supabase, data.user_id, 'free');
  }

  console.log(`Subscription deleted for customer ${customerId}, downgraded to free`);
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
    return;
  }

  // Reset usage for new billing period
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const messageLimit = PLAN_CONFIG[subscriptionData.plan_id as keyof typeof PLAN_CONFIG]?.messageLimit ?? 50;

  // Upsert usage record for new period
  const { error: usageError } = await supabase
    .from('usage')
    .upsert({
      user_id: subscriptionData.user_id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      message_count: 0,
      message_limit: messageLimit,
    }, {
      onConflict: 'user_id,period_start',
    });

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
