<script lang="ts">
  interface Props {
    name: string;
    input: Record<string, unknown>;
  }

  let { name, input }: Props = $props();

  // Get human-readable tool name
  function getToolLabel(toolName: string): string {
    const labels: Record<string, string> = {
      'read_document': 'Reading document',
      'update_document': 'Updating document',
      'update_concept': 'Recording concept',
      'update_outline': 'Creating outline',
      'update_stage': 'Updating stage',
      'add_edit_suggestion': 'Suggesting edit'
    };
    return labels[toolName] || toolName;
  }

  // Get icon for tool
  function getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      'read_document': '📖',
      'update_document': '✏️',
      'update_concept': '💡',
      'update_outline': '📝',
      'update_stage': '🔄',
      'add_edit_suggestion': '✨'
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: #f0f4f8;
    border-radius: 12px;
    font-size: 12px;
    color: #4a5568;
    margin: 4px 0;
  }

  .tool-icon {
    font-size: 14px;
  }

  .tool-label {
    font-weight: 500;
    color: #2d3748;
  }

  .tool-summary {
    color: #718096;
  }

  @media (prefers-color-scheme: dark) {
    .tool-indicator {
      background: #2d3748;
      color: #a0aec0;
    }

    .tool-label {
      color: #e2e8f0;
    }

    .tool-summary {
      color: #718096;
    }
  }
</style>
