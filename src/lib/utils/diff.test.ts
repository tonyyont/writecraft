import { describe, it, expect } from 'vitest';
import {
  computeContentDiff,
  computeOutlineDiff,
  formatChangesForPrompt,
  type ContentDiff,
  type OutlineDiff,
} from './diff';
import type { OutlinePrompt } from '$lib/types/sidecar';

// ============================================================================
// computeContentDiff Tests
// ============================================================================

describe('computeContentDiff', () => {
  describe('edge cases', () => {
    it('should return no changes when content is identical', () => {
      const content = 'Hello, world!\nThis is a test.';
      const result = computeContentDiff(content, content);

      expect(result.hasChanges).toBe(false);
      expect(result.summary).toBe('No changes');
      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(0);
      expect(result.addedWords).toBe(0);
      expect(result.removedWords).toBe(0);
      expect(result.diffText).toBe('');
    });

    it('should handle empty strings', () => {
      const result = computeContentDiff('', '');
      expect(result.hasChanges).toBe(false);
    });

    it('should handle empty to content transition', () => {
      const result = computeContentDiff('', 'New content here');
      expect(result.hasChanges).toBe(true);
      expect(result.addedLines).toBe(1);
      expect(result.addedWords).toBe(3);
    });

    it('should handle content to empty transition', () => {
      const result = computeContentDiff('Content to remove', '');
      expect(result.hasChanges).toBe(true);
      expect(result.removedLines).toBe(1);
      expect(result.removedWords).toBe(3);
    });
  });

  describe('line changes', () => {
    it('should detect added lines', () => {
      const previous = 'Line 1\nLine 2';
      const current = 'Line 1\nLine 2\nLine 3\nLine 4';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.addedLines).toBe(2);
      expect(result.summary).toContain('added 2 lines');
    });

    it('should detect removed lines', () => {
      const previous = 'Line 1\nLine 2\nLine 3';
      const current = 'Line 1';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.removedLines).toBe(2);
      expect(result.summary).toContain('removed 2 lines');
    });

    it('should detect both added and removed lines', () => {
      const previous = 'Line A\nLine B';
      const current = 'Line C\nLine D';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.addedLines).toBe(2);
      expect(result.removedLines).toBe(2);
      expect(result.summary).toContain('added 2 lines');
      expect(result.summary).toContain('removed 2 lines');
    });

    it('should use singular form for single line', () => {
      const previous = 'Line 1';
      const current = 'Line 1\nLine 2';
      const result = computeContentDiff(previous, current);

      expect(result.summary).toContain('added 1 line');
    });
  });

  describe('word changes', () => {
    it('should count added words when words increase', () => {
      const previous = 'Hello world';
      const current = 'Hello beautiful world today';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.addedWords).toBe(2);
    });

    it('should count removed words when words decrease', () => {
      const previous = 'Hello beautiful wonderful world';
      const current = 'Hello world';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.removedWords).toBe(2);
    });

    it('should report word changes when lines stay the same but content differs', () => {
      // Modify words within a single line - both lines are treated as changed
      // because the set-based comparison sees them as different lines
      const previous = 'The quick brown fox';
      const current = 'The slow brown fox';
      const result = computeContentDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      // Both lines are "changed" as sets work on exact matches
      // So we get both a removed line and an added line
      expect(result.addedLines).toBe(1);
      expect(result.removedLines).toBe(1);
    });
  });

  describe('diffText generation', () => {
    it('should include sample of removed lines in diffText', () => {
      const previous = 'Line to remove\nAnother line';
      const current = 'Another line';
      const result = computeContentDiff(previous, current);

      expect(result.diffText).toContain('Removed:');
      expect(result.diffText).toContain('- Line to remove');
    });

    it('should include sample of added lines in diffText', () => {
      const previous = 'Existing line';
      const current = 'Existing line\nNew line added';
      const result = computeContentDiff(previous, current);

      expect(result.diffText).toContain('Added:');
      expect(result.diffText).toContain('+ New line added');
    });

    it('should truncate long lines in diffText', () => {
      const longLine = 'A'.repeat(100);
      const previous = 'Short line';
      const current = longLine;
      const result = computeContentDiff(previous, current);

      expect(result.diffText).toContain('...');
    });

    it('should show only first 3 samples when many lines change', () => {
      const previous = Array.from({ length: 10 }, (_, i) => `Old line ${i}`).join('\n');
      const current = Array.from({ length: 10 }, (_, i) => `New line ${i}`).join('\n');
      const result = computeContentDiff(previous, current);

      expect(result.diffText).toContain('... and 7 more lines');
    });

    it('should truncate diffText if too long', () => {
      const previous = Array.from({ length: 50 }, (_, i) => `Old line ${i} with some content`).join(
        '\n'
      );
      const current = Array.from(
        { length: 50 },
        (_, i) => `New line ${i} with different content`
      ).join('\n');
      const result = computeContentDiff(previous, current);

      expect(result.diffText.length).toBeLessThanOrEqual(500);
    });
  });

  describe('line ending normalization', () => {
    it('should correctly split lines with Windows line endings (CRLF)', () => {
      // The implementation splits by \r?\n, which normalizes CRLF to just split points
      // However, direct string comparison (previous === current) happens first
      // So CRLF vs LF will be detected as changes
      const previous = 'Line 1\r\nLine 2';
      const current = 'Line 1\nLine 2';
      const result = computeContentDiff(previous, current);

      // Strings are not identical, so hasChanges is true
      expect(result.hasChanges).toBe(true);
      // But after line splitting and set comparison, the lines themselves match
      // Word counts are the same
      expect(result.addedWords).toBe(0);
      expect(result.removedWords).toBe(0);
    });

    it('should correctly split lines with mixed line endings', () => {
      const previous = 'Line 1\r\nLine 2\nLine 3';
      const current = 'Line 1\nLine 2\nLine 3';
      const result = computeContentDiff(previous, current);

      // Strings are not identical due to \r\n vs \n
      expect(result.hasChanges).toBe(true);
      // Word counts should be the same
      expect(result.addedWords).toBe(0);
      expect(result.removedWords).toBe(0);
    });
  });
});

