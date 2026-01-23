/**
 * Conflict detection for outline vs draft content
 *
 * Detects when outline changes conflict with already-drafted content,
 * helping users reconcile stale drafts after outline modifications.
 */

import type { OutlinePrompt } from '$lib/types/sidecar';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DraftSection {
  outlineSectionId: string; // Which outline section this draft corresponds to
  outlineSectionTitle: string;
  content: string; // The drafted content
  startLine: number;
  endLine: number;
}

export interface OutlineDraftConflict {
  sectionId: string;
  sectionTitle: string;
  conflictType: 'outline_modified' | 'outline_deleted' | 'outline_reordered';
  outlineChange: string; // Description of what changed in outline
  affectedDraftPreview: string; // First ~200 chars of affected draft content
}

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: OutlineDraftConflict[];
  summary: string; // Human-readable summary for the prompt
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a title for comparison (lowercase, trim, remove extra whitespace)
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two titles are similar enough to be considered a match
 * Uses simple heuristics: exact match after normalization, or high overlap
 */
function titlesMatch(title1: string, title2: string): boolean {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // One contains the other (for partial matches)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  return false;
}

/**
 * Extract sections from draft markdown content
 * Looks for ## headers and extracts content until next header or end
 */
function extractDraftSections(draftContent: string): DraftSection[] {
  const sections: DraftSection[] = [];
  const lines = draftContent.split('\n');

  let currentSection: Partial<DraftSection> | null = null;
  let currentContent: string[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if exists
      if (currentSection && currentSection.outlineSectionTitle) {
        sections.push({
          outlineSectionId: currentSection.outlineSectionId || '',
          outlineSectionTitle: currentSection.outlineSectionTitle,
          content: currentContent.join('\n').trim(),
          startLine,
          endLine: i - 1,
        });
      }

      // Start new section
      currentSection = {
        outlineSectionTitle: headerMatch[1].trim(),
        outlineSectionId: '', // Will be matched later
      };
      currentContent = [];
      startLine = i;
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection && currentSection.outlineSectionTitle) {
    sections.push({
      outlineSectionId: currentSection.outlineSectionId || '',
      outlineSectionTitle: currentSection.outlineSectionTitle,
      content: currentContent.join('\n').trim(),
      startLine,
      endLine: lines.length - 1,
    });
  }

  return sections;
}

/**
 * Match draft sections to outline prompts by title similarity
 */
function matchDraftToOutline(
  draftSections: DraftSection[],
  outline: OutlinePrompt[]
): Map<string, DraftSection> {
  const matched = new Map<string, DraftSection>();

  for (const section of draftSections) {
    for (const prompt of outline) {
      if (titlesMatch(section.outlineSectionTitle, prompt.title)) {
        matched.set(prompt.id, {
          ...section,
          outlineSectionId: prompt.id,
        });
        break;
      }
    }
  }

  return matched;
}

/**
 * Create a preview of draft content (first ~200 chars)
 */
