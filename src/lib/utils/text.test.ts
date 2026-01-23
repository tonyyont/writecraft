/**
 * Tests for text utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  countWords,
  truncate,
  createPreview,
  normalizeWhitespace,
  isBlank,
  capitalize,
  toTitleCase,
} from './text';

describe('countWords', () => {
  it('counts words in a simple sentence', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('one two three four')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0);
    expect(countWords('\t\n')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2);
    expect(countWords('one  two   three')).toBe(3);
  });

  it('handles leading and trailing whitespace', () => {
    expect(countWords('  hello world  ')).toBe(2);
    expect(countWords('\n\thello world\n')).toBe(2);
  });

  it('handles single word', () => {
    expect(countWords('hello')).toBe(1);
  });
});

describe('truncate', () => {
  it('returns original text if under maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hi', 5)).toBe('hi');
  });

  it('truncates text and adds ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
    expect(truncate('abcdefghij', 7)).toBe('abcd...');
  });

  it('uses custom suffix', () => {
    expect(truncate('hello world', 8, '…')).toBe('hello w…');
    expect(truncate('hello world', 9, '---')).toBe('hello ---');
  });

  it('handles edge cases', () => {
    expect(truncate('hi', 2)).toBe('hi');
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('createPreview', () => {
  it('creates preview with normalized whitespace', () => {
    expect(createPreview('hello   world', 100)).toBe('hello world');
    expect(createPreview('hello\n\nworld', 100)).toBe('hello world');
  });

  it('truncates long content', () => {
    const longText = 'a'.repeat(300);
    const preview = createPreview(longText);
    expect(preview.length).toBe(200);
    expect(preview.endsWith('...')).toBe(true);
  });

  it('uses custom maxLength', () => {
    const text = 'hello world this is a test';
    const preview = createPreview(text, 15);
    expect(preview.length).toBeLessThanOrEqual(15);
  });

  it('handles empty input', () => {
    expect(createPreview('')).toBe('');
    expect(createPreview('   ')).toBe('');
  });
});

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces to single space', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
    expect(normalizeWhitespace('a  b  c')).toBe('a b c');
  });

  it('replaces newlines and tabs with spaces', () => {
    expect(normalizeWhitespace('hello\nworld')).toBe('hello world');
    expect(normalizeWhitespace('hello\tworld')).toBe('hello world');
    expect(normalizeWhitespace('hello\n\n\tworld')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
    expect(normalizeWhitespace('\n\thello world\n\t')).toBe('hello world');
  });

  it('handles empty input', () => {
    expect(normalizeWhitespace('')).toBe('');
    expect(normalizeWhitespace('   ')).toBe('');
  });
});

describe('isBlank', () => {
  it('returns true for empty string', () => {
    expect(isBlank('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('\t\n')).toBe(true);
  });

  it('returns true for null', () => {
    expect(isBlank(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isBlank(undefined)).toBe(true);
  });

  it('returns false for non-blank string', () => {
    expect(isBlank('hello')).toBe(false);
    expect(isBlank(' x ')).toBe(false);
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  it('handles already capitalized string', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
    expect(capitalize('A')).toBe('A');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('preserves rest of string', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
    expect(capitalize('hello WORLD')).toBe('Hello WORLD');
  });
});

describe('toTitleCase', () => {
  it('converts to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
    expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
  });

  it('handles already title case', () => {
    expect(toTitleCase('Hello World')).toBe('Hello World');
  });

  it('handles uppercase input', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(toTitleCase('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
  });
});
