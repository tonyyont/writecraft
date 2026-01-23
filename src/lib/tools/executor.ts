import type { ToolUseEvent, ToolResult } from '$lib/types/tools';
import type { OutlinePrompt, EditHistoryEntry } from '$lib/types/sidecar';
import { documentStore } from '$lib/stores/document.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
import { countWords } from '$lib/utils/text';
import { createErrorResponse } from '$lib/utils/errors';
import {
  safeValidateToolInput,
  formatValidationError,
  type ToolName,
  type UpdateDocumentInput,
  type UpdateConceptInput,
  type UpdateOutlineInput,
  type UpdateStageInput,
  type AddEditSuggestionInput,
} from './schemas';

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(toolUse: ToolUseEvent): Promise<ToolResult> {
  try {
    // Special case: read_document has no input to validate
    if (toolUse.name === 'read_document') {
      return executeReadDocument(toolUse.id);
    }

    // Validate that this is a known tool
    const knownTools: ToolName[] = [
      'read_document',
      'update_document',
      'update_concept',
      'update_outline',
      'update_stage',
      'add_edit_suggestion',
    ];

    if (!knownTools.includes(toolUse.name as ToolName)) {
      return {
        tool_use_id: toolUse.id,
        content: createErrorResponse(`Unknown tool: ${toolUse.name}`),
        is_error: true,
      };
    }

    // Validate input using Zod schemas
    const toolName = toolUse.name as Exclude<ToolName, 'read_document'>;
    const validationResult = safeValidateToolInput(toolName, toolUse.input);

    if (!validationResult.success) {
      return {
        tool_use_id: toolUse.id,
        content: createErrorResponse(
          `Invalid input: ${formatValidationError(validationResult.error)}`
        ),
        is_error: true,
      };
    }

    // Execute the appropriate tool handler with validated input
    switch (toolName) {
      case 'update_document':
        return executeUpdateDocument(toolUse.id, validationResult.data as UpdateDocumentInput);

      case 'update_concept':
        return executeUpdateConcept(toolUse.id, validationResult.data as UpdateConceptInput);

      case 'update_outline':
        return executeUpdateOutline(toolUse.id, validationResult.data as UpdateOutlineInput);

      case 'update_stage':
        return executeUpdateStage(toolUse.id, validationResult.data as UpdateStageInput);

      case 'add_edit_suggestion':
        return executeAddEditSuggestion(
          toolUse.id,
          validationResult.data as AddEditSuggestionInput
        );
    }
  } catch (error) {
    return {
      tool_use_id: toolUse.id,
      content: createErrorResponse(error instanceof Error ? error.message : String(error)),
      is_error: true,
    };
  }
}

// ============================================
// Tool execution handlers
// ============================================

function executeReadDocument(toolUseId: string): ToolResult {
  const content = documentStore.content;
  const stage = documentStore.sidecar?.stage ?? 'concept';

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      content,
      stage,
      wordCount: countWords(content),
      filename: documentStore.filename,
    }),
  };
}

function executeUpdateDocument(toolUseId: string, input: UpdateDocumentInput): ToolResult {
  const currentContent = documentStore.content;
  let newContent: string;

  switch (input.operation) {
    case 'replace':
      newContent = input.content;
      break;

    case 'insert': {
      // Position is validated by Zod schema, but TypeScript doesn't know that
      const pos = Math.max(0, Math.min(input.position!, currentContent.length));
      newContent = currentContent.slice(0, pos) + input.content + currentContent.slice(pos);
      break;
    }

    case 'append':
      newContent = currentContent + input.content;
      break;
  }

  documentStore.updateContent(newContent);

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      operation: input.operation,
      wordCount: countWords(newContent),
    }),
  };
}

function executeUpdateConcept(toolUseId: string, input: UpdateConceptInput): ToolResult {
  chatStore.updateConcept({
    title: input.title,
    coreArgument: input.coreArgument,
    audience: input.audience,
    tone: input.tone,
    updatedAt: new Date().toISOString(),
  });

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      concept: {
        title: input.title,
        coreArgument: input.coreArgument,
        audience: input.audience,
        tone: input.tone,
      },
    }),
  };
}

function executeUpdateOutline(toolUseId: string, input: UpdateOutlineInput): ToolResult {
  const prompts: OutlinePrompt[] = input.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    estimatedWords: section.estimatedWords ?? null,
  }));

  chatStore.updateOutline(prompts);

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      sectionCount: prompts.length,
      sections: prompts.map((p) => ({ id: p.id, title: p.title })),
    }),
  };
}

function executeUpdateStage(toolUseId: string, input: UpdateStageInput): ToolResult {
  // Stage is validated by Zod schema
  const previousStage = documentStore.sidecar?.stage ?? 'concept';
  documentStore.updateStage(input.stage);

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      previousStage,
      newStage: input.stage,
    }),
  };
}

function executeAddEditSuggestion(toolUseId: string, input: AddEditSuggestionInput): ToolResult {
  const currentSidecar = documentStore.sidecar;

  if (!currentSidecar) {
    return {
      tool_use_id: toolUseId,
      content: createErrorResponse('No document loaded'),
      is_error: true,
    };
  }

  const entry: EditHistoryEntry = {
    id: crypto.randomUUID(),
    scope: input.scope,
    before: input.before,
    after: input.after,
    accepted: false,
    createdAt: new Date().toISOString(),
    rationale: input.rationale ?? null,
  };

  // Add to editing history
  documentStore.updateSidecar({
    editingHistory: [...currentSidecar.editingHistory, entry],
  });

  return {
    tool_use_id: toolUseId,
    content: JSON.stringify({
      success: true,
      suggestionId: entry.id,
      scope: entry.scope,
    }),
  };
}