function createPreview(content: string, maxLength: number = 200): string {
  const cleaned = content.trim();
  if (cleaned.length <= maxLength) return cleaned;

  // Try to break at a word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Check if an outline section was meaningfully modified
 * (not just whitespace or trivial changes)
 */
function sectionMeaningfullyChanged(
  prev: OutlinePrompt,
  curr: OutlinePrompt
): { changed: boolean; description: string } {
  const changes: string[] = [];

  if (normalizeTitle(prev.title) !== normalizeTitle(curr.title)) {
    changes.push(`title changed from "${prev.title}" to "${curr.title}"`);
  }

  if (normalizeTitle(prev.description) !== normalizeTitle(curr.description)) {
    // Only flag if description changed substantially
    const prevLen = prev.description.length;
    const currLen = curr.description.length;
    const lenDiff = Math.abs(prevLen - currLen);

    if (lenDiff > 50 || lenDiff / Math.max(prevLen, currLen, 1) > 0.2) {
      changes.push('description significantly modified');
    }
  }

  if (prev.estimatedWords !== curr.estimatedWords) {
    changes.push(
      `word count estimate changed from ${prev.estimatedWords ?? 'unset'} to ${curr.estimatedWords ?? 'unset'}`
    );
  }

  return {
    changed: changes.length > 0,
    description: changes.join('; '),
  };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect conflicts between outline changes and existing draft content
 *
 * @param previousOutline - The outline state before changes
 * @param currentOutline - The outline state after changes
 * @param draftContent - The current draft markdown content
 * @returns ConflictReport with any detected conflicts
 */
export function detectOutlineDraftConflicts(
  previousOutline: OutlinePrompt[],
  currentOutline: OutlinePrompt[],
  draftContent: string
): ConflictReport {
  const conflicts: OutlineDraftConflict[] = [];

  // If no draft content, no conflicts possible
  if (!draftContent.trim()) {
    return {
      hasConflicts: false,
      conflicts: [],
      summary: 'No draft content to check for conflicts.',
    };
  }

  // Extract sections from draft
  const draftSections = extractDraftSections(draftContent);

  if (draftSections.length === 0) {
    return {
      hasConflicts: false,
      conflicts: [],
      summary: 'No recognizable sections found in draft content.',
    };
  }

  // Match draft sections to previous outline
  const draftToOutlineMap = matchDraftToOutline(draftSections, previousOutline);

  // Create lookup maps
  const prevOutlineById = new Map(previousOutline.map((p) => [p.id, p]));
  const currOutlineById = new Map(currentOutline.map((p) => [p.id, p]));
  const prevOutlineOrder = new Map(previousOutline.map((p, i) => [p.id, i]));
  const currOutlineOrder = new Map(currentOutline.map((p, i) => [p.id, i]));

  // Check each drafted section for conflicts
  for (const [outlineId, draftSection] of draftToOutlineMap) {
    const prevPrompt = prevOutlineById.get(outlineId);
    const currPrompt = currOutlineById.get(outlineId);

    if (!prevPrompt) continue; // Shouldn't happen, but be safe

    // Check if section was deleted
    if (!currPrompt) {
      conflicts.push({
        sectionId: outlineId,
        sectionTitle: prevPrompt.title,
        conflictType: 'outline_deleted',
        outlineChange: `Section "${prevPrompt.title}" was removed from the outline`,
        affectedDraftPreview: createPreview(draftSection.content),
      });
      continue;
    }

    // Check if section was meaningfully modified
    const modification = sectionMeaningfullyChanged(prevPrompt, currPrompt);
    if (modification.changed) {
      conflicts.push({
        sectionId: outlineId,
        sectionTitle: currPrompt.title,
        conflictType: 'outline_modified',
        outlineChange: modification.description,
        affectedDraftPreview: createPreview(draftSection.content),
      });
    }

    // Check if section was reordered significantly
    const prevOrder = prevOutlineOrder.get(outlineId);
    const currOrder = currOutlineOrder.get(outlineId);

    if (prevOrder !== undefined && currOrder !== undefined) {
      const orderDiff = Math.abs(prevOrder - currOrder);
      // Only flag significant reordering (moved by 2+ positions)
      if (orderDiff >= 2) {
        conflicts.push({
          sectionId: outlineId,
          sectionTitle: currPrompt.title,
          conflictType: 'outline_reordered',
          outlineChange: `Section moved from position ${prevOrder + 1} to position ${currOrder + 1}`,
          affectedDraftPreview: createPreview(draftSection.content),
        });
      }
    }
  }

  // Generate summary
  let summary: string;
  if (conflicts.length === 0) {
    summary = 'No conflicts detected between outline changes and draft content.';
  } else {
    const deleted = conflicts.filter((c) => c.conflictType === 'outline_deleted').length;
    const modified = conflicts.filter((c) => c.conflictType === 'outline_modified').length;
    const reordered = conflicts.filter((c) => c.conflictType === 'outline_reordered').length;

    const parts: string[] = [];
    if (deleted > 0) parts.push(`${deleted} deleted`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (reordered > 0) parts.push(`${reordered} reordered`);

    summary =
      `Found ${conflicts.length} conflict(s): ${parts.join(', ')}. ` +
      'Draft content may need to be updated to match the new outline.';
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary,
  };
}

// ============================================================================
// Prompt Formatting
// ============================================================================

/**
 * Format a conflict report as markdown for injection into a system prompt
 *
 * @param report - The conflict report to format
 * @returns Markdown-formatted text explaining conflicts
 */
export function formatConflictsForPrompt(report: ConflictReport): string {
  if (!report.hasConflicts) {
    return '';
  }

  const lines: string[] = [
    '## Outline-Draft Conflicts Detected',
    '',
    report.summary,
    '',
    'The following sections have potential conflicts that may need reconciliation:',
    '',
  ];

  for (const conflict of report.conflicts) {
    lines.push(`### ${conflict.sectionTitle}`);
    lines.push('');

    switch (conflict.conflictType) {
      case 'outline_deleted':
        lines.push('**Conflict Type:** Section Deleted');
        lines.push('');
        lines.push('This section was removed from the outline, but draft content still exists.');
        break;
      case 'outline_modified':
        lines.push('**Conflict Type:** Section Modified');
        lines.push('');
        lines.push(`**Changes:** ${conflict.outlineChange}`);
        break;
      case 'outline_reordered':
        lines.push('**Conflict Type:** Section Reordered');
        lines.push('');
        lines.push(`**Changes:** ${conflict.outlineChange}`);
        break;
    }

    lines.push('');
    lines.push('**Affected Draft Content Preview:**');
    lines.push('```');
    lines.push(conflict.affectedDraftPreview);
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('Please help the user reconcile these conflicts. Consider:');
  lines.push('- Whether the existing draft content should be updated to match the new outline');
  lines.push('- Whether any drafted content should be moved, merged, or removed');
  lines.push('- How to preserve valuable content while aligning with the updated structure');

  return lines.join('\n');
}
