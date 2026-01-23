import type { Editor } from '@tiptap/core';

// The registered editor instance
let editor = $state<Editor | null>(null);

// Callback for toggling source/preview mode
let toggleModeCallback: (() => void) | null = null;

// Register the editor instance
function registerEditor(instance: Editor): void {
  editor = instance;
}

// Unregister the editor instance
function unregisterEditor(): void {
  editor = null;
}

// Register the toggle mode callback (called from Editor component)
function registerToggleMode(callback: () => void): void {
  toggleModeCallback = callback;
}

// Unregister the toggle mode callback
function unregisterToggleMode(): void {
  toggleModeCallback = null;
}

// Toggle between source and preview modes
function toggleMode(): void {
  if (toggleModeCallback) {
    toggleModeCallback();
  }
}

// Undo the last change
function undo(): boolean {
  if (editor) {
    return editor.commands.undo();
  }
  return false;
}

// Redo the last undone change
function redo(): boolean {
  if (editor) {
    return editor.commands.redo();
  }
  return false;
}

// Check if undo is available
function canUndo(): boolean {
  if (editor) {
    return editor.can().undo();
  }
  return false;
}

// Check if redo is available
function canRedo(): boolean {
  if (editor) {
    return editor.can().redo();
  }
  return false;
}

// Export reactive getters and functions
export const editorStore = {
  get editor() {
    return editor;
  },
  get canUndo() {
    return canUndo();
  },
  get canRedo() {
    return canRedo();
  },

  registerEditor,
  unregisterEditor,
  registerToggleMode,
  unregisterToggleMode,
  toggleMode,
  undo,
  redo,
};
