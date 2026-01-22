// Shared Supabase client utilities for Edge Functions

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Usage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  message_count: number;
  message_limit: number;
}

// Create a Supabase client with service role for admin operations
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Create a Supabase client with the user's auth token
export function createUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}

// Extract and validate user from auth header
export async function getUser(authHeader: string | null): Promise<{ id: string; email: string } | null> {
  if (!authHeader) {
    return null;
  }

  const client = createUserClient(authHeader);
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id, email: user.email! };
}

// Get user's subscription
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

// Get user's current usage
export async function getCurrentUsage(userId: string): Promise<Usage | null> {
  const client = createServiceClient();

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await client
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data as Usage;
}

// Increment message count and return new count
export async function incrementMessageCount(userId: string): Promise<number> {
  const client = createServiceClient();

  const { data, error } = await client
    .rpc('increment_message_count', { p_user_id: userId });

  if (error) {
    console.error('Error incrementing message count:', error);
    throw error;
  }

  return data as number;
}

// Log usage for analytics
export async function logUsage(
  userId: string,
  requestType: 'message' | 'tool_use',
  model: string,
  inputTokens?: number,
  outputTokens?: number
): Promise<void> {
  const client = createServiceClient();

  const { error } = await client
    .from('usage_logs')
    .insert({
      user_id: userId,
      request_type: requestType,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

  if (error) {
    console.error('Error logging usage:', error);
    // Don't throw - logging should not block the request
  }
}

// Check if user can send a message
export async function canSendMessage(userId: string): Promise<boolean> {
  const client = createServiceClient();

  const { data, error } = await client
    .rpc('can_send_message', { p_user_id: userId });

  if (error) {
    console.error('Error checking if user can send message:', error);
    return false;
  }

  return data as boolean;
}

// Get allowed models for user's plan
export async function getAllowedModels(userId: string): Promise<string[]> {
  const client = createServiceClient();

  const { data, error } = await client
    .rpc('get_allowed_models', { p_user_id: userId });

  if (error) {
    console.error('Error getting allowed models:', error);
    return ['claude-haiku-4-5-20251001']; // Default to free tier
  }

  return data as string[];
}
