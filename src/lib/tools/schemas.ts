/**
 * Zod schemas for validating tool inputs from Claude
 *
 * These schemas ensure runtime type safety for AI-generated tool calls.
 */

import { z } from 'zod';

/**
 * Schema for read_document tool input (no parameters required)
 */
export const ReadDocumentInputSchema = z.object({}).strict();

/**
 * Schema for update_document tool input
 */
export const UpdateDocumentInputSchema = z
  .object({
    operation: z.enum(['replace', 'insert', 'append']),
    content: z.string(),
    position: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Position is required for insert operation
      if (data.operation === 'insert' && data.position === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'Position is required for insert operation',
      path: ['position'],
    }
  );

/**
 * Schema for update_concept tool input
 */
export const UpdateConceptInputSchema = z
  .object({
    title: z.string().min(1, 'Title cannot be empty'),
    coreArgument: z.string().min(1, 'Core argument cannot be empty'),
    audience: z.string().min(1, 'Audience cannot be empty'),
    tone: z.string().min(1, 'Tone cannot be empty'),
  })
  .strict();

/**
 * Schema for outline section
 */
export const OutlineSectionSchema = z.object({
  id: z.string().min(1, 'Section ID cannot be empty'),
  title: z.string().min(1, 'Section title cannot be empty'),
  description: z.string(),
  estimatedWords: z.number().int().nonnegative().optional(),
});

/**
 * Schema for update_outline tool input
 */
export const UpdateOutlineInputSchema = z
  .object({
    sections: z.array(OutlineSectionSchema).min(1, 'At least one section is required'),
  })
  .strict();

/**
 * Valid document stages
 */
export const DocumentStageSchema = z.enum(['concept', 'outline', 'draft', 'edits', 'polish']);

/**
 * Schema for update_stage tool input
 */
export const UpdateStageInputSchema = z
  .object({
    stage: DocumentStageSchema,
  })
  .strict();

/**
 * Schema for add_edit_suggestion tool input
 */
export const AddEditSuggestionInputSchema = z
  .object({
    scope: z.string().min(1, 'Scope cannot be empty'),
    before: z.string(),
    after: z.string(),
    rationale: z.string().optional(),
  })
  .strict();

/**
 * Type exports inferred from schemas
 */
export type ReadDocumentInput = z.infer<typeof ReadDocumentInputSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;
export type UpdateConceptInput = z.infer<typeof UpdateConceptInputSchema>;
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;
export type UpdateOutlineInput = z.infer<typeof UpdateOutlineInputSchema>;
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;
export type AddEditSuggestionInput = z.infer<typeof AddEditSuggestionInputSchema>;

/**
 * Map of tool names to their validation schemas
 */
export const ToolSchemas = {
  read_document: ReadDocumentInputSchema,
  update_document: UpdateDocumentInputSchema,
  update_concept: UpdateConceptInputSchema,
  update_outline: UpdateOutlineInputSchema,
  update_stage: UpdateStageInputSchema,
  add_edit_suggestion: AddEditSuggestionInputSchema,
} as const;

export type ToolName = keyof typeof ToolSchemas;

/**
 * Validate tool input against its schema
 * @param toolName - The name of the tool
 * @param input - The input to validate
 * @returns The validated input or throws a ZodError
 */
export function validateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
): z.infer<(typeof ToolSchemas)[T]> {
  const schema = ToolSchemas[toolName];
  return schema.parse(input);
}

/**
 * Safely validate tool input, returning a result object
 * @param toolName - The name of the tool
 * @param input - The input to validate
 * @returns An object with success status and either data or error
 */
export function safeValidateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
):
  | { success: true; data: z.infer<(typeof ToolSchemas)[T]> }
  | { success: false; error: z.ZodError } {
  const schema = ToolSchemas[toolName];
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Format Zod validation errors into a human-readable string
 * @param error - The ZodError to format
 * @returns A formatted error message
 */
export function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}
