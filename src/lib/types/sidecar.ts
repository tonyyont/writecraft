// TypeScript types matching Rust sidecar schema
// These types mirror src-tauri/src/models/sidecar.rs

export type DocumentStage = 'concept' | 'outline' | 'draft' | 'edits' | 'polish';

import type { ContentBlock } from './tools';

/**
 * Message content can be a string or content blocks
 */
export type MessageContent = string | ContentBlock[];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  createdAt: string;
}

export interface ConceptSnapshot {
  title: string;
  coreArgument: string;
  audience: string;
  tone: string;
  updatedAt: string;
}

export interface Concept {
  current: ConceptSnapshot | null;
  versions: ConceptSnapshot[];
}

export interface OutlinePrompt {
  id: string;
  title: string;
  description: string;
  estimatedWords: number | null;
}

export interface OutlineSnapshot {
  prompts: OutlinePrompt[];
  createdAt: string;
}

export interface Outline {
  current: OutlinePrompt[] | null;
  versions: OutlineSnapshot[];
}

export interface Conversation {
  messages: ChatMessage[];
  summary: string;
}

export interface EditHistoryEntry {
  id: string;
  scope: string;
  before: string;
  after: string;
  accepted: boolean;
  createdAt: string;
  rationale: string | null;
}

export interface Settings {
  model: string;
}

export interface Meta {
  appVersion: string;
  lastOpenedAt: string;
}

export interface Sidecar {
  version: '1.0';
  documentId: string;
  createdAt: string;
  stage: DocumentStage;
  concept: Concept;
  outline: Outline;
  conversation: Conversation;
  editingHistory: EditHistoryEntry[];
  settings: Settings;
  meta: Meta;
}

export function createDefaultSidecar(): Sidecar {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    documentId: crypto.randomUUID(),
    createdAt: now,
    stage: 'concept',
    concept: {
      current: null,
      versions: []
    },
    outline: {
      current: null,
      versions: []
    },
    conversation: {
      messages: [],
      summary: ''
    },
    editingHistory: [],
    settings: {
      model: 'claude-haiku-4-5-20251001'
    },
    meta: {
      appVersion: '0.1.0',
      lastOpenedAt: now
    }
  };
}
