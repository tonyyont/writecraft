<script lang="ts">
  interface Props {
    name: string;
    input: Record<string, unknown>;
  }

  let { name, input }: Props = $props();

  // Get human-readable tool name
  function getToolLabel(toolName: string): string {
    const labels: Record<string, string> = {
      read_document: 'Reading document',
      update_document: 'Updating document',
      update_concept: 'Recording concept',
      update_outline: 'Creating outline',
      update_stage: 'Updating stage',
      add_edit_suggestion: 'Suggesting edit',
    };
    return labels[toolName] || toolName;
  }

  // Get icon for tool
  function getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      read_document: '📖',
      update_document: '✏️',
      update_concept: '💡',
      update_outline: '📝',
      update_stage: '🔄',
      add_edit_suggestion: '✨',
    };
    return icons[toolName] || '🔧';
  }

  // Get a brief summary of what the tool is doing
  function getToolSummary(toolName: string, toolInput: Record<string, unknown>): string {
    switch (toolName) {
      case 'read_document':
        return 'Getting current document content';

      case 'update_document': {
        const op = toolInput.operation as string;
        if (op === 'replace') return 'Replacing document content';
        if (op === 'insert') return 'Inserting content';
        if (op === 'append') return 'Appending content';
        return 'Modifying document';
      }

      case 'update_concept': {
        const title = toolInput.title as string;
        return title ? `Setting concept: "${title}"` : 'Recording concept';
      }

      case 'update_outline': {
        const sections = toolInput.sections as unknown[];
        const count = sections?.length ?? 0;
        return `Creating ${count} section${count !== 1 ? 's' : ''}`;
      }

      case 'update_stage': {
        const stage = toolInput.stage as string;
        return `Moving to ${stage} stage`;
      }

      case 'add_edit_suggestion': {
        const scope = toolInput.scope as string;
        return scope ? `Suggesting edit for ${scope}` : 'Suggesting edit';
      }

      default:
        return 'Executing tool';
    }
  }
</script>

<div class="tool-indicator">
  <span class="tool-icon">{getToolIcon(name)}</span>
  <span class="tool-label">{getToolLabel(name)}</span>
  <span class="tool-summary">{getToolSummary(name, input)}</span>
</div>

<style>
  .tool-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 10px;
    border-left: 2px solid #6b7280;
    font-size: 13px;
    margin: 2px 0;
    line-height: 1.4;
  }

  .tool-icon {
    font-size: 11px;
  }

  .tool-label {
    font-weight: 500;
    color: #9ca3af;
  }

  .tool-summary {
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .tool-indicator {
      border-left-color: #6b7280;
    }

    .tool-label {
      color: #9ca3af;
    }

    .tool-summary {
      color: #6b7280;
    }
  }
</style>
