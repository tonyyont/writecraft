<script lang="ts">
  import { checkForUpdates, type UpdateInfo } from '$lib/services/updater';

  interface Props {
    open: boolean;
    onClose: () => void;
    onUpdateAvailable: (info: UpdateInfo) => void;
  }

  let { open, onClose, onUpdateAvailable }: Props = $props();

  type ToastState = 'checking' | 'up-to-date' | 'update-available' | 'error';

  let toastState: ToastState = $state('checking');
  let error: string | null = $state(null);
  let updateInfo: UpdateInfo | null = $state(null);
  let autoDismissTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (open) {
      checkUpdate();
    } else {
      // Reset state when closed
      toastState = 'checking';
      error = null;
      updateInfo = null;
      if (autoDismissTimeout) {
        clearTimeout(autoDismissTimeout);
        autoDismissTimeout = null;
      }
    }
  });

  async function checkUpdate() {
    toastState = 'checking';
    error = null;
    updateInfo = null;

    try {
      const info = await checkForUpdates();
      if (info) {
        updateInfo = info;
        toastState = 'update-available';
      } else {
        toastState = 'up-to-date';
        // Auto-dismiss after 3 seconds
        autoDismissTimeout = setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check for updates';
      toastState = 'error';
    }
  }

  function handleViewDetails() {
    if (updateInfo) {
      onUpdateAvailable(updateInfo);
      onClose();
    }
  }

  function handleRetry() {
    checkUpdate();
  }
</script>

{#if open}
  <div class="toast" class:fade-in={open}>
    <div class="toast-content">
      {#if toastState === 'checking'}
        <div class="spinner"></div>
        <span class="message">Checking for updates...</span>
      {:else if toastState === 'up-to-date'}
        <svg class="icon success" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M5.5 9L8 11.5L12.5 6.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="message">WriteCraft is up to date</span>
      {:else if toastState === 'update-available'}
        <svg class="icon update" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M9 5V10M9 13V13.01"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span class="message">Update available!</span>
        <button class="action-btn" onclick={handleViewDetails}>View Details</button>
      {:else if toastState === 'error'}
        <svg class="icon error" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span class="message error-text">{error}</span>
        <button class="action-btn" onclick={handleRetry}>Retry</button>
      {/if}
    </div>
    <button class="close-btn" onclick={onClose} aria-label="Close">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M1 1L11 11M1 11L11 1"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: 60px;
    right: 16px;
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-primary, #1a1a1a);
    border: 1px solid var(--border-secondary, #333);
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 250px;
    opacity: 0;
    transform: translateY(-8px);
    animation: fadeIn 0.2s ease forwards;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .spinner {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border: 2px solid var(--border-secondary, #333);
    border-top-color: var(--accent, #007aff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .icon {
    flex-shrink: 0;
  }

  .icon.success {
    color: var(--success, #4ade80);
  }

  .icon.update {
    color: var(--accent, #007aff);
  }

  .icon.error {
    color: var(--error, #ff6b6b);
  }

  .message {
    font-size: 13px;
    color: var(--text-primary, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .message.error-text {
    color: var(--error, #ff6b6b);
    white-space: normal;
    font-size: 12px;
  }

  .action-btn {
    flex-shrink: 0;
    padding: 4px 8px;
    background: var(--accent, #007aff);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .action-btn:hover {
    background: var(--accent-hover, #0066dd);
  }

  .close-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--text-tertiary, #666);
    border-radius: 4px;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }

  .close-btn:hover {
    color: var(--text-primary, #fff);
    background: var(--bg-tertiary, #333);
  }

  @media (prefers-color-scheme: light) {
    .toast {
      background: #fff;
      border-color: #e0e0e0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .message {
      color: #333;
    }

    .close-btn {
      color: #999;
    }

    .close-btn:hover {
      color: #333;
      background: #f0f0f0;
    }
  }
</style>
