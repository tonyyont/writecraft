<script lang="ts">
  import { checkForUpdates, downloadAndInstall, type UpdateInfo, type UpdateProgress } from '$lib/services/updater';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  let isChecking = $state(false);
  let isDownloading = $state(false);
  let updateInfo = $state<UpdateInfo | null>(null);
  let error = $state<string | null>(null);
  let progress = $state<UpdateProgress | null>(null);

  $effect(() => {
    if (open) {
      checkUpdate();
    }
  });

  async function checkUpdate() {
    isChecking = true;
    error = null;
    updateInfo = null;

    try {
      updateInfo = await checkForUpdates();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check for updates';
    } finally {
      isChecking = false;
    }
  }

  async function installUpdate() {
    if (!updateInfo) return;

    isDownloading = true;
    error = null;
    progress = null;

    try {
      await downloadAndInstall((p) => {
        progress = p;
      });
      // App will relaunch, so we won't reach here
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to install update';
      isDownloading = false;
    }
  }

  function handleClose() {
    if (!isDownloading) {
      updateInfo = null;
      error = null;
      progress = null;
      onClose();
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} onkeydown={(e) => e.key === 'Escape' && handleClose()} role="button" tabindex="-1">
    <div class="dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div class="dialog-header">
        <h2 id="update-title">Software Update</h2>
        {#if !isDownloading}
          <button class="close-btn" onclick={handleClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        {/if}
      </div>

      <div class="dialog-content">
        {#if isChecking}
          <div class="status">
            <div class="spinner"></div>
            <p>Checking for updates...</p>
          </div>
        {:else if error}
          <div class="status error">
            <p>{error}</p>
            <button class="secondary-btn" onclick={checkUpdate}>Try Again</button>
          </div>
        {:else if isDownloading}
          <div class="status">
            <div class="spinner"></div>
            <p>Downloading update...</p>
            {#if progress && progress.total > 0}
              <div class="progress-bar">
                <div class="progress-fill" style="width: {(progress.downloaded / progress.total) * 100}%"></div>
              </div>
              <p class="progress-text">{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</p>
            {/if}
          </div>
        {:else if updateInfo}
          <div class="update-available">
            <p class="version-info">
              A new version of WriteCraft is available!
            </p>
            <p class="version-numbers">
              <span class="label">Current:</span> {updateInfo.currentVersion}
              <span class="arrow">-></span>
              <span class="label">New:</span> <strong>{updateInfo.version}</strong>
            </p>
            {#if updateInfo.body}
              <div class="release-notes">
                <p class="label">What's new:</p>
                <p class="notes">{updateInfo.body}</p>
              </div>
            {/if}
          </div>
        {:else}
          <div class="status up-to-date">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
              <path d="M16 24L22 30L32 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>WriteCraft is up to date!</p>
          </div>
        {/if}
      </div>

      {#if !isChecking && !isDownloading}
        <div class="dialog-footer">
          {#if updateInfo}
            <button class="secondary-btn" onclick={handleClose}>Later</button>
            <button class="primary-btn" onclick={installUpdate}>Install Update</button>
          {:else if !error}
            <button class="secondary-btn" onclick={handleClose}>Close</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .dialog {
    background: var(--bg-primary, #1a1a1a);
    border: 1px solid var(--border-secondary, #333);
    border-radius: 12px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-secondary, #333);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #fff);
  }

  .close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-tertiary, #666);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--text-primary, #fff);
    background: var(--bg-tertiary, #333);
  }

  .dialog-content {
    padding: 24px 20px;
    min-height: 120px;
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .status p {
    margin: 0;
    color: var(--text-secondary, #999);
  }

  .status.error p {
    color: var(--error, #ff6b6b);
  }

  .status.up-to-date {
    color: var(--success, #4ade80);
  }

  .status.up-to-date p {
    color: var(--text-primary, #fff);
    font-weight: 500;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-secondary, #333);
    border-top-color: var(--accent, #007aff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-tertiary, #333);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent, #007aff);
    transition: width 0.2s ease;
  }

  .progress-text {
    font-size: 12px;
    color: var(--text-tertiary, #666) !important;
  }

  .update-available {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .version-info {
    margin: 0;
    color: var(--text-primary, #fff);
    font-weight: 500;
  }

  .version-numbers {
    margin: 0;
    color: var(--text-secondary, #999);
    font-size: 14px;
  }

  .version-numbers .label {
    color: var(--text-tertiary, #666);
  }

  .version-numbers .arrow {
    margin: 0 8px;
    color: var(--text-tertiary, #666);
  }

  .version-numbers strong {
    color: var(--accent, #007aff);
  }

  .release-notes {
    margin-top: 8px;
    padding: 12px;
    background: var(--bg-secondary, #242424);
    border-radius: 8px;
  }

  .release-notes .label {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--text-tertiary, #666);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .release-notes .notes {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary, #999);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-secondary, #333);
  }

  .primary-btn, .secondary-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .primary-btn {
    background: var(--accent, #007aff);
    color: white;
    border: none;
  }

  .primary-btn:hover {
    background: var(--accent-hover, #0066dd);
  }

  .secondary-btn {
    background: var(--bg-tertiary, #333);
    color: var(--text-primary, #fff);
    border: 1px solid var(--border-secondary, #444);
  }

  .secondary-btn:hover {
    background: var(--bg-hover, #3a3a3a);
  }
</style>
