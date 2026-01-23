/**
 * Text utility functions for common string operations
 */

/**
 * Count the number of words in a string
 * @param text - The text to count words in
 * @returns The number of words
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns The truncated text
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Create a preview of text content, truncating and normalizing whitespace
 * @param content - The content to create a preview from
 * @param maxLength - Maximum length of the preview (default: 200)
 * @returns A normalized preview string
 */
export function createPreview(content: string, maxLength = 200): string {
  // Normalize whitespace and trim
  const normalized = content.replace(/\s+/g, ' ').trim();
  return truncate(normalized, maxLength);
}

/**
 * Normalize whitespace in text (collapse multiple spaces/newlines into single spaces)
 * @param text - The text to normalize
 * @returns The normalized text
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Check if a string is empty or contains only whitespace
 * @param text - The text to check
 * @returns true if the string is empty or whitespace-only
 */
export function isBlank(text: string | null | undefined): boolean {
  return !text || !text.trim();
}

/**
 * Capitalize the first letter of a string
 * @param text - The text to capitalize
 * @returns The text with the first letter capitalized
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case
 * @param text - The text to convert
 * @returns The text in title case
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}
