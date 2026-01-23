/**
 * Diff utilities for computing human-readable diffs between document versions.
 * Used to show Claude what changes the user made manually.
 */

import type { OutlinePrompt } from '$lib/types/sidecar';

// ============================================================================
// Types
// ============================================================================

export interface ContentDiff {
  hasChanges: boolean;
  summary: string; // Human-readable summary like "Added 2 paragraphs, deleted 1 sentence"
  addedLines: number;
  removedLines: number;
  addedWords: number;
  removedWords: number;
  // A concise diff representation for the prompt (not full unified diff)
  diffText: string; // Shows key changes, truncated if too long
}

export interface OutlineDiff {
  hasChanges: boolean;
  summary: string; // e.g., "Section 2 title changed, Section 5 added"
  addedSections: string[]; // Titles of added sections
  removedSections: string[]; // Titles of removed sections
  modifiedSections: Array<{
    title: string;
    changes: string; // What changed about this section
  }>;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Count words in a string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into lines, normalizing line endings
 */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Create a simple line diff showing added and removed lines
 */
function createLineDiff(
  previousLines: string[],
  currentLines: string[]
): { added: string[]; removed: string[]; addedLines: number; removedLines: number } {
  const previousSet = new Set(previousLines);
  const currentSet = new Set(currentLines);

  const added: string[] = [];
  const removed: string[] = [];

  // Find removed lines (in previous but not in current)
  for (const line of previousLines) {
    if (!currentSet.has(line) && line.trim()) {
      removed.push(line);
    }
  }

  // Find added lines (in current but not in previous)
  for (const line of currentLines) {
    if (!previousSet.has(line) && line.trim()) {
      added.push(line);
    }
  }

  return {
    added,
    removed,
    addedLines: added.length,
    removedLines: removed.length,
  };
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a number with a label, handling pluralization
 */
function formatCount(count: number, singular: string, plural: string): string {
  return count + ' ' + (count === 1 ? singular : plural);
}

// ============================================================================
// Main functions
// ============================================================================

/**
 * Compute a human-readable diff between two versions of content.
 * Uses simple line-by-line comparison.
 */
export function computeContentDiff(previous: string, current: string): ContentDiff {
  // Handle edge cases
  if (previous === current) {
    return {
      hasChanges: false,
      summary: 'No changes',
      addedLines: 0,
      removedLines: 0,
      addedWords: 0,
      removedWords: 0,
      diffText: '',
    };
  }

  const previousLines = splitLines(previous);
  const currentLines = splitLines(current);
  const lineDiff = createLineDiff(previousLines, currentLines);

  // Calculate word counts
  const previousWords = countWords(previous);
  const currentWords = countWords(current);
  const addedWords = Math.max(0, currentWords - previousWords);
  const removedWords = Math.max(0, previousWords - currentWords);

  // Build summary
  const summaryParts: string[] = [];

  if (lineDiff.addedLines > 0) {
    summaryParts.push('added ' + formatCount(lineDiff.addedLines, 'line', 'lines'));
  }
  if (lineDiff.removedLines > 0) {
    summaryParts.push('removed ' + formatCount(lineDiff.removedLines, 'line', 'lines'));
  }
  if (addedWords > 0 && lineDiff.addedLines === 0) {
    summaryParts.push('added ' + formatCount(addedWords, 'word', 'words'));
  }
  if (removedWords > 0 && lineDiff.removedLines === 0) {
    summaryParts.push('removed ' + formatCount(removedWords, 'word', 'words'));
  }

  // If no line changes but content differs (e.g., word changes within lines)
  if (summaryParts.length === 0) {
    const netChange = currentWords - previousWords;
    if (netChange > 0) {
      summaryParts.push('added ' + formatCount(netChange, 'word', 'words'));
    } else if (netChange < 0) {
      summaryParts.push('removed ' + formatCount(Math.abs(netChange), 'word', 'words'));
    } else {
      summaryParts.push('content modified');
    }
  }

  const summary = summaryParts.join(', ');

  // Build diffText showing key changes
  const diffParts: string[] = [];

  // Show a sample of removed lines
  if (lineDiff.removed.length > 0) {
    const samplesToShow = Math.min(3, lineDiff.removed.length);
    diffParts.push('Removed:');
    for (let i = 0; i < samplesToShow; i++) {
      diffParts.push('- ' + truncate(lineDiff.removed[i], 80));
    }
    if (lineDiff.removed.length > samplesToShow) {
      diffParts.push('  ... and ' + (lineDiff.removed.length - samplesToShow) + ' more lines');
    }
  }

  // Show a sample of added lines
  if (lineDiff.added.length > 0) {
    if (diffParts.length > 0) diffParts.push('');
    diffParts.push('Added:');
    const samplesToShow = Math.min(3, lineDiff.added.length);
    for (let i = 0; i < samplesToShow; i++) {
      diffParts.push('+ ' + truncate(lineDiff.added[i], 80));
    }
    if (lineDiff.added.length > samplesToShow) {
      diffParts.push('  ... and ' + (lineDiff.added.length - samplesToShow) + ' more lines');
    }
  }

  let diffText = diffParts.join('\n');

  // Truncate overall diffText if too long
  if (diffText.length > 500) {
    diffText = truncate(diffText, 500);
  }

  return {
    hasChanges: true,
    summary,
    addedLines: lineDiff.addedLines,
    removedLines: lineDiff.removedLines,
    addedWords,
    removedWords,
    diffText,
  };
}

/**
 * Compute a diff between two versions of an outline.
 */
export function computeOutlineDiff(
  previous: OutlinePrompt[] | null,
  current: OutlinePrompt[] | null
): OutlineDiff {
  // Handle null cases
  if (!previous && !current) {
    return {
      hasChanges: false,
      summary: 'No outline',
      addedSections: [],
      removedSections: [],
      modifiedSections: [],
    };
  }

  if (!previous && current) {
    return {
      hasChanges: true,
      summary: 'Outline created with ' + formatCount(current.length, 'section', 'sections'),
      addedSections: current.map((s) => s.title),
      removedSections: [],
      modifiedSections: [],
    };
  }

  if (previous && !current) {
    return {
      hasChanges: true,
      summary: 'Outline removed',
      addedSections: [],
      removedSections: previous.map((s) => s.title),
      modifiedSections: [],
    };
  }

  // Both exist, compare them
  const prev = previous!;
  const curr = current!;

  // Build maps by ID for comparison
  const prevById = new Map(prev.map((s) => [s.id, s]));
  const currById = new Map(curr.map((s) => [s.id, s]));

  const addedSections: string[] = [];
  const removedSections: string[] = [];
  const modifiedSections: Array<{ title: string; changes: string }> = [];

  // Find removed sections
  for (const section of prev) {
    if (!currById.has(section.id)) {
      removedSections.push(section.title);
    }
  }

  // Find added and modified sections
  for (const section of curr) {
    const prevSection = prevById.get(section.id);
    if (!prevSection) {
      addedSections.push(section.title);
    } else {
      // Check for modifications
      const changes: string[] = [];

      if (prevSection.title !== section.title) {
        changes.push(
          'title changed from "' +
            truncate(prevSection.title, 30) +
            '" to "' +
            truncate(section.title, 30) +
            '"'
        );
      }
      if (prevSection.description !== section.description) {
        changes.push('description updated');
      }
      if (prevSection.estimatedWords !== section.estimatedWords) {
        const prevEst = prevSection.estimatedWords ?? 'none';
        const currEst = section.estimatedWords ?? 'none';
        changes.push('word estimate changed from ' + prevEst + ' to ' + currEst);
      }

      if (changes.length > 0) {
        modifiedSections.push({
          title: section.title,
          changes: changes.join(', '),
        });
      }
    }
  }

  // Check for reordering
  let reordered = false;
  if (addedSections.length === 0 && removedSections.length === 0) {
    const prevOrder = prev.map((s) => s.id).join(',');
    const currOrder = curr.map((s) => s.id).join(',');
    if (prevOrder !== currOrder) {
      reordered = true;
    }
  }

  const hasChanges =
    addedSections.length > 0 ||
    removedSections.length > 0 ||
    modifiedSections.length > 0 ||
    reordered;

  // Build summary
  const summaryParts: string[] = [];

  if (addedSections.length > 0) {
    summaryParts.push(formatCount(addedSections.length, 'section', 'sections') + ' added');
  }
  if (removedSections.length > 0) {
    summaryParts.push(formatCount(removedSections.length, 'section', 'sections') + ' removed');
  }
  if (modifiedSections.length > 0) {
    summaryParts.push(formatCount(modifiedSections.length, 'section', 'sections') + ' modified');
  }
  if (reordered && summaryParts.length === 0) {
    summaryParts.push('sections reordered');
  }

  const summary = hasChanges ? summaryParts.join(', ') : 'No changes';

  return {
    hasChanges,
    summary,
    addedSections,
    removedSections,
    modifiedSections,
  };
}

/**
 * Format all changes into a markdown string suitable for injection into the system prompt.
 */
export function formatChangesForPrompt(
  contentDiff: ContentDiff | null,
  outlineDiff: OutlineDiff | null,
  stageChange: { from: string; to: string } | null
): string {
  const sections: string[] = [];

  // Check if there are any changes at all
  const hasContentChanges = contentDiff?.hasChanges ?? false;
  const hasOutlineChanges = outlineDiff?.hasChanges ?? false;
  const hasStageChange = stageChange !== null;

  if (!hasContentChanges && !hasOutlineChanges && !hasStageChange) {
    return '';
  }

  sections.push('## User Changes Since Last Response\n');
  sections.push('The user has made the following manual changes:\n');

  // Stage change
  if (stageChange) {
    sections.push('### Stage Change');
    sections.push(
      'Document stage changed from **' + stageChange.from + '** to **' + stageChange.to + '**.\n'
    );
  }

  // Content changes
  if (contentDiff?.hasChanges) {
    sections.push('### Content Changes');
    sections.push('**Summary:** ' + contentDiff.summary);
    if (contentDiff.diffText) {
      sections.push('\n```diff');
      sections.push(contentDiff.diffText);
      sections.push('```\n');
    }
  }

  // Outline changes
  if (outlineDiff?.hasChanges) {
    sections.push('### Outline Changes');
    sections.push('**Summary:** ' + outlineDiff.summary);

    if (outlineDiff.addedSections.length > 0) {
      sections.push('\n**Added sections:**');
      for (const title of outlineDiff.addedSections) {
        sections.push('- ' + title);
      }
    }

    if (outlineDiff.removedSections.length > 0) {
      sections.push('\n**Removed sections:**');
      for (const title of outlineDiff.removedSections) {
        sections.push('- ' + title);
      }
    }

    if (outlineDiff.modifiedSections.length > 0) {
      sections.push('\n**Modified sections:**');
      for (const mod of outlineDiff.modifiedSections) {
        sections.push('- **' + mod.title + ':** ' + mod.changes);
      }
    }
    sections.push('');
  }

  return sections.join('\n');
}
