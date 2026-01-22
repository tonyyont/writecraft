import { invoke } from '@tauri-apps/api/core';

/**
 * Reactive store for API key status
 * Provides app-wide visibility into whether an API key is configured and valid
 */
class ApiKeyStore {
  // Whether an API key exists in keychain
  hasKey = $state(false);
  // Whether the key has been validated as working
  isValid = $state<boolean | null>(null);
  // Whether we're currently checking the key
  isChecking = $state(false);
  // Last error message if any
  error = $state<string | null>(null);

  /**
   * Check if an API key exists and optionally validate it
   */
  async checkApiKey(validate: boolean = false): Promise<boolean> {
    this.isChecking = true;
    this.error = null;

    try {
      const key = await invoke<string | null>('get_api_key');
      this.hasKey = key !== null;

      if (!this.hasKey) {
        this.isValid = null;
        return false;
      }

      if (validate && key) {
        const valid = await invoke<boolean>('test_api_key', { key });
        this.isValid = valid;
        if (!valid) {
          this.error = 'API key is invalid';
        }
        return valid;
      }

      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.hasKey = false;
      this.isValid = null;
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Called when a key is successfully saved
   */
  onKeySaved() {
    this.hasKey = true;
    this.isValid = true;
    this.error = null;
  }

  /**
   * Called when a key is deleted
   */
  onKeyDeleted() {
    this.hasKey = false;
    this.isValid = null;
    this.error = null;
  }

  /**
   * Mark the key as invalid (e.g., after an API error)
   */
  markInvalid(errorMessage: string) {
    this.isValid = false;
    this.error = errorMessage;
  }

  /**
   * Check if we need to show the onboarding/setup flow
   */
  get needsSetup(): boolean {
    return !this.hasKey;
  }
}

export const apiKeyStore = new ApiKeyStore();
