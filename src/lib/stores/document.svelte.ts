/**
 * Document store for managing the current document state.
 *
 * This store handles:
 * - Loading and saving markdown documents
 * - Managing the associated sidecar metadata (.fizz.json)
 * - Tracking document changes for the AI assistant
 * - Auto-save with debouncing
 *
 * The store maintains two sets of state:
 * 1. Current document state (content, sidecar, isDirty)
 * 2. "Last seen" state for AI change tracking
 *
 * @example
 * ```typescript
 * import { documentStore } from '$lib/stores/document.svelte';
 *
 * // Load a document
 * await documentStore.loadDocument('/path/to/document.md');
 *
 * // Update content (triggers auto-save)
 * documentStore.updateContent('New content here');
 *
 * // Check for changes since AI last saw document
 * const changes = documentStore.getChangesSinceLastSeen();
 * ```
 *
 * @module stores/document
 */

import { invoke } from '@tauri-apps/api/core';
import type { Sidecar, DocumentStage, OutlinePrompt } from '$lib/types/sidecar';
import { recentsStore } from './recents.svelte';
import * as Sentry from '@sentry/svelte';
import { analytics } from '$lib/services/analytics';

// Document state
let currentPath = $state<string | null>(null);
let content = $state<string>('');
let sidecar = $state<Sidecar | null>(null);
let isDirty = $state(false);
let isLoading = $state(false);
let error = $state<string | null>(null);

// Last seen by Claude state (for change tracking)
let lastSeenContent = $state<string>('');
let lastSeenOutline = $state<OutlinePrompt[] | null>(null);
let lastSeenStage = $state<DocumentStage | null>(null);

// Debounce timer
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

// Derived filename
function getFilename(): string | null {
  if (!currentPath) return null;
  const parts = currentPath.split('/');
  return parts[parts.length - 1];
}

// Load a document and its sidecar
async function loadDocument(path: string): Promise<void> {
  isLoading = true;
  error = null;

  try {
    // Read the markdown content
    const docContent = await invoke<string>('read_document', { path });
    content = docContent;

    // Read or create the sidecar
    const sidecarData = await invoke<Sidecar>('read_sidecar', { mdPath: path });
    sidecar = sidecarData;

    currentPath = path;
    isDirty = false;

    // Initialize "last seen" state so change tracking works from the start
    // This ensures that any edits made before the first Claude response are detected
    lastSeenContent = docContent;
    lastSeenOutline = sidecarData.outline.current ?? null;
    lastSeenStage = sidecarData.stage;

    // Add to recent files
    recentsStore.addRecent(path);

    // Track document opened
    analytics.track('document_opened', { stage: sidecarData.stage });
  } catch (e) {
    Sentry.captureException(e);
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    isLoading = false;
  }
}

// Save document content
async function saveDocument(): Promise<void> {
  if (!currentPath) return;

  try {
    await invoke('write_document', { path: currentPath, content });
    isDirty = false;
    error = null;
  } catch (e) {
    Sentry.captureException(e);
    error = e instanceof Error ? e.message : String(e);
    throw e;
  }
}

// Save sidecar data
async function saveSidecar(): Promise<void> {
  if (!currentPath || !sidecar) return;

  try {
    // Update lastOpenedAt
    sidecar.meta.lastOpenedAt = new Date().toISOString();
    await invoke('write_sidecar', { mdPath: currentPath, sidecar });
    error = null;
  } catch (e) {
    Sentry.captureException(e);
    error = e instanceof Error ? e.message : String(e);
    throw e;
  }
}

// Update content with debounced save
function updateContent(newContent: string): void {
  content = newContent;
  isDirty = true;

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new debounced save
  saveTimeout = setTimeout(async () => {
    await saveDocument();
  }, DEBOUNCE_MS);
}

// Update sidecar with debounced save
function updateSidecar(updates: Partial<Sidecar>): void {
  if (!sidecar) return;

  sidecar = { ...sidecar, ...updates };

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new debounced save
  saveTimeout = setTimeout(async () => {
    await saveSidecar();
  }, DEBOUNCE_MS);
}

// Flush any pending saves immediately (call before app close)
async function flushPendingSaves(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Save both document and sidecar if there are pending changes
  if (isDirty && currentPath) {
    await saveDocument();
  }

  if (sidecar && currentPath) {
    await saveSidecar();
  }
}

