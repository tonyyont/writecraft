<script lang="ts">
  import ProBadge from '$lib/components/ProBadge.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-overlay">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <div class="success-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <div class="modal-content">
        <div class="badge-row">
          <ProBadge />
        </div>
        <h2 id="success-title" class="modal-title">Welcome to Pro!</h2>
        <p class="modal-subtitle">
          You now have unlimited messages. Your creativity has no limits.
        </p>
      </div>

      <button class="start-button" onclick={onClose}> Start Writing </button>

      <div class="confetti">
        {#each Array(12) as _, i (i)}
          <div
            class="confetti-piece"
            style="--delay: {i * 0.1}s; --x: {(i % 4) * 25 - 37.5}%"
          ></div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 1001;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90%;
    max-width: 380px;
    padding: 40px 32px 32px;
    background: #1e1e1e;
    border: 1px solid rgba(218, 119, 86, 0.3);
    border-radius: 20px;
    box-shadow:
      0 0 0 1px rgba(218, 119, 86, 0.1),
      0 0 60px rgba(218, 119, 86, 0.15),
      0 24px 48px rgba(0, 0, 0, 0.4);
    text-align: center;
    overflow: hidden;
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .success-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, #da7756 0%, #c66a4a 100%);
    border-radius: 50%;
    color: #fff;
    box-shadow:
      0 0 0 8px rgba(218, 119, 86, 0.15),
      0 0 0 16px rgba(218, 119, 86, 0.08);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow:
        0 0 0 8px rgba(218, 119, 86, 0.15),
        0 0 0 16px rgba(218, 119, 86, 0.08);
    }
    50% {
      box-shadow:
        0 0 0 12px rgba(218, 119, 86, 0.1),
        0 0 0 24px rgba(218, 119, 86, 0.05);
    }
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 24px 0;
  }

  .badge-row {
    margin-bottom: 4px;
  }

  .modal-title {
    margin: 0;
    font-size: 26px;
    font-weight: 600;
    color: #fff;
  }

  .modal-subtitle {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: #a0a0a0;
    max-width: 280px;
  }

  .start-button {
    width: 100%;
    padding: 16px 24px;
    background: #da7756;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.2s ease,
      transform 0.1s ease;
  }

  .start-button:hover {
    background: #c66a4a;
    transform: translateY(-1px);
  }

  .start-button:active {
    transform: translateY(0);
  }

  .confetti {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .confetti-piece {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #da7756;
    border-radius: 2px;
    top: 0;
    left: 50%;
    transform: translateX(var(--x));
    animation: confettiFall 1.5s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
  }

  .confetti-piece:nth-child(odd) {
    background: #eab308;
    width: 8px;
    height: 8px;
  }

  .confetti-piece:nth-child(3n) {
    background: #22c55e;
    border-radius: 50%;
    width: 6px;
    height: 6px;
  }

  @keyframes confettiFall {
    0% {
      opacity: 1;
      transform: translateX(var(--x)) translateY(-20px) rotate(0deg);
    }
    100% {
      opacity: 0;
      transform: translateX(calc(var(--x) + 50px)) translateY(400px) rotate(720deg);
    }
  }
</style>
