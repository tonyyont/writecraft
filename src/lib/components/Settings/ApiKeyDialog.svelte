<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  // Props
  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  // State
  let apiKey = $state('');
  let showKey = $state(false);
  let hasExistingKey = $state(false);
  let isEditing = $state(false);
  let isLoading = $state(false);
  let isTesting = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  let errorMessage = $state('');

  // Load existing key status on mount
  $effect(() => {
    if (open) {
      checkExistingKey();
    }
  });

  async function checkExistingKey() {
    try {
      const existingKey = await invoke<string | null>('get_api_key');
      hasExistingKey = existingKey !== null;
      if (hasExistingKey && existingKey) {
        // Show masked placeholder
        apiKey = '********';
        // Auto-test the existing key to show status
        await testExistingKey(existingKey);
      } else {
        hasExistingKey = false;
        apiKey = '';
      }
    } catch (e) {
      console.error('Failed to check existing key:', e);
    }
  }

  async function testExistingKey(key: string) {
    isTesting = true;
    testResult = null;
    errorMessage = '';

    try {
      const isValid = await invoke<boolean>('test_api_key', { key });
      testResult = isValid ? 'success' : 'error';
      if (!isValid) {
        errorMessage = 'Invalid API key';
      }
    } catch (e) {
      testResult = 'error';
      errorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      isTesting = false;
    }
  }

  async function handleSave() {
    if (!apiKey) return;

    isLoading = true;
    errorMessage = '';

    try {
      // Test the key first before saving
      const isValid = await invoke<boolean>('test_api_key', { key: apiKey });
      if (!isValid) {
        testResult = 'error';
        errorMessage = 'Invalid API key';
        return;
      }

      // Key is valid, save it
      await invoke('set_api_key', { key: apiKey });
      hasExistingKey = true;
      isEditing = false;
      apiKey = '';
      showKey = false;
      testResult = 'success';
    } catch (e) {
      testResult = 'error';
      errorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading = false;
    }
  }

  async function handleTest() {
    const keyToTest = apiKey === '********' ? null : apiKey;

    if (!keyToTest) {
      // Test existing key
      try {
        const existingKey = await invoke<string | null>('get_api_key');
        if (!existingKey) {
          testResult = 'error';
          errorMessage = 'No API key to test';
          return;
        }
      } catch (e) {
        testResult = 'error';
        errorMessage = 'Failed to retrieve existing key';
        return;
      }
    }

    isTesting = true;
    testResult = null;
    errorMessage = '';

    try {
      const testKey = keyToTest || (await invoke<string>('get_api_key'));
      const isValid = await invoke<boolean>('test_api_key', { key: testKey });
      testResult = isValid ? 'success' : 'error';
      if (!isValid) {
        errorMessage = 'Invalid API key';
      }
    } catch (e) {
      testResult = 'error';
      errorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      isTesting = false;
    }
  }

  async function handleDelete() {
    isLoading = true;
    errorMessage = '';

    try {
      await invoke('delete_api_key');
      hasExistingKey = false;
      apiKey = '';
      testResult = null;
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading = false;
    }
  }

  function handleCancel() {
    apiKey = '';
    showKey = false;
    isEditing = false;
    testResult = null;
    errorMessage = '';
    onClose();
  }

  function handleKeyInput(e: Event) {
    const input = e.target as HTMLInputElement;
    // If user starts typing when showing masked placeholder, clear it
    if (apiKey === '********') {
      apiKey = input.value.replace('********', '');
    } else {
      apiKey = input.value;
    }
    testResult = null;
  }
</script>

