// Claude API Proxy Edge Function
// Routes requests through Supabase to protect API key and enforce usage limits

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  getUser,
  getSubscription,
  getCurrentUsage,
  incrementMessageCount,
  logUsage,
  canSendMessage,
  getAllowedModels,
} from '../_shared/supabase.ts';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

interface ClaudeRequest {
  messages: ClaudeMessage[];
  system?: string;
  model?: string;
  max_tokens?: number;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  stream?: boolean;
}

interface ErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 4096;

function errorResponse(status: number, type: string, message: string): Response {
  const body: ErrorResponse = {
    error: { type, message },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Validate authentication
    const authHeader = req.headers.get('Authorization');
    const user = await getUser(authHeader);

    if (!user) {
      return errorResponse(401, 'unauthorized', 'Invalid or missing authentication');
    }

    // 2. Check subscription status
    const subscription = await getSubscription(user.id);
    if (!subscription || subscription.status !== 'active') {
      return errorResponse(403, 'subscription_inactive', 'No active subscription found');
    }

    // 3. Check usage limits
    const canSend = await canSendMessage(user.id);
    if (!canSend) {
      const usage = await getCurrentUsage(user.id);
      return errorResponse(429, 'usage_limit_exceeded',
        `Monthly message limit reached (${usage?.message_count ?? 0}/${usage?.message_limit ?? 50}). ` +
        'Upgrade to Pro for more messages.'
      );
    }

    // 4. Parse and validate request
    const body: ClaudeRequest = await req.json();
    const requestedModel = body.model ?? DEFAULT_MODEL;

    // 5. Validate model access
    const allowedModels = await getAllowedModels(user.id);
    if (!allowedModels.includes(requestedModel)) {
      return errorResponse(403, 'model_not_allowed',
        `Model "${requestedModel}" is not available on your plan. ` +
        `Allowed models: ${allowedModels.join(', ')}`
      );
    }

    // 6. Get Anthropic API key from environment (check both naming conventions)
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('CLAUDE_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured');
      return errorResponse(500, 'configuration_error', 'API not configured');
    }

    // 7. Prepare request to Anthropic
    const anthropicRequest = {
      model: requestedModel,
      max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
      messages: body.messages,
      ...(body.system && { system: body.system }),
      ...(body.tools && { tools: body.tools }),
      stream: body.stream ?? true, // Default to streaming
    };

    // 8. Make request to Anthropic
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(anthropicRequest),
    });

    // 9. Handle non-streaming response
    if (!body.stream) {
      const responseData = await anthropicResponse.json();

      // Log usage asynchronously (don't wait)
      const inputTokens = responseData.usage?.input_tokens;
      const outputTokens = responseData.usage?.output_tokens;

      // Use EdgeRuntime.waitUntil if available, otherwise fire and forget
      const logPromise = Promise.all([
        incrementMessageCount(user.id),
        logUsage(user.id, 'message', requestedModel, inputTokens, outputTokens),
      ]);

      // For edge runtime
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(logPromise);
      } else {
        logPromise.catch(console.error);
      }

      return new Response(JSON.stringify(responseData), {
        status: anthropicResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // 10. Handle streaming response
    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json();
      return new Response(JSON.stringify(errorData), {
        status: anthropicResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Track usage at the start of stream (can't easily get token counts from stream)
    const logPromise = Promise.all([
      incrementMessageCount(user.id),
      logUsage(user.id, 'message', requestedModel),
    ]);

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(logPromise);
    } else {
      logPromise.catch(console.error);
    }

    // Pass through the streaming response
    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in claude-proxy:', error);
    return errorResponse(500, 'internal_error', 'An internal error occurred');
  }
});

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
} | undefined;
