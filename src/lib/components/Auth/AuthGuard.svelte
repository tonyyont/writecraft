<script lang="ts">
  import type { Snippet } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import AuthContainer from './AuthContainer.svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

{#if authStore.isLoading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
{:else if !authStore.isAuthenticated}
  <AuthContainer />
{:else}
  {@render children()}
{/if}

<style>
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(218, 119, 86, 0.2);
    border-top-color: #da7756;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-content p {
    font-size: 14px;
    color: #888;
    margin: 0;
  }
</style>
