import type { ToolUseEvent, ToolResult } from '$lib/types/tools';
import type { OutlinePrompt, DocumentStage, EditHistoryEntry } from '$lib/types/sidecar';
import { documentStore } from '$lib/stores/document.svelte';
import { chatStore } from '$lib/stores/chat.svelte';

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(toolUse: ToolUseEvent): Promise<ToolResult> {
  try {
    const input = toolUse.input as unknown;

    switch (toolUse.name) {
      case 'read_document':
        return executeReadDocument(toolUse.id);

      case 'update_document':
        return executeUpdateDocument(toolUse.id, input as UpdateDocumentInput);

      case 'update_concept':
        return executeUpdateConcept(toolUse.id, input as UpdateConceptInput);

      case 'update_outline':
        return executeUpdateOutline(toolUse.id, input as UpdateOutlineInput);

      case 'update_stage':
        return executeUpdateStage(toolUse.id, input as UpdateStageInput);

      case 'add_edit_suggestion':
        return executeAddEditSuggestion(toolUse.id, input as AddEditSuggestionInput);

      default:
        return {
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` }),
          is_error: true
        };
    }
  } catch (error) {
    return {
      tool_use_id: toolUse.id,
      content: JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      }),
      is_error: true
    };
  }
}

// ============================================
// Tool input types
// ============================================

interface UpdateDocumentInput {
  operation: 'replace' | 'insert' | 'append';
  content: string;
  position?: number;
}

interface UpdateConceptInput {
  title: string;
  coreArgument: string;
  audience: string;
  tone: string;
}

interface UpdateOutlineInput {
  sections: Array<{
    id: string;
    title: string;
    description: string;
    estimatedWords?: number;
  }>;
}

interface UpdateStageInput {
  stage: DocumentStage;
}

interface AddEditSuggestionInput {
  scope: string;
  before: string;
  after: string;
  rationale?: string;
}

// ============================================
// Tool execution handlers
// ============================================

function executeReadDocument(toolUseId: string): ToolResult {
  const content = documentStore.content;
  const stage = documentStore.sidecar?.stage ?? 'concept';
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      content,
      stage,
      wordCount,
      filename: documentStore.filename
    })
  };
}

function executeUpdateDocument(toolUseId: string, input: UpdateDocumentInput): ToolResult {
  const currentContent = documentStore.content;
  let newContent: string;

  switch (input.operation) {
    case 'replace':
      newContent = input.content;
      break;

    case 'insert':
      if (input.position === undefined) {
        return {
          tool_use_id: toolUseId,
          content: JSON.stringify({ error: 'Position required for insert operation' }),
          is_error: true
        };
      }
      const pos = Math.max(0, Math.min(input.position, currentContent.length));
      newContent = currentContent.slice(0, pos) + input.content + currentContent.slice(pos);
      break;

    case 'append':
      newContent = currentContent + input.content;
      break;

    default:
      return {
        tool_use_id: toolUseId,
        content: JSON.stringify({ error: `Unknown operation: ${input.operation}` }),
        is_error: true
      };
  }

  documentStore.updateContent(newContent);

  const wordCount = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      operation: input.operation,
      wordCount
    })
  };
}

function executeUpdateConcept(toolUseId: string, input: UpdateConceptInput): ToolResult {
  chatStore.updateConcept({
    title: input.title,
    coreArgument: input.coreArgument,
    audience: input.audience,
    tone: input.tone,
    updatedAt: new Date().toISOString()
  });

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      concept: {
        title: input.title,
        coreArgument: input.coreArgument,
        audience: input.audience,
        tone: input.tone
      }
    })
  };
}

function executeUpdateOutline(toolUseId: string, input: UpdateOutlineInput): ToolResult {
  const prompts: OutlinePrompt[] = input.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    estimatedWords: section.estimatedWords ?? null
  }));

  chatStore.updateOutline(prompts);

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      sectionCount: prompts.length,
      sections: prompts.map((p) => ({ id: p.id, title: p.title }))
    })
  };
}

function executeUpdateStage(toolUseId: string, input: UpdateStageInput): ToolResult {
  const validStages: DocumentStage[] = ['concept', 'outline', 'draft', 'edits', 'polish'];

  if (!validStages.includes(input.stage)) {
    return {
      tool_use_id: toolUseId,
      content: JSON.stringify({ error: `Invalid stage: ${input.stage}` }),
      is_error: true
    };
  }

  const previousStage = documentStore.sidecar?.stage ?? 'concept';
  documentStore.updateStage(input.stage);

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      previousStage,
      newStage: input.stage
    })
  };
}

function executeAddEditSuggestion(toolUseId: string, input: AddEditSuggestionInput): ToolResult {
  const currentSidecar = documentStore.sidecar;

  if (!currentSidecar) {
    return {
      tool_use_id: toolUseId,
      content: JSON.stringify({ error: 'No document loaded' }),
      is_error: true
    };
  }

  const entry: EditHistoryEntry = {
    id: crypto.randomUUID(),
    scope: input.scope,
    before: input.before,
    after: input.after,
    accepted: false,
    createdAt: new Date().toISOString(),
    rationale: input.rationale ?? null
  };

  // Add to editing history
  documentStore.updateSidecar({
    editingHistory: [...currentSidecar.editingHistory, entry]
  });

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      suggestionId: entry.id,
      scope: entry.scope
    })
  };
}
