<script>
  import { onMount } from 'svelte';
  import { currentRoute, router } from './lib/router.js';
  import { App as CapacitorApp } from '@capacitor/app';
  import SpotifyPage from './pages/SpotifyPage.svelte';
  import SpotifyCallback from './pages/SpotifyCallback.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import BottomControls from './components/BottomControls.svelte';
  import SpotifyBottomBarContent from './components/SpotifyBottomBarContent.svelte';
  import { bottomBarExpanded, bottomBarUnmounting } from './store/bottomBar.js';
  import { accountsStore } from './store/accounts.js';
  import { musicStore, currentTrack } from './store/music.js';
  
  let route = '/spotify';
  let spotifyPageRef = null;
  let showSetup = false;
  
  $: route = $currentRoute;
  $: console.log('📍 Current route:', route);
  
  // Subscribe to stores for bottom bar
  $: isExpanded = $bottomBarExpanded;
  $: isUnmounting = $bottomBarUnmounting;
  $: isAuthenticated = accountsStore.isAuthenticated('spotify');
  $: currentTrackData = $currentTrack;
  $: nowPlayingTrack = currentTrackData && currentTrackData.type === 'spotify' ? currentTrackData : null;
  
  function handleToggle(event) {
    bottomBarExpanded.set(event.detail.expanded);
  }
  
  function handleHideSetup() {
    showSetup = false;
    if (spotifyPageRef && spotifyPageRef.hideSetupPage) {
      spotifyPageRef.hideSetupPage();
    }
  }
  
  function handleConnect() {
    if (spotifyPageRef && spotifyPageRef.connectSpotify) {
      spotifyPageRef.connectSpotify();
    }
  }
  
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
      <SpotifyPage bind:this={spotifyPageRef} bind:showSetup />
    {:else}
      <SpotifyPage bind:this={spotifyPageRef} bind:showSetup />
    {/if}
  </div>
  
  <!-- Shared Bottom Controls -->
  {#if !route.includes('callback')}
    <BottomControls expanded={isExpanded} unmounting={isUnmounting} on:toggle={handleToggle}>
      <SpotifyBottomBarContent
        {isExpanded}
        {showSetup}
        {isAuthenticated}
        {nowPlayingTrack}
        onHideSetup={handleHideSetup}
        onConnect={handleConnect}
      />
    </BottomControls>
  {/if}
</main>
