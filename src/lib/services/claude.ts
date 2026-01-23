import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Tool, Message, ToolUseEvent, AssistantResponse } from '$lib/types/tools';
import * as Sentry from '@sentry/svelte';
import { analytics } from '$lib/services/analytics';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  chunk: string;
  done: boolean;
}

interface StreamError {
  error: string;
}

interface MessageStopEvent {
  stopReason: string;
}

export type OnChunkCallback = (chunk: string, done: boolean) => void;
export type OnErrorCallback = (error: string) => void;
export type OnToolUseCallback = (toolUse: ToolUseEvent) => void;
export type OnMessageStopCallback = (stopReason: string) => void;

/**
 * Callbacks for sendMessageWithTools
 */
export interface ToolMessageCallbacks {
  onChunk?: OnChunkCallback;
  onError?: OnErrorCallback;
  onToolUse?: OnToolUseCallback;
  onMessageStop?: OnMessageStopCallback;
}

/**
 * Send a message to Claude API with streaming response
 * @param messages - Array of chat messages
 * @param systemPrompt - Optional system prompt
 * @param onChunk - Callback for each streamed chunk
 * @param onError - Optional callback for errors
 * @returns Promise resolving to the complete response
 */
export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt?: string,
  onChunk?: OnChunkCallback,
  onError?: OnErrorCallback
): Promise<string> {
  let chunkUnlisten: UnlistenFn | null = null;
  let errorUnlisten: UnlistenFn | null = null;

  try {
    // Set up event listeners for streaming
    if (onChunk) {
      chunkUnlisten = await listen<StreamChunk>('claude-stream-chunk', (event) => {
        onChunk(event.payload.chunk, event.payload.done);
      });
    }

    if (onError) {
      errorUnlisten = await listen<StreamError>('claude-stream-error', (event) => {
        onError(event.payload.error);
      });
    }

    // Invoke the Rust command
    const response = await invoke<string>('send_message', {
      messages,
      systemPrompt: systemPrompt || null,
      model: null, // Use default model
    });

    return response;
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  } finally {
    // Clean up listeners
    if (chunkUnlisten) {
      chunkUnlisten();
    }
    if (errorUnlisten) {
      errorUnlisten();
    }
  }
}

/**
 * Check if an API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
  try {
    const key = await invoke<string | null>('get_api_key');
    return key !== null;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

/**
 * Test the configured API key
 */
export async function testApiKey(): Promise<boolean> {
  try {
    const key = await invoke<string | null>('get_api_key');
    if (!key) return false;
    return await invoke<boolean>('test_api_key', { key });
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

/**
 * Analytics context for message tracking
 */
export interface MessageAnalyticsContext {
  stage?: string;
}

/**
 * Send a message to Claude API with tool support
 * Uses the authenticated proxy when user is signed in
 * @param messages - Array of messages with flexible content
 * @param systemPrompt - Optional system prompt
 * @param tools - Optional array of tool definitions
 * @param callbacks - Optional callbacks for streaming events
 * @param model - Optional model override
 * @param useAuthenticatedProxy - Whether to use the authenticated Supabase proxy
 * @param analyticsContext - Optional analytics context for tracking
 * @returns Promise resolving to AssistantResponse
 */
export async function sendMessageWithTools(
  messages: Message[],
  systemPrompt?: string,
  tools?: Tool[],
  callbacks?: ToolMessageCallbacks,
  model?: string,
  useAuthenticatedProxy: boolean = true,
  analyticsContext?: MessageAnalyticsContext
): Promise<AssistantResponse> {
  let chunkUnlisten: UnlistenFn | null = null;
  let errorUnlisten: UnlistenFn | null = null;
  let toolUseUnlisten: UnlistenFn | null = null;
  let messageStopUnlisten: UnlistenFn | null = null;

  try {
    // Set up event listeners for streaming
    if (callbacks?.onChunk) {
      chunkUnlisten = await listen<StreamChunk>('claude-stream-chunk', (event) => {
        callbacks.onChunk!(event.payload.chunk, event.payload.done);
      });
    }

    if (callbacks?.onError) {
      errorUnlisten = await listen<StreamError>('claude-stream-error', (event) => {
        callbacks.onError!(event.payload.error);
      });
    }

    if (callbacks?.onToolUse) {
      toolUseUnlisten = await listen<ToolUseEvent>('claude-tool-use', (event) => {
        callbacks.onToolUse!(event.payload);
      });
    }

    if (callbacks?.onMessageStop) {
      messageStopUnlisten = await listen<MessageStopEvent>('claude-message-stop', (event) => {
        callbacks.onMessageStop!(event.payload.stopReason);
      });
    }

    // Use authenticated proxy or direct API based on flag
    const command = useAuthenticatedProxy ? 'send_message_authenticated' : 'send_message_with_tools';

    // Invoke the Rust command
    const response = await invoke<AssistantResponse>(command, {
      messages,
      systemPrompt: systemPrompt || null,
      tools: tools || null,
      model: model || null
    });

    // Track message sent event
    analytics.track('message_sent', {
      stage: analyticsContext?.stage,
      model: model || 'default',
      stopReason: response.stopReason
    });

    return response;
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  } finally {
    // Clean up listeners
    if (chunkUnlisten) chunkUnlisten();
    if (errorUnlisten) errorUnlisten();
    if (toolUseUnlisten) toolUseUnlisten();
    if (messageStopUnlisten) messageStopUnlisten();
  }
}