{#if open}
  <div class="overlay" onclick={handleCancel} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="button" tabindex="0">
    <div class="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">
      <h2 id="dialog-title">Claude API Key</h2>

      {#if hasExistingKey && !isEditing}
        <!-- Connected state -->
        <div class="connected-state">
          <div class="status-card {testResult === 'success' ? 'success' : testResult === 'error' ? 'error' : 'checking'}">
            <div class="status-icon">
              {#if isTesting}
                <span class="spinner"></span>
              {:else if testResult === 'success'}
                <span class="checkmark">✓</span>
              {:else if testResult === 'error'}
                <span class="error-icon">✗</span>
              {:else}
                <span class="spinner"></span>
              {/if}
            </div>
            <div class="status-text">
              {#if isTesting}
                <span class="status-label">Verifying connection...</span>
              {:else if testResult === 'success'}
                <span class="status-label">API Key Connected</span>
                <span class="status-detail">Stored securely in macOS Keychain</span>
              {:else if testResult === 'error'}
                <span class="status-label">Connection Failed</span>
                <span class="status-detail">{errorMessage || 'API key is invalid'}</span>
              {:else}
                <span class="status-label">Checking connection...</span>
              {/if}
            </div>
          </div>
        </div>

        <div class="actions">
          <div class="left-actions">
            <button
              type="button"
              class="delete-button"
              onclick={handleDelete}
              disabled={isLoading || isTesting}
            >
              Remove Key
            </button>
          </div>
          <div class="right-actions">
            <button
              type="button"
              class="test-button"
              onclick={handleTest}
              disabled={isLoading || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Again'}
            </button>
            <button
              type="button"
              class="edit-button"
              onclick={() => { isEditing = true; apiKey = ''; }}
              disabled={isLoading || isTesting}
            >
              Change Key
            </button>
            <button
              type="button"
              class="cancel-button"
              onclick={handleCancel}
              disabled={isLoading || isTesting}
            >
              Done
            </button>
          </div>
        </div>
      {:else}
        <!-- Input state (no key or editing) -->
        <p class="description">
          Your API key is stored securely in the macOS Keychain.
          Get your key from <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>
        </p>

        <div class="input-group">
          <label for="api-key-input">API Key</label>
          <div class="input-wrapper">
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              oninput={handleKeyInput}
              placeholder="sk-ant-..."
              disabled={isLoading || isTesting}
            />
            <button
              type="button"
              class="toggle-visibility"
              onclick={() => showKey = !showKey}
              disabled={isLoading || isTesting}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {#if testResult}
          <div class="test-result {testResult}">
            {testResult === 'success' ? 'API key is valid' : errorMessage || 'API key is invalid'}
          </div>
        {/if}

        {#if errorMessage && !testResult}
          <div class="error-message">
            {errorMessage}
          </div>
        {/if}

        <div class="actions">
          <div class="left-actions"></div>
          <div class="right-actions">
            <button
              type="button"
              class="test-button"
              onclick={handleTest}
              disabled={isLoading || isTesting || !apiKey}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              class="cancel-button"
              onclick={() => { if (isEditing) { isEditing = false; checkExistingKey(); } else { handleCancel(); } }}
              disabled={isLoading || isTesting}
            >
              Cancel
            </button>
            <button
              type="button"
              class="save-button"
              onclick={handleSave}
              disabled={isLoading || isTesting || !apiKey}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    width: 420px;
    max-width: 90vw;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  }

  h2 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .description {
    margin: 0 0 20px 0;
    font-size: 13px;
    color: #666;
    line-height: 1.4;
  }

  .description a {
    color: #0066cc;
    text-decoration: none;
  }

  .description a:hover {
    text-decoration: underline;
  }

  .input-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .input-wrapper {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: monospace;
  }

  input:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }

  input:disabled {
    background: #f5f5f5;
  }

  .toggle-visibility {
    padding: 8px 12px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
  }

  .toggle-visibility:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .toggle-visibility:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .test-result {
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .test-result.success {
    background: #e6f4ea;
    color: #1e7e34;
    border: 1px solid #b7e1c3;
  }

  .test-result.error {
    background: #fce8e8;
    color: #c62828;
    border: 1px solid #f5c6c6;
  }

  .error-message {
    padding: 10px 12px;
    background: #fce8e8;
    color: #c62828;
    border: 1px solid #f5c6c6;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .connected-state {
    margin-bottom: 20px;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid;
  }

  .status-card.success {
    background: #e6f4ea;
    border-color: #b7e1c3;
  }

  .status-card.error {
    background: #fce8e8;
    border-color: #f5c6c6;
  }

  .status-card.checking {
    background: #f0f4f8;
    border-color: #d0d7de;
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 20px;
    font-weight: bold;
  }

  .status-card.success .status-icon {
    background: #1e7e34;
    color: white;
  }

  .status-card.error .status-icon {
    background: #c62828;
    color: white;
  }

  .status-card.checking .status-icon {
    background: #6b7280;
    color: white;
  }

  .checkmark, .error-icon {
    line-height: 1;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .status-label {
    font-size: 15px;
    font-weight: 600;
  }

  .status-card.success .status-label {
    color: #1e7e34;
  }

  .status-card.error .status-label {
    color: #c62828;
  }

  .status-detail {
    font-size: 13px;
    color: #666;
  }

  .edit-button {
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
  }

  .edit-button:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .left-actions {
    display: flex;
    gap: 8px;
  }

  .right-actions {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .delete-button {
    background: transparent;
    color: #c62828;
    border: 1px solid #c62828;
  }

  .delete-button:hover:not(:disabled) {
    background: #fce8e8;
  }

  .test-button {
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
  }

  .test-button:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .cancel-button {
    background: transparent;
    color: #666;
    border: 1px solid #ccc;
  }

  .cancel-button:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .save-button {
    background: #0066cc;
    color: #fff;
  }

  .save-button:hover:not(:disabled) {
    background: #0052a3;
  }

  @media (prefers-color-scheme: dark) {
    .dialog {
      background: #2d2d2d;
      color: #e0e0e0;
    }

    .description {
      color: #999;
    }

    .description a {
      color: #6bb3ff;
    }

    input {
      background: #1e1e1e;
      border-color: #444;
      color: #e0e0e0;
    }

    input:focus {
      border-color: #6bb3ff;
      box-shadow: 0 0 0 2px rgba(107, 179, 255, 0.2);
    }

    input:disabled {
      background: #383838;
    }

    .toggle-visibility {
      background: #383838;
      border-color: #444;
      color: #e0e0e0;
    }

    .toggle-visibility:hover:not(:disabled) {
      background: #444;
    }

    .test-button {
      background: #383838;
      border-color: #444;
      color: #e0e0e0;
    }

    .test-button:hover:not(:disabled) {
      background: #444;
    }

    .cancel-button {
      border-color: #444;
      color: #999;
    }

    .cancel-button:hover:not(:disabled) {
      background: #383838;
    }

    .save-button {
      background: #0066cc;
    }

    .save-button:hover:not(:disabled) {
      background: #0077ed;
    }

    .delete-button {
      color: #ff6b6b;
      border-color: #ff6b6b;
    }

    .delete-button:hover:not(:disabled) {
      background: rgba(255, 107, 107, 0.1);
    }

    .test-result.success {
      background: rgba(30, 126, 52, 0.2);
      border-color: rgba(30, 126, 52, 0.4);
      color: #69db7c;
    }

    .test-result.error {
      background: rgba(198, 40, 40, 0.2);
      border-color: rgba(198, 40, 40, 0.4);
      color: #ff6b6b;
    }

    .error-message {
      background: rgba(198, 40, 40, 0.2);
      border-color: rgba(198, 40, 40, 0.4);
      color: #ff6b6b;
    }

    .status-card.success {
      background: rgba(30, 126, 52, 0.2);
      border-color: rgba(30, 126, 52, 0.4);
    }

    .status-card.success .status-label {
      color: #69db7c;
    }

    .status-card.error {
      background: rgba(198, 40, 40, 0.2);
      border-color: rgba(198, 40, 40, 0.4);
    }

    .status-card.error .status-label {
      color: #ff6b6b;
    }

    .status-card.checking {
      background: rgba(107, 114, 128, 0.2);
      border-color: rgba(107, 114, 128, 0.4);
    }

    .status-detail {
      color: #999;
    }

    .edit-button {
      background: #383838;
      border-color: #444;
      color: #e0e0e0;
    }

    .edit-button:hover:not(:disabled) {
      background: #444;
    }
  }
</style>
