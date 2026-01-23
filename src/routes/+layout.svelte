<script lang="ts">
  import { onMount } from 'svelte';
  import * as Sentry from '@sentry/svelte';
  import { analytics } from '$lib/services/analytics';

  let { children } = $props();

  onMount(() => {
    // Only initialize Sentry in production
    if (import.meta.env.PROD) {
      Sentry.init({
        dsn: 'https://ec6186285bfdb62cefaa94efc2bfb76a@o4510757633523712.ingest.us.sentry.io/4510757643288576',
        environment: 'production',
        tracesSampleRate: 0.1,
      });
    }

    // Initialize PostHog analytics
    analytics.init();
  });
</script>

{@render children()}
