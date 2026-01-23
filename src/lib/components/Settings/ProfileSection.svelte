<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';

  let displayName = $state(authStore.profile?.displayName ?? '');
  let fullName = $state(authStore.profile?.fullName ?? '');
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let error = $state<string | null>(null);

  // Sync with profile changes
  $effect(() => {
    displayName = authStore.profile?.displayName ?? '';
    fullName = authStore.profile?.fullName ?? '';
  });

  async function handleSave() {
    isSaving = true;
    error = null;
    saveSuccess = false;

    try {
      await authStore.updateProfile({
        displayName: displayName || undefined,
        fullName: fullName || undefined,
      });
      saveSuccess = true;

      // Clear success after 2 seconds
      setTimeout(() => {
        saveSuccess = false;
      }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      isSaving = false;
    }
  }

  let hasChanges = $derived(
    displayName !== (authStore.profile?.displayName ?? '') ||
      fullName !== (authStore.profile?.fullName ?? '')
  );
</script>

<div class="profile-section">
  <div class="form-group">
    <label for="displayName">Display Name</label>
    <input
      type="text"
      id="displayName"
      bind:value={displayName}
      placeholder="How you want to be called"
      disabled={isSaving}
    />
    <span class="help-text">This name will be shown in the app</span>
  </div>

  <div class="form-group">
    <label for="fullName">Full Name</label>
    <input
      type="text"
      id="fullName"
      bind:value={fullName}
      placeholder="Your full name"
      disabled={isSaving}
    />
  </div>

  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" value={authStore.user?.email ?? ''} disabled />
    <span class="help-text">Email cannot be changed</span>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if saveSuccess}
    <div class="success-message">Profile updated successfully</div>
  {/if}

  <button class="save-button" onclick={handleSave} disabled={isSaving || !hasChanges}>
    {#if isSaving}
      <span class="spinner"></span>
      Saving...
    {:else}
      Save Changes
    {/if}
  </button>
</div>

<style>
  .profile-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: #999;
  }

  input {
    padding: 12px 14px;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 14px;
    color: #fff;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input::placeholder {
    color: #666;
  }

  input:focus {
    outline: none;
    border-color: #da7756;
    box-shadow: 0 0 0 3px rgba(218, 119, 86, 0.15);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 12px;
    color: #666;
  }

  .error-message {
    padding: 12px;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    font-size: 13px;
    color: #ef4444;
  }

  .success-message {
    padding: 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 8px;
    font-size: 13px;
    color: #22c55e;
  }

  .save-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: #da7756;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.2s,
      opacity 0.2s;
    align-self: flex-start;
  }

  .save-button:hover:not(:disabled) {
    background: #c66a4a;
  }

  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
