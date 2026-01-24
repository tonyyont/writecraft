<script lang="ts">
  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();
</script>

<span class="pro-badge" class:compact>
  <svg
    width={compact ? 12 : 14}
    height={compact ? 12 : 14}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="currentColor"
    />
  </svg>
  {#if !compact}
    <span>Pro</span>
  {/if}
</span>

<style>
  .pro-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(218, 119, 86, 0.2);
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    color: #da7756;
    white-space: nowrap;
  }

  .pro-badge.compact {
    padding: 4px 6px;
  }

  .pro-badge svg {
    flex-shrink: 0;
  }
</style>
