<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { apiKeyStore } from '$lib/stores/apiKey.svelte';

  // Props
  interface Props {
    onComplete: () => void;
  }

  let { onComplete }: Props = $props();

  // State
  let apiKey = $state('');
  let showKey = $state(false);
  let isLoading = $state(false);
  let isTesting = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  let errorMessage = $state('');

  async function handleSave() {
    if (!apiKey.trim()) return;

    isLoading = true;
    errorMessage = '';
    testResult = null;

    try {
      // Test the key first
      const isValid = await invoke<boolean>('test_api_key', { key: apiKey });
      if (!isValid) {
        testResult = 'error';
        errorMessage = 'Invalid API key. Please check and try again.';
        return;
      }

      // Key is valid, save it
      await invoke('set_api_key', { key: apiKey });
      testResult = 'success';
      apiKeyStore.onKeySaved();

      // Small delay to show success state
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (e) {
      testResult = 'error';
      errorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading = false;
    }
  }

  async function handleTest() {
    if (!apiKey.trim()) return;

    isTesting = true;
    testResult = null;
    errorMessage = '';

    try {
      const isValid = await invoke<boolean>('test_api_key', { key: apiKey });
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && apiKey.trim() && !isLoading && !isTesting) {
      handleSave();
    }
  }
</script>

<div class="onboarding-overlay">
  <div class="onboarding-dialog">
    <div class="logo-container">
      <div class="logo">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
    </div>

    <h1>Welcome to WriteCraft</h1>
    <p class="subtitle">Connect your Claude API key to get started</p>

    <div class="steps">
      <div class="step">
        <span class="step-number">1</span>
        <span class="step-text">
          Get your API key from <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener">console.anthropic.com</a
          >
        </span>
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <span class="step-text">Paste it below and click Connect</span>
      </div>
    </div>

    <div class="input-group">
      <label for="api-key-input">API Key</label>
      <div class="input-wrapper">
        <input
          id="api-key-input"
          type={showKey ? 'text' : 'password'}
          bind:value={apiKey}
          onkeydown={handleKeydown}
          placeholder="sk-ant-api03-..."
          disabled={isLoading || isTesting}
        />
        <button
          type="button"
          class="toggle-visibility"
          onclick={() => (showKey = !showKey)}
          disabled={isLoading || isTesting}
          aria-label={showKey ? 'Hide API key' : 'Show API key'}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>

    {#if testResult}
      <div class="test-result {testResult}">
        {#if testResult === 'success'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
            />
          </svg>
          API key is valid
        {:else}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"
            />
          </svg>
          {errorMessage || 'Invalid API key'}
        {/if}
      </div>
    {/if}

    <div class="actions">
      <button
        type="button"
        class="test-button"
        onclick={handleTest}
        disabled={isLoading || isTesting || !apiKey.trim()}
      >
        {isTesting ? 'Testing...' : 'Test Connection'}
      </button>
      <button
        type="button"
        class="connect-button"
        onclick={handleSave}
        disabled={isLoading || isTesting || !apiKey.trim()}
      >
        {#if isLoading}
          Connecting...
        {:else if testResult === 'success'}
          Connected!
        {:else}
          Connect
        {/if}
      </button>
    </div>

    <p class="security-note">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M8 1a3.5 3.5 0 00-3.5 3.5V6H4a2 2 0 00-2 2v5a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-.5V4.5A3.5 3.5 0 008 1zm2 5V4.5a2 2 0 10-4 0V6h4z"
        />
      </svg>
      Your key is stored securely in the macOS Keychain
    </p>
  </div>
</div>

<style>
  .onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .onboarding-dialog {
    background: #fff;
    border-radius: 16px;
    padding: 40px;
    width: 460px;
    max-width: 90vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .logo-container {
    margin-bottom: 24px;
  }

  .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
    border-radius: 20px;
    color: white;
  }

  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .subtitle {
    margin: 0 0 32px 0;
    font-size: 15px;
    color: #666;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
    text-align: left;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #f0f0f0;
    border-radius: 50%;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    flex-shrink: 0;
  }

  .step-text {
    font-size: 14px;
    color: #333;
  }

  .step-text a {
    color: #007aff;
    text-decoration: none;
  }

  .step-text a:hover {
    text-decoration: underline;
  }

  .input-group {
    margin-bottom: 16px;
    text-align: left;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #333;
  }

  .input-wrapper {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
    font-family: monospace;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #007aff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
  }

  input:disabled {
    background: #f5f5f5;
  }

  .toggle-visibility {
    padding: 10px 14px;
    background: #f0f0f0;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toggle-visibility:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .toggle-visibility:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .test-result {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .test-result.success {
    background: #e6f4ea;
    color: #1e7e34;
  }

  .test-result.error {
    background: #fce8e8;
    color: #c62828;
  }

  .actions {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  button {
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition:
      background 0.2s,
      transform 0.1s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .test-button {
    flex: 1;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #d0d0d0;
  }

  .test-button:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .connect-button {
    flex: 2;
    background: #007aff;
    color: #fff;
  }

  .connect-button:hover:not(:disabled) {
    background: #0066d6;
  }

  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    color: #888;
  }

  @media (prefers-color-scheme: dark) {
    .onboarding-dialog {
      background: #2d2d2d;
    }

    h1 {
      color: #e0e0e0;
    }

    .subtitle {
      color: #999;
    }

    .step-number {
      background: #3a3a3a;
      color: #aaa;
    }

    .step-text {
      color: #e0e0e0;
    }

    .step-text a {
      color: #5ac8fa;
    }

    label {
      color: #e0e0e0;
    }

    input {
      background: #1e1e1e;
      border-color: #444;
      color: #e0e0e0;
    }

    input:focus {
      border-color: #5ac8fa;
      box-shadow: 0 0 0 3px rgba(90, 200, 250, 0.15);
    }

    input:disabled {
      background: #383838;
    }

    .toggle-visibility {
      background: #3a3a3a;
      border-color: #444;
      color: #e0e0e0;
    }

    .toggle-visibility:hover:not(:disabled) {
      background: #444;
    }

    .test-result.success {
      background: rgba(30, 126, 52, 0.2);
      color: #69db7c;
    }

    .test-result.error {
      background: rgba(198, 40, 40, 0.2);
      color: #ff6b6b;
    }

    .test-button {
      background: #3a3a3a;
      border-color: #444;
      color: #e0e0e0;
    }

    .test-button:hover:not(:disabled) {
      background: #444;
    }

    .connect-button {
      background: #007aff;
    }

    .connect-button:hover:not(:disabled) {
      background: #0077ed;
    }

    .security-note {
      color: #666;
    }
  }
</style>
