// Create Stripe Customer Portal Session Edge Function
// Creates a portal session for managing subscriptions

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUser, getSubscription } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.12.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface PortalRequest {
  returnUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
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

    // Get subscription to find Stripe customer ID
    const subscription = await getSubscription(user.id);

    if (!subscription?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: PortalRequest = await req.json();
    const { returnUrl } = body;

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl ?? 'fizz://billing/return',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new Response(JSON.stringify({ error: 'Failed to create portal session' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
