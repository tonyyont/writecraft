<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import ProfileSection from './ProfileSection.svelte';
  import BillingSection from './BillingSection.svelte';
  import AppearanceSection from './AppearanceSection.svelte';
  import UsageBar from './UsageBar.svelte';
  import ProBadge from '$lib/components/ProBadge.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  type Tab = 'profile' | 'billing' | 'appearance';
  let activeTab = $state<Tab>('profile');

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  async function handleSignOut() {
    await authStore.signOut();
    onClose();
  }
</script>

{#if open}
  <div class="overlay" onclick={onClose} onkeydown={handleKeyDown} role="button" tabindex="0">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
    >
      <div class="dialog-header">
        <h2 id="dialog-title">Settings</h2>
        <button class="close-button" onclick={onClose} aria-label="Close">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="dialog-content">
        <!-- User info header -->
        <div class="user-header">
          <div class="avatar">
            {#if authStore.user?.avatarUrl}
              <img src={authStore.user.avatarUrl} alt="Profile" />
            {:else}
              <span class="avatar-placeholder">
                {authStore.user?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            {/if}
          </div>
          <div class="user-info">
            <span class="user-name">
              {authStore.profile?.displayName ||
                authStore.profile?.fullName ||
                authStore.user?.email}
            </span>
            <span class="user-email">{authStore.user?.email}</span>
          </div>
          {#if authStore.plan === 'pro'}
            <ProBadge />
          {:else}
            <div class="plan-badge free">Free</div>
          {/if}
        </div>

        <!-- Usage bar -->
        <UsageBar />

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab {activeTab === 'profile' ? 'active' : ''}"
            onclick={() => (activeTab = 'profile')}
          >
            Profile
          </button>
          <button
            class="tab {activeTab === 'billing' ? 'active' : ''}"
            onclick={() => (activeTab = 'billing')}
          >
            Billing
          </button>
          <button
            class="tab {activeTab === 'appearance' ? 'active' : ''}"
            onclick={() => (activeTab = 'appearance')}
          >
            Appearance
          </button>
        </div>

        <!-- Tab content -->
        <div class="tab-content">
          {#if activeTab === 'profile'}
            <ProfileSection />
          {:else if activeTab === 'billing'}
            <BillingSection />
          {:else if activeTab === 'appearance'}
            <AppearanceSection />
          {/if}
        </div>
      </div>

      <div class="dialog-footer">
        <button class="sign-out-button" onclick={handleSignOut}> Sign Out </button>
      </div>
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
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #1e1e1e;
    border-radius: 12px;
    width: 480px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #888;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .user-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    background: #2a2a2a;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    font-size: 24px;
    font-weight: 600;
    color: #da7756;
  }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .user-name {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }

  .user-email {
    font-size: 13px;
    color: #888;
  }

  .plan-badge {
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .plan-badge.free {
    background: rgba(255, 255, 255, 0.1);
    color: #888;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tab {
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 14px;
    font-weight: 500;
    color: #888;
    cursor: pointer;
    transition:
      color 0.2s,
      border-color 0.2s;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #fff;
  }

  .tab.active {
    color: #da7756;
    border-bottom-color: #da7756;
  }

  .tab-content {
    min-height: 200px;
  }

  .dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-start;
  }

  .sign-out-button {
    padding: 10px 16px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 13px;
    color: #888;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s;
  }

  .sign-out-button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
</style>
