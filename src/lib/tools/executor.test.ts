/**
 * Tests for tool executor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolUseEvent } from '$lib/types/tools';

// Mock the stores before importing executor
vi.mock('$lib/stores/document.svelte', () => ({
  documentStore: {
    content: '',
    filename: 'test.md',
    currentPath: '/test/path',
    sidecar: {
      stage: 'concept',
      editingHistory: [],
    },
    updateContent: vi.fn(),
    updateStage: vi.fn(),
    updateSidecar: vi.fn(),
  },
}));

vi.mock('$lib/stores/chat.svelte', () => ({
  chatStore: {
    updateConcept: vi.fn(),
    updateOutline: vi.fn(),
  },
}));

import { executeToolCall } from './executor';
import { documentStore } from '$lib/stores/document.svelte';
import { chatStore } from '$lib/stores/chat.svelte';

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document store state
    (documentStore as { content: string }).content = '';
    (documentStore as { sidecar: object | null }).sidecar = {
      stage: 'concept',
      editingHistory: [],
    };
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'unknown_tool',
        input: {},
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(result.tool_use_id).toBe('test-id');
      expect(JSON.parse(result.content).error).toContain('Unknown tool');
    });
  });

  describe('read_document', () => {
    it('returns document content and metadata', async () => {
      (documentStore as { content: string }).content = 'Hello world content';

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'read_document',
        input: {},
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      const data = JSON.parse(result.content);
      expect(data.content).toBe('Hello world content');
      expect(data.stage).toBe('concept');
      expect(data.wordCount).toBe(3);
      expect(data.filename).toBe('test.md');
    });

    it('returns zero word count for empty document', async () => {
      (documentStore as { content: string }).content = '';

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'read_document',
        input: {},
      };

      const result = await executeToolCall(toolUse);

      const data = JSON.parse(result.content);
      expect(data.wordCount).toBe(0);
    });
  });

  describe('update_document', () => {
    it('replaces content', async () => {
      (documentStore as { content: string }).content = 'old content';

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_document',
        input: {
          operation: 'replace',
          content: 'new content here',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(documentStore.updateContent).toHaveBeenCalledWith('new content here');
      const data = JSON.parse(result.content);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('replace');
      expect(data.wordCount).toBe(3);
    });

    it('appends content', async () => {
      (documentStore as { content: string }).content = 'start ';

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_document',
        input: {
          operation: 'append',
          content: 'end',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(documentStore.updateContent).toHaveBeenCalledWith('start end');
    });

    it('inserts content at position', async () => {
      (documentStore as { content: string }).content = 'hello world';

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_document',
        input: {
          operation: 'insert',
          content: ' beautiful',
          position: 5,
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(documentStore.updateContent).toHaveBeenCalledWith('hello beautiful world');
    });

    it('returns validation error for insert without position', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_document',
        input: {
          operation: 'insert',
          content: 'text',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(JSON.parse(result.content).error).toContain('Position is required');
    });

    it('returns validation error for invalid operation', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_document',
        input: {
          operation: 'delete',
          content: 'text',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
    });
  });

  describe('update_concept', () => {
    it('updates concept with valid input', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_concept',
        input: {
          title: 'My Article',
          coreArgument: 'Main thesis here',
          audience: 'General readers',
          tone: 'Professional',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(chatStore.updateConcept).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Article',
          coreArgument: 'Main thesis here',
          audience: 'General readers',
          tone: 'Professional',
        })
      );
      const data = JSON.parse(result.content);
      expect(data.success).toBe(true);
      expect(data.concept.title).toBe('My Article');
    });

    it('returns validation error for empty title', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_concept',
        input: {
          title: '',
          coreArgument: 'Main thesis',
          audience: 'Readers',
          tone: 'Casual',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(JSON.parse(result.content).error).toContain('Title cannot be empty');
    });
  });

  describe('update_outline', () => {
    it('updates outline with valid sections', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_outline',
        input: {
          sections: [
            { id: '1', title: 'Introduction', description: 'Opening section' },
            { id: '2', title: 'Body', description: 'Main content', estimatedWords: 500 },
          ],
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(chatStore.updateOutline).toHaveBeenCalled();
      const data = JSON.parse(result.content);
      expect(data.success).toBe(true);
      expect(data.sectionCount).toBe(2);
    });

    it('returns validation error for empty sections', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_outline',
        input: {
          sections: [],
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(JSON.parse(result.content).error).toContain('At least one section');
    });
  });

  describe('update_stage', () => {
    it('updates stage with valid value', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_stage',
        input: {
          stage: 'draft',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(documentStore.updateStage).toHaveBeenCalledWith('draft');
      const data = JSON.parse(result.content);
      expect(data.success).toBe(true);
      expect(data.previousStage).toBe('concept');
      expect(data.newStage).toBe('draft');
    });

    it('returns validation error for invalid stage', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'update_stage',
        input: {
          stage: 'invalid_stage',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
    });
  });

  describe('add_edit_suggestion', () => {
    it('adds edit suggestion with valid input', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'add_edit_suggestion',
        input: {
          scope: 'paragraph 1',
          before: 'original text',
          after: 'improved text',
          rationale: 'Better clarity',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBeUndefined();
      expect(documentStore.updateSidecar).toHaveBeenCalled();
      const data = JSON.parse(result.content);
      expect(data.success).toBe(true);
      expect(data.scope).toBe('paragraph 1');
      expect(data.suggestionId).toBeDefined();
    });

    it('returns error when no document loaded', async () => {
      (documentStore as { sidecar: object | null }).sidecar = null;

      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'add_edit_suggestion',
        input: {
          scope: 'paragraph 1',
          before: 'old',
          after: 'new',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(JSON.parse(result.content).error).toContain('No document loaded');
    });

    it('returns validation error for empty scope', async () => {
      const toolUse: ToolUseEvent = {
        id: 'test-id',
        name: 'add_edit_suggestion',
        input: {
          scope: '',
          before: 'old',
          after: 'new',
        },
      };

      const result = await executeToolCall(toolUse);

      expect(result.is_error).toBe(true);
      expect(JSON.parse(result.content).error).toContain('Scope cannot be empty');
    });
  });
});
