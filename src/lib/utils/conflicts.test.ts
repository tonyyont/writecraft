import { describe, it, expect } from 'vitest';
import {
  detectOutlineDraftConflicts,
  formatConflictsForPrompt,
  type ConflictReport,
  type DraftSection,
  type OutlineDraftConflict
} from './conflicts';
import type { OutlinePrompt } from '$lib/types/sidecar';

// ============================================================================
// Helper Functions
// ============================================================================

const createOutlinePrompt = (
  id: string,
  title: string,
  description: string = '',
  estimatedWords: number | null = null
): OutlinePrompt => ({
  id,
  title,
  description,
  estimatedWords
});

const createDraftContent = (sections: Array<{ title: string; content: string }>): string => {
  return sections
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join('\n\n');
};

// ============================================================================
// detectOutlineDraftConflicts Tests
// ============================================================================

describe('detectOutlineDraftConflicts', () => {
  describe('empty draft handling', () => {
    it('should return no conflicts for empty draft content', () => {
      const previous = [createOutlinePrompt('1', 'Section 1')];
      const current = [createOutlinePrompt('2', 'Section 2')];

      const result = detectOutlineDraftConflicts(previous, current, '');

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary).toBe('No draft content to check for conflicts.');
    });

    it('should return no conflicts for whitespace-only draft', () => {
      const previous = [createOutlinePrompt('1', 'Section 1')];
      const current: OutlinePrompt[] = [];

      const result = detectOutlineDraftConflicts(previous, current, '   \n\n   ');

      expect(result.hasConflicts).toBe(false);
    });

    it('should return no conflicts when draft has no recognizable sections', () => {
      const previous = [createOutlinePrompt('1', 'Section 1')];
      const current: OutlinePrompt[] = [];
      const draft = 'Just some plain text without any section headers.';

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(false);
      expect(result.summary).toBe('No recognizable sections found in draft content.');
    });
  });

  describe('section deletion detection', () => {
    it('should detect when a section with drafted content is deleted', () => {
      const previous = [
        createOutlinePrompt('1', 'Introduction'),
        createOutlinePrompt('2', 'Body')
      ];
      const current = [createOutlinePrompt('1', 'Introduction')];
      const draft = createDraftContent([
        { title: 'Introduction', content: 'Intro content here.' },
        { title: 'Body', content: 'Body content that will be orphaned.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('outline_deleted');
      expect(result.conflicts[0].sectionTitle).toBe('Body');
      expect(result.conflicts[0].outlineChange).toContain('removed from the outline');
    });

    it('should include draft preview in deleted section conflict', () => {
      const previous = [createOutlinePrompt('1', 'Deleted Section')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([
        { title: 'Deleted Section', content: 'This is the content that was drafted.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.conflicts[0].affectedDraftPreview).toContain('This is the content');
    });
  });

  describe('section modification detection', () => {
    it('should detect title changes', () => {
      const previous = [createOutlinePrompt('1', 'Original Title', 'Description')];
      const current = [createOutlinePrompt('1', 'Changed Title', 'Description')];
      const draft = createDraftContent([
        { title: 'Original Title', content: 'Content for this section.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].conflictType).toBe('outline_modified');
      expect(result.conflicts[0].outlineChange).toContain('title changed');
    });

    it('should detect significant description changes', () => {
      const shortDesc = 'Short description.';
      const longDesc = 'This is a much longer description that has been significantly expanded with additional detail and context.';

      const previous = [createOutlinePrompt('1', 'Section', shortDesc)];
      const current = [createOutlinePrompt('1', 'Section', longDesc)];
      const draft = createDraftContent([
        { title: 'Section', content: 'Draft content here.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].outlineChange).toContain('description significantly modified');
    });

    it('should not flag minor description changes', () => {
      const previous = [createOutlinePrompt('1', 'Section', 'Description here.')];
      const current = [createOutlinePrompt('1', 'Section', 'Description here!')]; // Just punctuation change
      const draft = createDraftContent([
        { title: 'Section', content: 'Draft content.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      // Should have no conflicts for trivial description changes
      expect(result.conflicts.filter((c) => c.outlineChange.includes('description'))).toHaveLength(0);
    });

    it('should detect estimated word count changes', () => {
      const previous = [createOutlinePrompt('1', 'Section', '', 500)];
      const current = [createOutlinePrompt('1', 'Section', '', 1500)];
      const draft = createDraftContent([
        { title: 'Section', content: 'Content here.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].outlineChange).toContain('word count estimate changed');
    });

    it('should detect multiple modifications in one section', () => {
      const previous = [createOutlinePrompt('1', 'Old Title', 'Old description that is long enough.', 500)];
      const current = [createOutlinePrompt('1', 'New Title', 'New description that is different and long enough to be significant.', 1000)];
      const draft = createDraftContent([
        { title: 'Old Title', content: 'Some content.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.conflicts[0].outlineChange).toContain('title changed');
      expect(result.conflicts[0].outlineChange).toContain('description');
      expect(result.conflicts[0].outlineChange).toContain('word count');
    });
  });

  describe('section reordering detection', () => {
    it('should detect significant reordering (2+ positions)', () => {
      const previous = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
        createOutlinePrompt('3', 'Section C'),
        createOutlinePrompt('4', 'Section D')
      ];
      const current = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('4', 'Section D'), // Moved from position 4 to 2
        createOutlinePrompt('2', 'Section B'),
        createOutlinePrompt('3', 'Section C')
      ];
      const draft = createDraftContent([
        { title: 'Section D', content: 'Content for D.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      const reorderedConflict = result.conflicts.find((c) => c.conflictType === 'outline_reordered');
      expect(reorderedConflict).toBeDefined();
      expect(reorderedConflict?.outlineChange).toContain('position');
    });

    it('should not flag minor reordering (moved by 1 position)', () => {
      const previous = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
        createOutlinePrompt('3', 'Section C')
      ];
      const current = [
        createOutlinePrompt('2', 'Section B'), // Moved from position 2 to 1
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('3', 'Section C')
      ];
      const draft = createDraftContent([
        { title: 'Section B', content: 'Content for B.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      const reorderedConflicts = result.conflicts.filter((c) => c.conflictType === 'outline_reordered');
      expect(reorderedConflicts).toHaveLength(0);
    });
  });

  describe('title matching', () => {
    it('should match titles case-insensitively', () => {
      const previous = [createOutlinePrompt('1', 'Introduction')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([
        { title: 'INTRODUCTION', content: 'Content here.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].conflictType).toBe('outline_deleted');
    });

    it('should match titles with extra whitespace', () => {
      const previous = [createOutlinePrompt('1', 'Section  Title')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([
        { title: 'Section Title', content: 'Content here.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
    });

    it('should match partial titles (one contains the other)', () => {
      const previous = [createOutlinePrompt('1', 'Introduction')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([
        { title: 'Introduction to the Topic', content: 'Content.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(true);
    });
  });

  describe('draft section extraction', () => {
    it('should extract multiple sections from draft', () => {
      const previous = [
        createOutlinePrompt('1', 'Section 1'),
        createOutlinePrompt('2', 'Section 2')
      ];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([
        { title: 'Section 1', content: 'First section content.' },
        { title: 'Section 2', content: 'Second section content.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.conflicts).toHaveLength(2);
    });

    it('should handle sections with multi-line content', () => {
      const previous = [createOutlinePrompt('1', 'Section')];
      const current: OutlinePrompt[] = [];
      const multiLineContent = 'Line 1\n\nLine 2\n\nLine 3 with more text.';
      const draft = createDraftContent([
        { title: 'Section', content: multiLineContent }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.conflicts[0].affectedDraftPreview).toContain('Line 1');
    });
  });

  describe('conflict summary generation', () => {
    it('should generate summary for deleted sections', () => {
      const previous = [createOutlinePrompt('1', 'Section')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([{ title: 'Section', content: 'Content.' }]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.summary).toContain('1 deleted');
    });

    it('should generate summary for modified sections', () => {
      const previous = [createOutlinePrompt('1', 'Old Title')];
      const current = [createOutlinePrompt('1', 'New Title')];
      const draft = createDraftContent([{ title: 'Old Title', content: 'Content.' }]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.summary).toContain('1 modified');
    });

    it('should generate summary for reordered sections', () => {
      const previous = [
        createOutlinePrompt('1', 'A'),
        createOutlinePrompt('2', 'B'),
        createOutlinePrompt('3', 'C')
      ];
      const current = [
        createOutlinePrompt('3', 'C'),
        createOutlinePrompt('2', 'B'),
        createOutlinePrompt('1', 'A')
      ];
      const draft = createDraftContent([{ title: 'A', content: 'Content.' }]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.summary).toContain('reordered');
    });

    it('should generate combined summary for multiple conflict types', () => {
      const previous = [
        createOutlinePrompt('1', 'Deleted Section'),
        createOutlinePrompt('2', 'Modified Section')
      ];
      const current = [createOutlinePrompt('2', 'Changed Title')];
      const draft = createDraftContent([
        { title: 'Deleted Section', content: 'Content 1.' },
        { title: 'Modified Section', content: 'Content 2.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.summary).toContain('deleted');
      expect(result.summary).toContain('modified');
    });
  });

  describe('no conflicts scenario', () => {
    it('should report no conflicts when outline changes do not affect drafted sections', () => {
      const previous = [
        createOutlinePrompt('1', 'Section 1'),
        createOutlinePrompt('2', 'Section 2')
      ];
      const current = [
        createOutlinePrompt('1', 'Section 1'),
        createOutlinePrompt('2', 'Section 2'),
        createOutlinePrompt('3', 'Section 3') // New section, no draft yet
      ];
      const draft = createDraftContent([
        { title: 'Section 1', content: 'Content 1.' }
      ]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.hasConflicts).toBe(false);
      expect(result.summary).toContain('No conflicts detected');
    });

    it('should report no conflicts when drafted sections are unchanged', () => {
      const outline = [
        createOutlinePrompt('1', 'Section 1', 'Description', 500),
        createOutlinePrompt('2', 'Section 2', 'Description', 300)
      ];
      const draft = createDraftContent([
        { title: 'Section 1', content: 'Content.' }
      ]);

      const result = detectOutlineDraftConflicts(outline, outline, draft);

      expect(result.hasConflicts).toBe(false);
    });
  });

  describe('preview truncation', () => {
    it('should truncate long draft previews', () => {
      const longContent = 'A'.repeat(300);
      const previous = [createOutlinePrompt('1', 'Section')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([{ title: 'Section', content: longContent }]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      expect(result.conflicts[0].affectedDraftPreview.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(result.conflicts[0].affectedDraftPreview).toContain('...');
    });

    it('should try to break at word boundary when truncating', () => {
      const content = 'This is a sentence with multiple words that goes on and on. '.repeat(5);
      const previous = [createOutlinePrompt('1', 'Section')];
      const current: OutlinePrompt[] = [];
      const draft = createDraftContent([{ title: 'Section', content }]);

      const result = detectOutlineDraftConflicts(previous, current, draft);

      // Should end with a complete word followed by ...
      expect(result.conflicts[0].affectedDraftPreview).toMatch(/\w\.\.\.$/);
    });
  });
});

// ============================================================================
// formatConflictsForPrompt Tests
// ============================================================================

describe('formatConflictsForPrompt', () => {
  it('should return empty string when no conflicts', () => {
    const report: ConflictReport = {
      hasConflicts: false,
      conflicts: [],
      summary: 'No conflicts.'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toBe('');
  });

  it('should include header for conflict report', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Test Section',
          conflictType: 'outline_deleted',
          outlineChange: 'Section was removed',
          affectedDraftPreview: 'Draft content here.'
        }
      ],
      summary: 'Found 1 conflict.'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('## Outline-Draft Conflicts Detected');
    expect(result).toContain('Found 1 conflict.');
  });

  it('should format deleted section conflicts', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Deleted Section',
          conflictType: 'outline_deleted',
          outlineChange: 'Section "Deleted Section" was removed from the outline',
          affectedDraftPreview: 'This content will be orphaned.'
        }
      ],
      summary: '1 deleted'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('### Deleted Section');
    expect(result).toContain('**Conflict Type:** Section Deleted');
    expect(result).toContain('draft content still exists');
    expect(result).toContain('This content will be orphaned.');
  });

  it('should format modified section conflicts', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Modified Section',
          conflictType: 'outline_modified',
          outlineChange: 'title changed from "Old Title" to "Modified Section"',
          affectedDraftPreview: 'Existing draft content.'
        }
      ],
      summary: '1 modified'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('### Modified Section');
    expect(result).toContain('**Conflict Type:** Section Modified');
    expect(result).toContain('**Changes:**');
    expect(result).toContain('title changed');
  });

  it('should format reordered section conflicts', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Reordered Section',
          conflictType: 'outline_reordered',
          outlineChange: 'Section moved from position 1 to position 5',
          affectedDraftPreview: 'Content that may need moving.'
        }
      ],
      summary: '1 reordered'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('### Reordered Section');
    expect(result).toContain('**Conflict Type:** Section Reordered');
    expect(result).toContain('position 1');
    expect(result).toContain('position 5');
  });

  it('should include affected draft preview in code block', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Section',
          conflictType: 'outline_deleted',
          outlineChange: 'Deleted',
          affectedDraftPreview: 'Preview of the draft content.'
        }
      ],
      summary: '1 deleted'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('**Affected Draft Content Preview:**');
    expect(result).toContain('```');
    expect(result).toContain('Preview of the draft content.');
  });

  it('should include reconciliation guidance', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Section',
          conflictType: 'outline_modified',
          outlineChange: 'Changed',
          affectedDraftPreview: 'Content.'
        }
      ],
      summary: '1 conflict'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('Please help the user reconcile these conflicts');
    expect(result).toContain('draft content should be updated');
    expect(result).toContain('preserve valuable content');
  });

  it('should format multiple conflicts correctly', () => {
    const report: ConflictReport = {
      hasConflicts: true,
      conflicts: [
        {
          sectionId: '1',
          sectionTitle: 'Section A',
          conflictType: 'outline_deleted',
          outlineChange: 'Deleted',
          affectedDraftPreview: 'Content A.'
        },
        {
          sectionId: '2',
          sectionTitle: 'Section B',
          conflictType: 'outline_modified',
          outlineChange: 'Modified',
          affectedDraftPreview: 'Content B.'
        },
        {
          sectionId: '3',
          sectionTitle: 'Section C',
          conflictType: 'outline_reordered',
          outlineChange: 'Reordered',
          affectedDraftPreview: 'Content C.'
        }
      ],
      summary: '3 conflicts'
    };

    const result = formatConflictsForPrompt(report);

    expect(result).toContain('### Section A');
    expect(result).toContain('### Section B');
    expect(result).toContain('### Section C');
    expect(result).toContain('Section Deleted');
    expect(result).toContain('Section Modified');
    expect(result).toContain('Section Reordered');
  });
});
