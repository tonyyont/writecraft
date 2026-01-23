<script lang="ts">
  import { preferencesStore } from '$lib/stores/preferences.svelte';

  type Theme = 'light' | 'dark' | 'system';

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'computer' },
  ];

  function handleThemeChange(theme: Theme) {
    preferencesStore.setTheme(theme);
  }
</script>

<div class="appearance-section">
  <div class="setting-group">
    <span class="setting-label">Theme</span>
    <p class="setting-description">Choose your preferred color scheme</p>

    <div class="theme-options">
      {#each themes as { value, label, icon }}
        <button
          class="theme-option {preferencesStore.theme === value ? 'active' : ''}"
          onclick={() => handleThemeChange(value)}
          aria-pressed={preferencesStore.theme === value}
        >
          <span class="theme-icon">
            {#if icon === 'sun'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            {:else if icon === 'moon'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            {/if}
          </span>
          <span class="theme-label">{label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="setting-group">
    <span class="setting-label">Preview</span>
    <div class="preview-card">
      <div class="preview-header">
        <div class="preview-dot"></div>
        <div class="preview-dot"></div>
        <div class="preview-dot"></div>
      </div>
      <div class="preview-content">
        <div class="preview-line preview-line-title"></div>
        <div class="preview-line preview-line-text"></div>
        <div class="preview-line preview-line-text short"></div>
      </div>
    </div>
    <p class="setting-description current-theme">
      Currently using: <strong>{preferencesStore.effectiveTheme === 'dark' ? 'Dark' : 'Light'} mode</strong>
      {#if preferencesStore.theme === 'system'}
        (following system preference)
      {/if}
    </p>
  </div>
</div>

<style>
  .appearance-section {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-label {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  .setting-description {
    font-size: 13px;
    color: #888;
    margin: 0;
  }

  .theme-options {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .theme-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    background: #2a2a2a;
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-option:hover {
    background: #333;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .theme-option.active {
    background: rgba(218, 119, 86, 0.1);
    border-color: #da7756;
  }

  .theme-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    color: #888;
    transition: color 0.2s, background 0.2s;
  }

  .theme-option:hover .theme-icon {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .theme-option.active .theme-icon {
    color: #da7756;
    background: rgba(218, 119, 86, 0.15);
  }

  .theme-label {
    font-size: 13px;
    font-weight: 500;
    color: #888;
    transition: color 0.2s;
  }

  .theme-option:hover .theme-label {
    color: #fff;
  }

  .theme-option.active .theme-label {
    color: #da7756;
  }

  .preview-card {
    background: var(--color-bg, #1e1e1e);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    overflow: hidden;
    margin-top: 8px;
  }

  .preview-header {
    display: flex;
    gap: 6px;
    padding: 10px 12px;
    background: var(--color-bg-elevated, #252525);
    border-bottom: 1px solid var(--color-border, #333);
  }

  .preview-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-border, #333);
  }

  .preview-dot:nth-child(1) {
    background: #ff5f56;
  }

  .preview-dot:nth-child(2) {
    background: #ffbd2e;
  }

  .preview-dot:nth-child(3) {
    background: #27ca40;
  }

  .preview-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .preview-line {
    height: 10px;
    border-radius: 4px;
    background: var(--color-border, #333);
  }

  .preview-line-title {
    width: 40%;
    height: 14px;
    background: var(--color-text-secondary, #a0a0a0);
  }

  .preview-line-text {
    width: 100%;
    background: var(--color-border-subtle, #3a3a3a);
  }

  .preview-line-text.short {
    width: 70%;
  }

  .current-theme {
    margin-top: 4px;
  }

  .current-theme strong {
    color: #da7756;
  }
</style>
