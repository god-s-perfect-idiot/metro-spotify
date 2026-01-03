<script>
  import { onMount } from 'svelte';
  import { currentRoute, router } from './lib/router.js';
  import { App as CapacitorApp } from '@capacitor/app';
  import SpotifyPage from './pages/SpotifyPage.svelte';
  import SpotifyCallback from './pages/SpotifyCallback.svelte';
  import StatusBar from './components/StatusBar.svelte';
  
  let route = '/spotify';
  
  $: route = $currentRoute;
  $: console.log('📍 Current route:', route);
  
  onMount(() => {
    // Handle deep links (OAuth callback) - only in Capacitor
    if (window.Capacitor) {
      CapacitorApp.addListener('appUrlOpen', (data) => {
        try {
          const url = new URL(data.url);
          if (url.pathname.includes('callback') || url.href.includes('callback')) {
            const search = url.search || (url.hash ? '?' + url.hash.substring(1) : '');
            router.goto('/spotify/callback' + search);
          }
        } catch (e) {
          console.error('Error parsing deep link:', e);
        }
      });
    }
    
    // Handle initial URL
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      console.log('🔍 Initial URL check:', { path, search, hash });
      
      // If we're on a callback URL, ensure we route to it properly
      if (path.includes('callback')) {
        const fullPath = path + search + (hash || '');
        console.log('🔗 Routing to callback:', fullPath);
        router.goto(fullPath);
      } else {
        router.goto(path || '/spotify');
      }
    }
  });
</script>

<main class="w-full h-full relative">
  <!-- Custom Status Bar (no padding, flush with edges) -->
  <StatusBar />
  
  <!-- Main Content (with padding for status bar + 1rem padding around) -->
  <div class="w-full h-full content-container" style="padding-top: 24px;">
    {#if route.startsWith('/spotify/callback') || route.startsWith('/callback')}
      <SpotifyCallback />
    {:else if route.startsWith('/spotify')}
      <SpotifyPage />
    {:else}
      <SpotifyPage />
    {/if}
  </div>
</main>