// ============================================================================
// computeOutlineDiff Tests
// ============================================================================

describe('computeOutlineDiff', () => {
  // Helper to create outline prompts
  const createOutlinePrompt = (
    id: string,
    title: string,
    description: string = '',
    estimatedWords: number | null = null
  ): OutlinePrompt => ({
    id,
    title,
    description,
    estimatedWords,
  });

  describe('null handling', () => {
    it('should handle both null outlines', () => {
      const result = computeOutlineDiff(null, null);

      expect(result.hasChanges).toBe(false);
      expect(result.summary).toBe('No outline');
      expect(result.addedSections).toHaveLength(0);
      expect(result.removedSections).toHaveLength(0);
      expect(result.modifiedSections).toHaveLength(0);
    });

    it('should detect outline creation', () => {
      const current = [
        createOutlinePrompt('1', 'Introduction'),
        createOutlinePrompt('2', 'Body'),
        createOutlinePrompt('3', 'Conclusion'),
      ];
      const result = computeOutlineDiff(null, current);

      expect(result.hasChanges).toBe(true);
      expect(result.summary).toBe('Outline created with 3 sections');
      expect(result.addedSections).toEqual(['Introduction', 'Body', 'Conclusion']);
    });

    it('should use singular for single section creation', () => {
      const current = [createOutlinePrompt('1', 'Only Section')];
      const result = computeOutlineDiff(null, current);

      expect(result.summary).toBe('Outline created with 1 section');
    });

    it('should detect outline removal', () => {
      const previous = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
      ];
      const result = computeOutlineDiff(previous, null);

      expect(result.hasChanges).toBe(true);
      expect(result.summary).toBe('Outline removed');
      expect(result.removedSections).toEqual(['Section A', 'Section B']);
    });
  });

  describe('section addition and removal', () => {
    it('should detect added sections', () => {
      const previous = [createOutlinePrompt('1', 'Section 1')];
      const current = [
        createOutlinePrompt('1', 'Section 1'),
        createOutlinePrompt('2', 'Section 2'),
        createOutlinePrompt('3', 'Section 3'),
      ];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.addedSections).toEqual(['Section 2', 'Section 3']);
      expect(result.summary).toContain('2 sections added');
    });

    it('should detect removed sections', () => {
      const previous = [
        createOutlinePrompt('1', 'Section 1'),
        createOutlinePrompt('2', 'Section 2'),
        createOutlinePrompt('3', 'Section 3'),
      ];
      const current = [createOutlinePrompt('1', 'Section 1')];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.removedSections).toEqual(['Section 2', 'Section 3']);
      expect(result.summary).toContain('2 sections removed');
    });

    it('should detect both added and removed sections', () => {
      const previous = [
        createOutlinePrompt('1', 'Old Section 1'),
        createOutlinePrompt('2', 'Old Section 2'),
      ];
      const current = [
        createOutlinePrompt('1', 'Old Section 1'),
        createOutlinePrompt('3', 'New Section 3'),
      ];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.addedSections).toEqual(['New Section 3']);
      expect(result.removedSections).toEqual(['Old Section 2']);
    });
  });

  describe('section modifications', () => {
    it('should detect title changes', () => {
      const previous = [createOutlinePrompt('1', 'Original Title')];
      const current = [createOutlinePrompt('1', 'Updated Title')];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedSections).toHaveLength(1);
      expect(result.modifiedSections[0].title).toBe('Updated Title');
      expect(result.modifiedSections[0].changes).toContain('title changed');
    });

    it('should detect description changes', () => {
      const previous = [createOutlinePrompt('1', 'Section', 'Old description')];
      const current = [createOutlinePrompt('1', 'Section', 'New description')];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedSections[0].changes).toContain('description updated');
    });

    it('should detect estimated words changes', () => {
      const previous = [createOutlinePrompt('1', 'Section', '', 500)];
      const current = [createOutlinePrompt('1', 'Section', '', 1000)];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedSections[0].changes).toContain('word estimate changed');
      expect(result.modifiedSections[0].changes).toContain('500');
      expect(result.modifiedSections[0].changes).toContain('1000');
    });

    it('should handle undefined estimated words', () => {
      const previous = [createOutlinePrompt('1', 'Section', '')];
      const current = [createOutlinePrompt('1', 'Section', '', 500)];
      const result = computeOutlineDiff(previous, current);

      expect(result.modifiedSections[0].changes).toContain('none');
      expect(result.modifiedSections[0].changes).toContain('500');
    });

    it('should detect multiple changes in one section', () => {
      const previous = [createOutlinePrompt('1', 'Old Title', 'Old desc', 100)];
      const current = [createOutlinePrompt('1', 'New Title', 'New desc', 200)];
      const result = computeOutlineDiff(previous, current);

      expect(result.modifiedSections[0].changes).toContain('title changed');
      expect(result.modifiedSections[0].changes).toContain('description updated');
      expect(result.modifiedSections[0].changes).toContain('word estimate changed');
    });
  });

  describe('section reordering', () => {
    it('should detect reordering when no sections added or removed', () => {
      const previous = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
        createOutlinePrompt('3', 'Section C'),
      ];
      const current = [
        createOutlinePrompt('3', 'Section C'),
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
      ];
      const result = computeOutlineDiff(previous, current);

      expect(result.hasChanges).toBe(true);
      expect(result.summary).toBe('sections reordered');
    });

    it('should not report reordering when sections are added', () => {
      const previous = [
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('2', 'Section B'),
      ];
      const current = [
        createOutlinePrompt('2', 'Section B'),
        createOutlinePrompt('1', 'Section A'),
        createOutlinePrompt('3', 'Section C'),
      ];
      const result = computeOutlineDiff(previous, current);

      expect(result.summary).not.toContain('reordered');
      expect(result.summary).toContain('added');
    });
  });

  describe('no changes', () => {
    it('should detect no changes when outlines are identical', () => {
      const outline = [
        createOutlinePrompt('1', 'Section 1', 'Desc 1', 500),
        createOutlinePrompt('2', 'Section 2', 'Desc 2', 300),
      ];
      const result = computeOutlineDiff(outline, [...outline]);

      expect(result.hasChanges).toBe(false);
      expect(result.summary).toBe('No changes');
    });
  });

  describe('title truncation', () => {
    it('should truncate long titles in change descriptions', () => {
      const longTitle = 'A'.repeat(50);
      const previous = [createOutlinePrompt('1', longTitle)];
      const current = [createOutlinePrompt('1', 'Short title')];
      const result = computeOutlineDiff(previous, current);

      expect(result.modifiedSections[0].changes).toContain('...');
    });
  });
});

