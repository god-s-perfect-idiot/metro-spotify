<script>
  import { onMount, tick } from "svelte";
  import { accentColorStore, textColorClassStore } from "../../utils/theme.js";
  import { accountsStore } from "../../store/accounts.js";
  import { musicStore } from "../../store/music.js";
  import { router } from "../../lib/router.js";
  import { addToast } from "../../store/toast.js";
  import Button from "../../components/Button.svelte";
  import Loader from "../../components/Loader.svelte";

  export let isExiting = false;
  export let isLoading = false;

  $: accentColor = $accentColorStore;
  $: textClass = $textColorClassStore;

  let username = "";
  let spotifyApi = null;

  onMount(async () => {
    await loadUserInfo();
  });

  async function loadUserInfo() {
    try {
      // First, try to get username from localStorage
      const storedUsername = localStorage.getItem("spotify_username");
      if (storedUsername) {
        username = storedUsername;
        return;
      }

      // If not in localStorage, fetch from API
      const token = accountsStore.getAccessToken("spotify");
      if (!token) {
        username = "";
        return;
      }

      // Initialize Spotify API if needed
      if (!spotifyApi) {
        const { default: SpotifyWebApi } = await import("spotify-web-api-js");
        spotifyApi = new SpotifyWebApi();
        spotifyApi.setAccessToken(token);
      }

      // Fetch user info
      const userInfo = await spotifyApi.getMe();
      username = userInfo.display_name || userInfo.id || "Spotify User";
      
      // Save to localStorage for next time
      localStorage.setItem("spotify_username", username);
    } catch (error) {
      console.error("Error loading user info:", error);
      username = "";
    }
  }

  async function handleLogout() {
    // Disconnect Spotify player if it exists
    if (window.spotifyPlayer) {
      try {
        await window.spotifyPlayer.disconnect();
      } catch (error) {
        console.error("Error disconnecting player:", error);
      }
      window.spotifyPlayer = null;
    }

    // Clear account data first
    accountsStore.logout("spotify");
    accountsStore.cleanupStorage("spotify");

    // Clear music store
    musicStore.clear();
    musicStore.setSpotifyApi(null);

    // Clear username from localStorage
    localStorage.removeItem("spotify_username");

    // Clear local state
    spotifyApi = null;
    username = "";

    // Wait for all reactive updates to complete
    await tick();

    // Force reload accounts from storage to ensure state is fresh
    accountsStore.loadFromStorage();
    
    // Wait again for reactive updates after reloading
    await tick();

    // Verify we're actually logged out before navigating
    const isStillAuthenticated = accountsStore.isAuthenticated("spotify");
    if (isStillAuthenticated) {
      console.error("Failed to logout - still authenticated");
      return;
    }

    // Show toast notification
    addToast("Logged out successfully");

    // Use window.location to force a full navigation which will ensure App.svelte re-evaluates
    // This is more reliable than router.replace for authentication state changes
    window.location.href = "/";
  }
</script>

<div
  class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify</span>
  <span class="text-6xl font-[200] h-auto py-1 px-4">settings</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    <div class="flex flex-col gap-1 mt-4">
      <span class="text-lg font-[300] text-green-600">account</span>
      {#if username}
        <span class="text-sm font-[300] text-[#a1a1a1]">You are currently logged in as {username}</span>
      {:else}
        <Loader />
      {/if}
      <Button text="Log Out" onClick={handleLogout} className="mt-2" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-lg font-[300] text-green-600">about app</span>
      <span class="text-sm font-[300] text-[#a1a1a1]">Metro Spotify v0.1.0</span
      >
    </div>
  </div>
</div>
