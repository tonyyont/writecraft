/**
 * Tests for tool input validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ReadDocumentInputSchema,
  UpdateDocumentInputSchema,
  UpdateConceptInputSchema,
  UpdateOutlineInputSchema,
  UpdateStageInputSchema,
  AddEditSuggestionInputSchema,
  DocumentStageSchema,
  validateToolInput,
  safeValidateToolInput,
  formatValidationError,
} from './schemas';
import { ZodError } from 'zod';

describe('ReadDocumentInputSchema', () => {
  it('accepts empty object', () => {
    expect(ReadDocumentInputSchema.parse({})).toEqual({});
  });

  it('rejects unknown properties', () => {
    expect(() => ReadDocumentInputSchema.parse({ extra: 'field' })).toThrow();
  });
});

describe('UpdateDocumentInputSchema', () => {
  it('accepts valid replace operation', () => {
    const input = { operation: 'replace', content: 'new content' };
    expect(UpdateDocumentInputSchema.parse(input)).toEqual(input);
  });

  it('accepts valid append operation', () => {
    const input = { operation: 'append', content: 'more content' };
    expect(UpdateDocumentInputSchema.parse(input)).toEqual(input);
  });

  it('accepts valid insert operation with position', () => {
    const input = { operation: 'insert', content: 'inserted', position: 10 };
    expect(UpdateDocumentInputSchema.parse(input)).toEqual(input);
  });

  it('rejects insert operation without position', () => {
    const input = { operation: 'insert', content: 'inserted' };
    expect(() => UpdateDocumentInputSchema.parse(input)).toThrow('Position is required');
  });

  it('rejects invalid operation', () => {
    const input = { operation: 'delete', content: 'content' };
    expect(() => UpdateDocumentInputSchema.parse(input)).toThrow();
  });

  it('rejects negative position', () => {
    const input = { operation: 'insert', content: 'text', position: -1 };
    expect(() => UpdateDocumentInputSchema.parse(input)).toThrow();
  });

  it('rejects non-integer position', () => {
    const input = { operation: 'insert', content: 'text', position: 1.5 };
    expect(() => UpdateDocumentInputSchema.parse(input)).toThrow();
  });

  it('rejects unknown properties', () => {
    const input = { operation: 'replace', content: 'text', extra: 'field' };
    expect(() => UpdateDocumentInputSchema.parse(input)).toThrow();
  });
});

describe('UpdateConceptInputSchema', () => {
  it('accepts valid concept', () => {
    const input = {
      title: 'My Article',
      coreArgument: 'Main thesis',
      audience: 'General readers',
      tone: 'Professional',
    };
    expect(UpdateConceptInputSchema.parse(input)).toEqual(input);
  });

  it('rejects empty title', () => {
    const input = {
      title: '',
      coreArgument: 'Main thesis',
      audience: 'General readers',
      tone: 'Professional',
    };
    expect(() => UpdateConceptInputSchema.parse(input)).toThrow('Title cannot be empty');
  });

  it('rejects empty coreArgument', () => {
    const input = {
      title: 'Title',
      coreArgument: '',
      audience: 'Readers',
      tone: 'Casual',
    };
    expect(() => UpdateConceptInputSchema.parse(input)).toThrow('Core argument cannot be empty');
  });

  it('rejects missing fields', () => {
    const input = { title: 'Title' };
    expect(() => UpdateConceptInputSchema.parse(input)).toThrow();
  });
});

describe('UpdateOutlineInputSchema', () => {
  it('accepts valid outline', () => {
    const input = {
      sections: [
        { id: '1', title: 'Introduction', description: 'Opening section' },
        { id: '2', title: 'Body', description: 'Main content', estimatedWords: 500 },
      ],
    };
    const result = UpdateOutlineInputSchema.parse(input);
    expect(result.sections).toHaveLength(2);
  });

  it('rejects empty sections array', () => {
    const input = { sections: [] };
    expect(() => UpdateOutlineInputSchema.parse(input)).toThrow('At least one section');
  });

  it('rejects section with empty id', () => {
    const input = {
      sections: [{ id: '', title: 'Title', description: 'Desc' }],
    };
    expect(() => UpdateOutlineInputSchema.parse(input)).toThrow('Section ID cannot be empty');
  });

  it('rejects section with empty title', () => {
    const input = {
      sections: [{ id: '1', title: '', description: 'Desc' }],
    };
    expect(() => UpdateOutlineInputSchema.parse(input)).toThrow('Section title cannot be empty');
  });

  it('accepts section with optional estimatedWords', () => {
    const input = {
      sections: [{ id: '1', title: 'Section', description: '' }],
    };
    expect(() => UpdateOutlineInputSchema.parse(input)).not.toThrow();
  });
});

describe('UpdateStageInputSchema', () => {
  it('accepts valid stages', () => {
    const stages = ['concept', 'outline', 'draft', 'edits', 'polish'];
    stages.forEach((stage) => {
      expect(UpdateStageInputSchema.parse({ stage })).toEqual({ stage });
    });
  });

  it('rejects invalid stage', () => {
    expect(() => UpdateStageInputSchema.parse({ stage: 'invalid' })).toThrow();
    expect(() => UpdateStageInputSchema.parse({ stage: 'DRAFT' })).toThrow();
  });

  it('rejects missing stage', () => {
    expect(() => UpdateStageInputSchema.parse({})).toThrow();
  });
});

describe('AddEditSuggestionInputSchema', () => {
  it('accepts valid suggestion', () => {
    const input = {
      scope: 'paragraph 2',
      before: 'original text',
      after: 'improved text',
      rationale: 'Better clarity',
    };
    expect(AddEditSuggestionInputSchema.parse(input)).toEqual(input);
  });

  it('accepts suggestion without rationale', () => {
    const input = {
      scope: 'sentence 1',
      before: 'old',
      after: 'new',
    };
    expect(AddEditSuggestionInputSchema.parse(input)).toEqual(input);
  });

  it('rejects empty scope', () => {
    const input = {
      scope: '',
      before: 'old',
      after: 'new',
    };
    expect(() => AddEditSuggestionInputSchema.parse(input)).toThrow('Scope cannot be empty');
  });

  it('accepts empty before and after', () => {
    const input = {
      scope: 'intro',
      before: '',
      after: '',
    };
    expect(() => AddEditSuggestionInputSchema.parse(input)).not.toThrow();
  });
});

describe('DocumentStageSchema', () => {
  it('validates all stage values', () => {
    expect(DocumentStageSchema.parse('concept')).toBe('concept');
    expect(DocumentStageSchema.parse('outline')).toBe('outline');
    expect(DocumentStageSchema.parse('draft')).toBe('draft');
    expect(DocumentStageSchema.parse('edits')).toBe('edits');
    expect(DocumentStageSchema.parse('polish')).toBe('polish');
  });

  it('rejects invalid values', () => {
    expect(() => DocumentStageSchema.parse('invalid')).toThrow();
    expect(() => DocumentStageSchema.parse('')).toThrow();
  });
});

describe('validateToolInput', () => {
  it('returns validated data for valid input', () => {
    const result = validateToolInput('update_stage', { stage: 'draft' });
    expect(result).toEqual({ stage: 'draft' });
  });

  it('throws ZodError for invalid input', () => {
    expect(() => validateToolInput('update_stage', { stage: 'invalid' })).toThrow(ZodError);
  });
});

describe('safeValidateToolInput', () => {
  it('returns success result for valid input', () => {
    const result = safeValidateToolInput('update_stage', { stage: 'draft' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ stage: 'draft' });
    }
  });

  it('returns error result for invalid input', () => {
    const result = safeValidateToolInput('update_stage', { stage: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });
});

describe('formatValidationError', () => {
  it('formats single error', () => {
    const result = safeValidateToolInput('update_stage', { stage: 'invalid' });
    if (!result.success) {
      const message = formatValidationError(result.error);
      expect(message).toContain('stage');
    }
  });

  it('formats multiple errors', () => {
    const result = safeValidateToolInput('update_concept', {});
    if (!result.success) {
      const message = formatValidationError(result.error);
      expect(message).toContain(';');
    }
  });
});
