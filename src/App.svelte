<script>
  import { onMount } from "svelte";
  import { currentRoute, router } from "./lib/router.js";
  import { App as CapacitorApp } from "@capacitor/app";
  import HomePage from "./pages/HomePage.svelte";
  import CarouselHomePage from "./pages/CarouselHomePage.svelte";
  import AuthPage from "./pages/AuthPage.svelte";
  import SpotifyPage from "./pages/SpotifyPage.svelte";
  import NowPlayingPage from "./pages/NowPlayingPage.svelte";
  import PlayQueuePage from "./pages/PlayQueuePage.svelte";
  import PlaylistsPage from "./pages/PlaylistsPage.svelte";
  import PlaylistTracksPage from "./pages/PlaylistTracksPage.svelte";
  import ArtistsPage from "./pages/ArtistsPage.svelte";
  import ArtistTracksPage from "./pages/ArtistTracksPage.svelte";
  import AlbumsPage from "./pages/AlbumsPage.svelte";
  import AlbumTracksPage from "./pages/AlbumTracksPage.svelte";
  import PeoplePage from "./pages/PeoplePage.svelte";
  import UserPlaylistsPage from "./pages/UserPlaylistsPage.svelte";
  import SettingsPage from "./pages/SettingsPage.svelte";
  import SpotifyCallback from "./pages/SpotifyCallback.svelte";
  import SearchResultsPage from "./pages/SearchResultsPage.svelte";
  import SearchResultsTypePage from "./pages/SearchResultsTypePage.svelte";
  import StatusBar from "./components/StatusBar.svelte";
  import BottomControls from "./components/BottomControls.svelte";
  import SpotifyBottomBarContent from "./components/SpotifyBottomBarContent.svelte";
  import Notifier from "./components/Notifier.svelte";
  import { bottomBarExpanded, bottomBarUnmounting } from "./store/bottomBar.js";
  import { accountsStore } from "./store/accounts.js";
  import { musicStore, currentTrack } from "./store/music.js";
  import Loader from "./components/Loader.svelte";
  import { browser } from "./lib/browser.js";

  let route = "/";
  let spotifyPageRef = null;
  let showSetup = false;
  let isExiting = false;
  let homePageIsExiting = false;
  let authPageRef = null;

  $: route = $currentRoute;
  // Extract pathname for route matching (ignore query string and hash)
  $: routePath = route.split('?')[0].split('#')[0];
  $: console.log("📍 Current route:", route);

  // Track if bottom bar should be visible and handle exit animation
  let previousRoute = route;
  let isExitingBottomBar = false;

  // Track page exit animation for auth pages and HomePage
  $: {
    if (previousRoute !== route) {
      // Reset isExiting immediately so new pages don't get exit animation
      isExiting = false;

      // Check if we're leaving HomePage to go to an inner page
      const wasOnHomePage = previousRoute === "/" || previousRoute === "";
      const isInnerPage =
        route !== "/" && route !== "" && !route.includes("callback");

      if (wasOnHomePage && isInnerPage) {
        // Trigger HomePage exit animation
        homePageIsExiting = true;
        setTimeout(() => {
          homePageIsExiting = false;
        }, 200);
      }

      bottomBarExpanded.set(false);

      const hadBottomBar =
        (previousRoute === "/spotify" ||
          previousRoute === "/now-playing" ||
          previousRoute === "/play-queue" ||
          previousRoute === "/playlists" ||
          previousRoute.startsWith("/playlist/") ||
          previousRoute === "/artists" ||
          previousRoute.startsWith("/artist/") ||
          previousRoute === "/albums" ||
          previousRoute.startsWith("/album/") ||
          previousRoute === "/people" ||
          previousRoute.startsWith("/user/") ||
          previousRoute === "/settings" ||
          previousRoute.startsWith("/search/tracks") ||
          previousRoute.startsWith("/search/albums") ||
          previousRoute.startsWith("/search/artists") ||
          previousRoute.startsWith("/search/playlists") ||
          previousRoute.startsWith("/search")) &&
        !previousRoute.includes("callback");
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

  $: shouldShowBottomBar =
    (route === "/spotify" ||
      route === "/now-playing" ||
      route === "/play-queue" ||
      route === "/playlists" ||
      routePath.startsWith("/playlist/") ||
      route === "/artists" ||
      routePath.startsWith("/artist/") ||
      route === "/albums" ||
      routePath.startsWith("/album/") ||
      route === "/people" ||
      routePath.startsWith("/user/") ||
      route === "/settings" ||
      routePath.startsWith("/search/tracks") ||
      routePath.startsWith("/search/albums") ||
      routePath.startsWith("/search/artists") ||
      routePath.startsWith("/search/playlists") ||
      routePath.startsWith("/search")) &&
    !route.includes("callback");

  // Subscribe to stores for bottom bar
  $: isExpanded = $bottomBarExpanded;
  $: isUnmounting = $bottomBarUnmounting;
  $: isAuthenticated = accountsStore.isAuthenticatedSync("spotify");
  $: currentTrackData = $currentTrack;
  $: nowPlayingTrack =
    currentTrackData && currentTrackData.type === "spotify"
      ? currentTrackData
      : null;

  // Compute viewState for bottom bar
  $: viewState = (() => {
    if (route === "/now-playing") {
      return "now-playing";
    }
    if (route === "/play-queue") {
      return "play-queue";
    }
    if (route === "/playlists" || routePath.startsWith("/playlist/")) {
      return "playlists";
    }
    if (route === "/artists" || routePath.startsWith("/artist/")) {
      return "artists";
    }
    if (route === "/albums" || routePath.startsWith("/album/")) {
      return "albums";
    }
    if (route === "/people" || routePath.startsWith("/user/")) {
      return "people";
    }
    if (route === "/settings") {
      return "settings";
    }
    if (routePath.startsWith("/search")) {
      return "library";
    }
    return "library";
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
    if (typeof window !== "undefined") {
      accountsStore.loadFromStorage();
    }

    // Handle deep links (OAuth callback) - only in Capacitor
    if (window.Capacitor) {
      CapacitorApp.addListener("appUrlOpen", (data) => {
        try {
          console.log("🔗 Deep link received:", data.url);
          const url = new URL(data.url);
          if (url.href.includes("callback")) {
            // Extract query parameters from the deep link
            const search = url.search || "";
            router.goto("/spotify/callback" + search);
          }
        } catch (e) {
          console.error("Error parsing deep link:", e);
        }
      });
    }

    // Handle initial URL
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      console.log("🔍 Initial URL check:", { path, search, hash });

      // If we're on a callback URL, ensure we route to it properly
      if (path.includes("callback")) {
        const fullPath = path + search + (hash || "");
        console.log("🔗 Routing to callback:", fullPath);
        router.goto(fullPath);
      } else {
        router.goto(path || "/");
      }
    }

    // Initialize Metro Spotify web player globally if authenticated
    if (browser) {
      initializeMetroSpotifyPlayer();
    }
  });

  async function initializeMetroSpotifyPlayer() {
    if (!browser) return;
    
    // Check if player already exists
    if (window.spotifyPlayer) {
      console.log('✅ Metro Spotify player already initialized');
      return;
    }

    // Check if user is authenticated
    const hasToken = await accountsStore.hasValidToken('spotify');
    if (!hasToken) {
      console.log('⏭️ No Spotify token, skipping player initialization');
      return;
    }

    try {
      const token = await accountsStore.getAccessToken('spotify');
      console.log('🔄 Initializing Metro Spotify web player globally...');
      
      // Load Spotify Web Playback SDK script if not already loaded
      if (!window.Spotify) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sdk.scdn.co/spotify-player.js';
          script.async = true;
          script.onload = () => {
            console.log('✅ Spotify Web Playback SDK loaded');
            resolve();
          };
          script.onerror = () => {
            console.error('❌ Failed to load Spotify Web Playback SDK');
            reject(new Error('Failed to load SDK'));
          };
          document.head.appendChild(script);
        });
      }

      // Setup the player
      if (window.Spotify) {
        setupMetroSpotifyPlayer(token);
      }
    } catch (error) {
      console.error('Error initializing Metro Spotify player:', error);
    }
  }

  function setupMetroSpotifyPlayer(initialToken) {
    if (!window.Spotify || !browser) return;

    try {
      // Don't create if already exists
      if (window.spotifyPlayer) {
        console.log('✅ Metro Spotify player already exists');
        return;
      }

      const player = new window.Spotify.Player({
        name: 'Metro Spotify',
        getOAuthToken: async (cb) => {
          const hasToken = await accountsStore.hasValidToken('spotify');
          if (hasToken) {
            const currentToken = await accountsStore.getAccessToken('spotify');
            cb(currentToken);
          } else {
            cb(initialToken);
          }
        },
        volume: 0.5
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('❌ Metro Spotify Player initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('❌ Metro Spotify Player authentication error:', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('❌ Metro Spotify Player account error:', message);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('❌ Metro Spotify Player playback error:', message);
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Metro Spotify Web Player ready with device ID:', device_id);
        // Immediately set the device ID in music store
        musicStore.setSelectedDeviceId(device_id);
        console.log('✅ Metro Spotify device ID set in music store:', device_id);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.warn('⚠️ Metro Spotify Web Player not ready, device_id:', device_id);
      });

      console.log('🔄 Attempting to connect Metro Spotify web player...');
      player.connect().then((success) => {
        if (success) {
          console.log('✅ Metro Spotify Web Player connected successfully');
        } else {
          console.error('❌ Metro Spotify Web Player connection returned false');
        }
      }).catch((error) => {
        console.error('❌ Failed to connect Metro Spotify Web Player:', error);
      });

      window.spotifyPlayer = player;
      console.log('✅ Metro Spotify player created and stored in window.spotifyPlayer');
    } catch (error) {
      console.error('Error setting up Metro Spotify Web Player:', error);
    }
  }
</script>

<main class="w-full h-full relative">
  {#if !isAuthenticated}
    <!-- Auth Pages (no status bar or bottom bar) -->
    <div class="w-full h-full">
      {#if route.startsWith("/spotify/callback") || route.startsWith("/callback")}
        <SpotifyCallback />
      {:else}
        <AuthPage bind:this={authPageRef} bind:showSetup {isExiting} />
      {/if}
    </div>
  {:else}
    <!-- Authenticated Pages (with status bar and bottom bar) -->
    <!-- Custom Status Bar (no padding, flush with edges) -->
    {#if route !== "/" && route !== ""}
      <StatusBar />
    {/if}

    <!-- Main Content (with padding for status bar + 1rem padding around) -->
    <div class="w-full h-full content-container" style="padding-top: {route === '/' || route === '' ? '0' : '2rem'};">
      {#if routePath.startsWith('/spotify/callback') || routePath.startsWith('/callback')}
        <SpotifyCallback />
      {:else if route === '/spotify'}
        <SpotifyPage bind:this={spotifyPageRef} {isExiting} />
      {:else if route === '/now-playing'}
        <NowPlayingPage {isExiting} />
      {:else if route === '/play-queue'}
        <PlayQueuePage {isExiting} />
      {:else if route === '/playlists'}
        <PlaylistsPage {isExiting} />
      {:else if routePath.startsWith('/playlist/')}
        <PlaylistTracksPage {isExiting} />
      {:else if route === '/artists'}
        <ArtistsPage {isExiting} />
      {:else if routePath.startsWith('/artist/')}
        <ArtistTracksPage {isExiting} />
      {:else if route === '/albums'}
        <AlbumsPage {isExiting} />
      {:else if routePath.startsWith('/album/')}
        <AlbumTracksPage {isExiting} />
      {:else if route === '/people'}
        <PeoplePage {isExiting} />
      {:else if routePath.startsWith('/user/')}
        <UserPlaylistsPage {isExiting} />
      {:else if route === '/settings'}
        <SettingsPage {isExiting} />
      {:else if routePath.startsWith('/search/tracks')}
        <SearchResultsTypePage {isExiting} type="tracks" />
      {:else if routePath.startsWith('/search/albums')}
        <SearchResultsTypePage {isExiting} type="albums" />
      {:else if routePath.startsWith('/search/artists')}
        <SearchResultsTypePage {isExiting} type="artists" />
      {:else if routePath.startsWith('/search/playlists')}
        <SearchResultsTypePage {isExiting} type="playlists" />
      {:else if routePath.startsWith('/search')}
        <SearchResultsPage {isExiting} />
      {:else if route === '/' || route === ''}
        <CarouselHomePage isExiting={homePageIsExiting} />
      {:else}
        <CarouselHomePage isExiting={homePageIsExiting} />
      {/if}
    </div>

    <!-- Shared Bottom Controls -->
    {#if shouldShowBottomBar || isExitingBottomBar}
      <BottomControls
        expanded={isExpanded}
        unmounting={isUnmounting || isExitingBottomBar}
        on:toggle={handleToggle}
      >
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

  <!-- Toast Notifications -->
  <Notifier />
</main>