// ============================================================================
// formatChangesForPrompt Tests
// ============================================================================

describe('formatChangesForPrompt', () => {
  it('should return empty string when no changes', () => {
    const contentDiff: ContentDiff = {
      hasChanges: false,
      summary: 'No changes',
      addedLines: 0,
      removedLines: 0,
      addedWords: 0,
      removedWords: 0,
      diffText: '',
    };
    const outlineDiff: OutlineDiff = {
      hasChanges: false,
      summary: 'No changes',
      addedSections: [],
      removedSections: [],
      modifiedSections: [],
    };

    const result = formatChangesForPrompt(contentDiff, outlineDiff, null);
    expect(result).toBe('');
  });

  it('should include header when there are changes', () => {
    const contentDiff: ContentDiff = {
      hasChanges: true,
      summary: 'added 1 line',
      addedLines: 1,
      removedLines: 0,
      addedWords: 5,
      removedWords: 0,
      diffText: 'Added:\n+ New line',
    };

    const result = formatChangesForPrompt(contentDiff, null, null);
    expect(result).toContain('## User Changes Since Last Response');
    expect(result).toContain('The user has made the following manual changes:');
  });

  it('should format stage changes', () => {
    const result = formatChangesForPrompt(null, null, { from: 'brainstorm', to: 'outline' });

    expect(result).toContain('### Stage Change');
    expect(result).toContain('**brainstorm**');
    expect(result).toContain('**outline**');
  });

  it('should format content changes with diff code block', () => {
    const contentDiff: ContentDiff = {
      hasChanges: true,
      summary: 'added 2 lines',
      addedLines: 2,
      removedLines: 0,
      addedWords: 10,
      removedWords: 0,
      diffText: 'Added:\n+ First new line\n+ Second new line',
    };

    const result = formatChangesForPrompt(contentDiff, null, null);
    expect(result).toContain('### Content Changes');
    expect(result).toContain('**Summary:** added 2 lines');
    expect(result).toContain('```diff');
    expect(result).toContain('+ First new line');
    expect(result).toContain('```');
  });

  it('should format outline changes with added sections', () => {
    const outlineDiff: OutlineDiff = {
      hasChanges: true,
      summary: '2 sections added',
      addedSections: ['New Section A', 'New Section B'],
      removedSections: [],
      modifiedSections: [],
    };

    const result = formatChangesForPrompt(null, outlineDiff, null);
    expect(result).toContain('### Outline Changes');
    expect(result).toContain('**Added sections:**');
    expect(result).toContain('- New Section A');
    expect(result).toContain('- New Section B');
  });

  it('should format outline changes with removed sections', () => {
    const outlineDiff: OutlineDiff = {
      hasChanges: true,
      summary: '1 section removed',
      addedSections: [],
      removedSections: ['Removed Section'],
      modifiedSections: [],
    };

    const result = formatChangesForPrompt(null, outlineDiff, null);
    expect(result).toContain('**Removed sections:**');
    expect(result).toContain('- Removed Section');
  });

  it('should format outline changes with modified sections', () => {
    const outlineDiff: OutlineDiff = {
      hasChanges: true,
      summary: '1 section modified',
      addedSections: [],
      removedSections: [],
      modifiedSections: [
        { title: 'Modified Section', changes: 'title changed, description updated' },
      ],
    };

    const result = formatChangesForPrompt(null, outlineDiff, null);
    expect(result).toContain('**Modified sections:**');
    expect(result).toContain('**Modified Section:**');
    expect(result).toContain('title changed, description updated');
  });

  it('should include all types of changes in one output', () => {
    const contentDiff: ContentDiff = {
      hasChanges: true,
      summary: 'added 1 line',
      addedLines: 1,
      removedLines: 0,
      addedWords: 5,
      removedWords: 0,
      diffText: '+ New content',
    };
    const outlineDiff: OutlineDiff = {
      hasChanges: true,
      summary: '1 section added',
      addedSections: ['New Section'],
      removedSections: [],
      modifiedSections: [],
    };
    const stageChange = { from: 'draft', to: 'polish' };

    const result = formatChangesForPrompt(contentDiff, outlineDiff, stageChange);

    expect(result).toContain('### Stage Change');
    expect(result).toContain('### Content Changes');
    expect(result).toContain('### Outline Changes');
  });

  it('should handle null diffs gracefully', () => {
    const result = formatChangesForPrompt(null, null, { from: 'a', to: 'b' });
    expect(result).toContain('### Stage Change');
    expect(result).not.toContain('### Content Changes');
    expect(result).not.toContain('### Outline Changes');
  });
});
