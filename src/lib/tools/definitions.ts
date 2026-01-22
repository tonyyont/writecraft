import type { Tool } from '$lib/types/tools';

/**
 * Tool definitions for Claude agent orchestration
 * These tools allow Claude to read/update documents and drive the writing process
 */

export const READ_DOCUMENT_TOOL: Tool = {
  name: 'read_document',
  description:
    'Read the full content of the current document. Returns the document content, current writing stage, and word count. Use this to understand what the user is working on before making suggestions or updates.',
  input_schema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const UPDATE_DOCUMENT_TOOL: Tool = {
  name: 'update_document',
  description:
    'Update the document content. Can replace all content, insert at a position, or append to the end. Use this when drafting new sections, revising existing text, or making edits the user has approved.',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['replace', 'insert', 'append'],
        description:
          'How to update the document: "replace" replaces all content, "insert" adds at a specific position, "append" adds to the end'
      },
      content: {
        type: 'string',
        description: 'The text content to write to the document'
      },
      position: {
        type: 'number',
        description:
          'Character position for insert operation (0-based). Only required when operation is "insert"'
      }
    },
    required: ['operation', 'content']
  }
};

export const UPDATE_CONCEPT_TOOL: Tool = {
  name: 'update_concept',
  description:
    'Record or update the document concept - the core idea being developed. Use this when the user has articulated their title, main argument, target audience, or intended tone. This helps track the creative direction.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Working title for the piece'
      },
      coreArgument: {
        type: 'string',
        description: 'The main thesis or central idea of the piece'
      },
      audience: {
        type: 'string',
        description: 'Description of the intended readers'
      },
      tone: {
        type: 'string',
        description: 'The voice and style (e.g., "casual and conversational", "formal and academic")'
      }
    },
    required: ['title', 'coreArgument', 'audience', 'tone']
  }
};

export const UPDATE_OUTLINE_TOOL: Tool = {
  name: 'update_outline',
  description:
    'Create or update the document outline - the structural skeleton of the piece. Use this when helping organize ideas into sections with clear purposes and estimated lengths.',
  input_schema: {
    type: 'object',
    properties: {
      sections: {
        type: 'array',
        description: 'Array of outline sections in order',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for this section'
            },
            title: {
              type: 'string',
              description: 'Section heading or name'
            },
            description: {
              type: 'string',
              description: 'What this section covers and its purpose'
            },
            estimatedWords: {
              type: 'number',
              description: 'Approximate word count target for this section'
            }
          },
          required: ['id', 'title', 'description']
        }
      }
    },
    required: ['sections']
  }
};

export const UPDATE_STAGE_TOOL: Tool = {
  name: 'update_stage',
  description:
    'Progress the document to the next writing stage. Stages are: concept (clarifying argument/audience), outline (structuring), draft (writing), edits (revising), polish (final touches). Only advance when the current stage work is substantially complete.',
  input_schema: {
    type: 'object',
    properties: {
      stage: {
        type: 'string',
        enum: ['concept', 'outline', 'draft', 'edits', 'polish'],
        description: 'The stage to set the document to'
      }
    },
    required: ['stage']
  }
};

export const ADD_EDIT_SUGGESTION_TOOL: Tool = {
  name: 'add_edit_suggestion',
  description:
    'Propose a specific edit to the document with before/after text. Use this in the edits or polish stages to suggest targeted improvements. The user can accept or reject each suggestion.',
  input_schema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        description:
          'What part of the document this affects (e.g., "introduction", "third paragraph", "conclusion")'
      },
      before: {
        type: 'string',
        description: 'The original text being edited'
      },
      after: {
        type: 'string',
        description: 'The suggested replacement text'
      },
      rationale: {
        type: 'string',
        description: 'Why this change improves the writing'
      }
    },
    required: ['scope', 'before', 'after']
  }
};

/**
 * All available tools for Claude agent
 */
export const ALL_TOOLS: Tool[] = [
  READ_DOCUMENT_TOOL,
  UPDATE_DOCUMENT_TOOL,
  UPDATE_CONCEPT_TOOL,
  UPDATE_OUTLINE_TOOL,
  UPDATE_STAGE_TOOL,
  ADD_EDIT_SUGGESTION_TOOL
];

/**
 * Get a tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
