// TypeScript types for Claude tool calling

/**
 * Tool definition for Claude API
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
}

/**
 * JSON Schema property definition
 */
export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  required?: string[];
}

/**
 * Content block types for messages
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

/**
 * Message content can be text or content blocks
 */
export type MessageContent = string | ContentBlock[];

/**
 * Message with flexible content
 */
export interface Message {
  role: 'user' | 'assistant';
  content: MessageContent;
}

/**
 * Tool use event from Claude
 */
export interface ToolUseEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Response from send_message_with_tools
 */
export interface AssistantResponse {
  textContent: string;
  toolUses: ToolUseEvent[];
  stopReason: string;
}
