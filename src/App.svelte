<script>
  import { onMount } from 'svelte';
  import { currentRoute, router } from './lib/router.js';
  import { App as CapacitorApp } from '@capacitor/app';
  import HomePage from './pages/HomePage.svelte';
  import AuthPage from './pages/AuthPage.svelte';
  import SpotifyPage from './pages/SpotifyPage.svelte';
  import NowPlayingPage from './pages/NowPlayingPage.svelte';
  import PlaylistsPage from './pages/PlaylistsPage.svelte';
  import PlaylistTracksPage from './pages/PlaylistTracksPage.svelte';
  import ArtistsPage from './pages/ArtistsPage.svelte';
  import ArtistTracksPage from './pages/ArtistTracksPage.svelte';
  import SpotifyCallback from './pages/SpotifyCallback.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import BottomControls from './components/BottomControls.svelte';
  import SpotifyBottomBarContent from './components/SpotifyBottomBarContent.svelte';
  import { bottomBarExpanded, bottomBarUnmounting } from './store/bottomBar.js';
  import { accountsStore } from './store/accounts.js';
  import { musicStore, currentTrack } from './store/music.js';
  
  let route = '/';
  let spotifyPageRef = null;
  let showSetup = false;
  let isExiting = false;
  let homePageIsExiting = false;
  let authPageRef = null;
  
  $: route = $currentRoute;
  $: console.log('📍 Current route:', route);
  
  // Track if bottom bar should be visible and handle exit animation
  let previousRoute = route;
  let isExitingBottomBar = false;
  
  // Track page exit animation for auth pages and HomePage
  $: {
    if (previousRoute !== route) {
      // Reset isExiting immediately so new pages don't get exit animation
      isExiting = false;
      
      // Check if we're leaving HomePage to go to an inner page
      const wasOnHomePage = previousRoute === '/' || previousRoute === '';
      const isInnerPage = route !== '/' && route !== '' && !route.includes('callback');
      
      if (wasOnHomePage && isInnerPage) {
        // Trigger HomePage exit animation
        homePageIsExiting = true;
        setTimeout(() => {
          homePageIsExiting = false;
        }, 200);
      }
      
      bottomBarExpanded.set(false);
      
      const hadBottomBar = (previousRoute === '/spotify' || previousRoute === '/now-playing' || previousRoute === '/playlists' || previousRoute.startsWith('/playlist/') || previousRoute === '/artists' || previousRoute.startsWith('/artist/')) && !previousRoute.includes('callback');
      const hasBottomBar = shouldShowBottomBar;
      
      if (hadBottomBar && !hasBottomBar) {
        // We're leaving a route with bottom bar, trigger exit animation
        isExitingBottomBar = true;
        bottomBarUnmounting.set(true);
        setTimeout(() => {
          isExitingBottomBar = false;
          bottomBarUnmounting.set(false);
        }, 300);
      }
      
      previousRoute = route;
    }
  }
  
  $: shouldShowBottomBar = (route === '/spotify' || route === '/now-playing' || route === '/playlists' || route.startsWith('/playlist/') || route === '/artists' || route.startsWith('/artist/')) && !route.includes('callback');
  
  // Subscribe to stores for bottom bar
  $: isExpanded = $bottomBarExpanded;
  $: isUnmounting = $bottomBarUnmounting;
  $: isAuthenticated = accountsStore.isAuthenticated('spotify');
  $: currentTrackData = $currentTrack;
  $: nowPlayingTrack = currentTrackData && currentTrackData.type === 'spotify' ? currentTrackData : null;
  
  
  // Compute viewState for bottom bar
  $: viewState = (() => {
    if (route === '/now-playing') {
      return 'now-playing';
    }
    if (route === '/playlists' || route.startsWith('/playlist/')) {
      return 'playlists';
    }
    if (route === '/artists' || route.startsWith('/artist/')) {
      return 'artists';
    }
    return 'library';
  })();
  
  function handleToggle(event) {
    bottomBarExpanded.set(event.detail.expanded);
  }
  
  function handleHideSetup() {
    showSetup = false;
    if (authPageRef && authPageRef.hideSetupPage) {
      authPageRef.hideSetupPage();
    }
  }
  
  function handleConnect() {
    if (authPageRef && authPageRef.connectSpotify) {
      authPageRef.connectSpotify();
    }
  }
  
  onMount(() => {
    // Reload accounts from storage on mount to ensure fresh auth state
    if (typeof window !== 'undefined') {
      accountsStore.loadFromStorage();
    }
    
    // Handle deep links (OAuth callback) - only in Capacitor
    if (window.Capacitor) {
      CapacitorApp.addListener('appUrlOpen', (data) => {
        try {
          console.log('🔗 Deep link received:', data.url);
          const url = new URL(data.url);
          if (url.href.includes('callback')) {
            // Extract query parameters from the deep link
            const search = url.search || '';
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
        router.goto(path || '/');
      }
    }
  });
  
</script>

<main class="w-full h-full relative">
  {#if !isAuthenticated}
    <!-- Auth Pages (no status bar or bottom bar) -->
    <div class="w-full h-full">
      {#if route.startsWith('/spotify/callback') || route.startsWith('/callback')}
        <SpotifyCallback />
      {:else}
        <AuthPage bind:this={authPageRef} bind:showSetup {isExiting} />
      {/if}
    </div>
  {:else}
    <!-- Authenticated Pages (with status bar and bottom bar) -->
    <!-- Custom Status Bar (no padding, flush with edges) -->
    {#if route !== '/' && route !== ''}
      <StatusBar />
    {/if}
    
    <!-- Main Content (with padding for status bar + 1rem padding around) -->
    <div class="w-full h-full content-container" style="padding-top: {route === '/' || route === '' ? '0' : '24px'};">
      {#if route.startsWith('/spotify/callback') || route.startsWith('/callback')}
        <SpotifyCallback />
      {:else if route === '/spotify'}
        <SpotifyPage bind:this={spotifyPageRef} {isExiting} />
      {:else if route === '/now-playing'}
        <NowPlayingPage {isExiting} />
      {:else if route === '/playlists'}
        <PlaylistsPage {isExiting} />
      {:else if route.startsWith('/playlist/')}
        <PlaylistTracksPage {isExiting} />
      {:else if route === '/artists'}
        <ArtistsPage {isExiting} />
      {:else if route.startsWith('/artist/')}
        <ArtistTracksPage {isExiting} />
      {:else if route === '/' || route === ''}
        <HomePage isExiting={homePageIsExiting} />
      {:else}
        <HomePage isExiting={homePageIsExiting} />
      {/if}
    </div>
    
    <!-- Shared Bottom Controls -->
    {#if shouldShowBottomBar || isExitingBottomBar}
      <BottomControls expanded={isExpanded} unmounting={isUnmounting || isExitingBottomBar} on:toggle={handleToggle}>
        <SpotifyBottomBarContent
          {isExpanded}
          {showSetup}
          {isAuthenticated}
          {nowPlayingTrack}
          {viewState}
          onHideSetup={handleHideSetup}
          onConnect={handleConnect}
        />
      </BottomControls>
    {/if}
  {/if}
</main>