// Update the document stage
function updateStage(stage: DocumentStage): void {
  if (!sidecar) return;
  updateSidecar({ stage });
}

// Create a new document at the given path
async function createDocument(path: string): Promise<void> {
  isLoading = true;
  error = null;

  try {
    // Write empty content
    await invoke('write_document', { path, content: '' });

    // Load it (this will create the sidecar)
    await loadDocument(path);

    // Track document created
    analytics.track('document_created');
  } catch (e) {
    Sentry.captureException(e);
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    isLoading = false;
  }
}

// Snapshot the current state as "last seen by Claude"
function snapshotLastSeen(): void {
  lastSeenContent = content;
  lastSeenOutline = sidecar?.outline.current ?? null;
  lastSeenStage = sidecar?.stage ?? null;
}

// Return type for getChangesSinceLastSeen
interface ChangesSinceLastSeen {
  contentChanged: boolean;
  previousContent: string | null;
  currentContent: string;
  outlineChanged: boolean;
  previousOutline: OutlinePrompt[] | null;
  currentOutline: OutlinePrompt[] | null;
  stageChanged: boolean;
  previousStage: DocumentStage | null;
  currentStage: DocumentStage | null;
}

// Get changes since the last snapshot
function getChangesSinceLastSeen(): ChangesSinceLastSeen | null {
  const currentOutline = sidecar?.outline.current ?? null;
  const currentStage = sidecar?.stage ?? null;

  // Compare outlines by JSON serialization (deep equality check)
  const outlineChanged = JSON.stringify(lastSeenOutline) !== JSON.stringify(currentOutline);
  const contentChanged = lastSeenContent !== content;
  const stageChanged = lastSeenStage !== currentStage;

  // Return null only if there are no actual changes
  if (!contentChanged && !outlineChanged && !stageChanged) {
    return null;
  }

  return {
    contentChanged,
    previousContent: lastSeenContent || null,
    currentContent: content,
    outlineChanged,
    previousOutline: lastSeenOutline,
    currentOutline,
    stageChanged,
    previousStage: lastSeenStage,
    currentStage,
  };
}

// Get the directory of the current document
function getDirectory(): string | null {
  if (!currentPath) return null;
  const parts = currentPath.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

// Rename the current document
async function renameDocument(newFilename: string): Promise<void> {
  if (!currentPath) {
    throw new Error('No document is currently open');
  }

  // Flush any pending saves first
  await flushPendingSaves();

  const directory = getDirectory();
  if (!directory) {
    throw new Error('Could not determine document directory');
  }

  // Ensure .md extension
  const finalFilename = newFilename.endsWith('.md') ? newFilename : `${newFilename}.md`;
  const newPath = `${directory}/${finalFilename}`;

  // Don't rename if it's the same path
  if (newPath === currentPath) {
    return;
  }

  try {
    await invoke('rename_document', { oldPath: currentPath, newPath });

    // Update recents store
    recentsStore.updateRecentPath(currentPath, newPath);

    // Update current path
    currentPath = newPath;

    error = null;
  } catch (e) {
    Sentry.captureException(e);
    error = e instanceof Error ? e.message : String(e);
    throw e;
  }
}

// Close the current document
function closeDocument(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  currentPath = null;
  content = '';
  sidecar = null;
  isDirty = false;
  error = null;

  // Reset last seen state
  lastSeenContent = '';
  lastSeenOutline = null;
  lastSeenStage = null;
}

// Export reactive getters and functions
export const documentStore = {
  get currentPath() {
    return currentPath;
  },
  get content() {
    return content;
  },
  get sidecar() {
    return sidecar;
  },
  get isDirty() {
    return isDirty;
  },
  get isLoading() {
    return isLoading;
  },
  get error() {
    return error;
  },
  get filename() {
    return getFilename();
  },
  get lastSeenContent() {
    return lastSeenContent;
  },
  get lastSeenOutline() {
    return lastSeenOutline;
  },
  get lastSeenStage() {
    return lastSeenStage;
  },

  loadDocument,
  saveDocument,
  saveSidecar,
  updateContent,
  updateSidecar,
  updateStage,
  createDocument,
  renameDocument,
  closeDocument,
  flushPendingSaves,
  snapshotLastSeen,
  getChangesSinceLastSeen,
};
