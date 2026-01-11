<script>
  import { onMount } from "svelte";
  import { browser, getPlayerId } from "../lib/browser.js";
  import { accountsStore } from "../store/accounts.js";
  import { musicStore } from "../store/music.js";
  import { router } from "../lib/router.js";
  import { addToast } from "../store/toast.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";
  import Loader from "../components/Loader.svelte";

  export let isExiting = false;
  export let type = "tracks"; // tracks, albums, artists, playlists

  let spotifyApi = null;
  let isLoading = false;
  let searchQuery = "";
  let results = [];

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;

  $: typeLabel = type === "tracks" ? "tracks" : 
                 type === "albums" ? "albums" :
                 type === "artists" ? "artists" :
                 type === "playlists" ? "playlists" : type;

  onMount(async () => {
    if (browser) {
      const urlParams = new URLSearchParams(window.location.search);
      searchQuery = urlParams.get("q") || "";

      if (searchQuery) {
        // Set loading state immediately to show loader instead of "no results"
        isLoading = true;
        await initializeSpotifyApi();
        await performSearch(searchQuery);
      }
    }
  });

  async function initializeSpotifyApi() {
    try {
      const hasToken = await accountsStore.hasValidToken("spotify");
      if (!hasToken) {
        addToast("Please log in to Spotify to search.");
        router.goto("/");
        return;
      }

      const token = await accountsStore.getAccessToken("spotify");
      const { default: SpotifyWebApi } = await import("spotify-web-api-js");
      spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(token);
      // Set Spotify API in music store for playback
      musicStore.setSpotifyApi(spotifyApi);
      // Load available devices
      await loadAvailableDevices();
    } catch (error) {
      console.error("Error initializing Spotify API:", error);
      addToast("Error connecting to Spotify.");
    }
  }

  async function loadAvailableDevices() {
    if (!spotifyApi) return;

    try {
      const devices = await spotifyApi.getMyDevices();
      const availableDevices = devices.devices || [];

      // Get player ID to match the correct device for this tab
      const playerId = getPlayerId();
      const metroPlayer = availableDevices.find(
        (device) => {
          if (playerId) {
            // Match device name that starts with "Metro Spotify" and contains the player ID
            return device.name === `Metro Spotify (${playerId})` || device.name.startsWith('Metro Spotify');
          } else {
            // Fallback to exact match or pattern match if no player ID
            return device.name === 'Metro Spotify' || device.name.startsWith('Metro Spotify');
          }
        }
      );

      if (metroPlayer) {
        musicStore.setSelectedDeviceId(metroPlayer.id);
      } else {
        // DO NOT fall back to other devices - only use Metro Spotify
        musicStore.setSelectedDeviceId(null);
      }
    } catch (error) {
      console.error("Error loading available devices:", error);
    }
  }

  async function performSearch(query) {
    if (!spotifyApi || !query.trim()) return;

    isLoading = true;
    try {
      // Convert plural type to singular for Spotify API
      const apiType = type === "tracks" ? "track" :
                     type === "albums" ? "album" :
                     type === "artists" ? "artist" :
                     type === "playlists" ? "playlist" : type;
      const searchTypes = [apiType];
      const resultsData = await spotifyApi.search(query, searchTypes, {
        limit: 50,
      });

      if (type === "tracks") {
        results = (resultsData.tracks?.items || []).filter(
          (item) => item && item.name
        );
      } else if (type === "albums") {
        results = (resultsData.albums?.items || []).filter(
          (item) => item && item.name
        );
      } else if (type === "artists") {
        results = (resultsData.artists?.items || []).filter(
          (item) => item && item.name
        );
      } else if (type === "playlists") {
        results = (resultsData.playlists?.items || []).filter(
          (item) => item && item.name
        );
      }
    } catch (error) {
      console.error("Error searching Spotify:", error);
      addToast("Error performing search. Please try again.");
    } finally {
      isLoading = false;
    }
  }

  async function playTrack(track) {
    if (!spotifyApi || !track || !track.id) return;

    try {
      const trackWithType = {
        ...track,
        type: "spotify",
      };
      await musicStore.playTrack(trackWithType);
      router.goto("/now-playing");
    } catch (error) {
      console.error("Error playing track:", error);
      if (error.message && error.message.includes('Metro Spotify device not found')) {
        addToast('Metro Spotify device not found. Please wait a moment and try again.');
      } else if (error.status === 404) {
        addToast("No active Spotify device found.");
      } else if (error.status === 403) {
        addToast("Playback requires Spotify Premium.");
      } else {
        addToast("Error playing track.");
      }
    }
  }

  function navigateToAlbum(albumId) {
    if (!albumId) return;
    router.goto(`/album/${albumId}`);
  }

  function navigateToArtist(artistId) {
    if (!artistId) return;
    router.goto(`/artist/${artistId}`);
  }

  function navigateToPlaylist(playlistId) {
    if (!playlistId) return;
    router.goto(`/playlist/${playlistId}`);
  }

  function goBack() {
    router.goto(`/search?q=${encodeURIComponent(searchQuery)}`);
  }
</script>

<div class="page-holder">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
  >
    <!-- Header -->
    <div class="flex items-center gap-4 px-4 pt-4 pb-2 flex-shrink-0">
      <h1 class="{textClass} text-4xl font-[200]">{typeLabel}</h1>
    </div>

    <div
      class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 flex-1 min-h-0"
    >
      {#if isLoading}
        <div class="flex flex-col gap-4 items-center justify-center my-24">
          <Loader />
        </div>
      {:else if results.length > 0}
        {#if type === "tracks"}
          {#each results as track}
            {@const trackName = track?.name || "Unknown Track"}
            {@const trackArtists =
              track?.artists
                ?.filter((a) => a?.name)
                .map((a) => a.name)
                .join(", ") || "Unknown Artist"}
            <button
              class="flex flex-row gap-4 items-center w-full min-w-0"
              on:click={() => playTrack(track)}
            >
              {#if track?.album?.images && track.album.images.length > 0}
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  class="w-16 h-16 object-cover flex-shrink-0"
                />
              {:else}
                <div
                  class="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0"
                >
                  <Icon
                    icon="mdi:music"
                    width="24"
                    height="24"
                    class="text-gray-400"
                  />
                </div>
              {/if}

              <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
                <span
                  class="{textClass} text-2xl text-left font-[300] truncate w-full"
                  title={trackName}
                >
                  {trackName}
                </span>
                <span
                  class="text-gray-400 text-left text-base font-[300] truncate w-full"
                  title={trackArtists}
                >
                  {trackArtists}
                </span>
              </div>
            </button>
          {/each}
        {:else if type === "artists"}
          {#each results as artist}
            {@const artistName = artist?.name || "Unknown Artist"}
            <button
              class="flex flex-row gap-4 items-center w-full min-w-0"
              on:click={() => navigateToArtist(artist?.id)}
            >
              {#if artist?.images && artist.images.length > 0}
                <img
                  src={artist.images[0].url}
                  alt={artistName}
                  class="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              {:else}
                <div
                  class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                >
                  <Icon
                    icon="material-symbols:artist"
                    width="24"
                    height="24"
                    class="text-gray-400"
                  />
                </div>
              {/if}

              <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
                <span
                  class="{textClass} text-2xl text-left font-[300] truncate w-full"
                  title={artistName}
                >
                  {artistName}
                </span>
              </div>
            </button>
          {/each}
        {:else if type === "albums"}
          {#each results as album}
            {@const albumName = album?.name || "Unknown Album"}
            {@const albumArtists =
              album?.artists
                ?.filter((a) => a?.name)
                .map((a) => a.name)
                .join(", ") || "Unknown Artist"}
            <button
              class="flex flex-row gap-4 items-center w-full min-w-0"
              on:click={() => navigateToAlbum(album?.id)}
            >
              {#if album?.images && album.images.length > 0}
                <img
                  src={album.images[0].url}
                  alt={albumName}
                  class="w-16 h-16 object-cover flex-shrink-0"
                />
              {:else}
                <div
                  class="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0"
                >
                  <Icon
                    icon="mdi:album"
                    width="24"
                    height="24"
                    class="text-gray-400"
                  />
                </div>
              {/if}

              <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
                <span
                  class="{textClass} text-2xl text-left font-[300] truncate w-full"
                  title={albumName}
                >
                  {albumName}
                </span>
                <span
                  class="text-gray-400 text-left text-base font-[300] truncate w-full"
                  title={albumArtists}
                >
                  {albumArtists}
                </span>
              </div>
            </button>
          {/each}
        {:else if type === "playlists"}
          {#each results as playlist}
            {@const playlistName = playlist?.name || "Unknown Playlist"}
            {@const playlistOwner =
              playlist?.owner?.display_name ||
              playlist?.owner?.id ||
              "Unknown Owner"}
            <button
              class="flex flex-row gap-4 items-center w-full min-w-0"
              on:click={() => navigateToPlaylist(playlist?.id)}
            >
              {#if playlist?.images && playlist.images.length > 0}
                <img
                  src={playlist.images[0].url}
                  alt={playlistName}
                  class="w-16 h-16 object-cover flex-shrink-0"
                />
              {:else}
                <div
                  class="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0"
                >
                  <Icon
                    icon="dashicons:playlist-audio"
                    width="24"
                    height="24"
                    class="text-gray-400"
                  />
                </div>
              {/if}

              <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
                <span
                  class="{textClass} text-2xl text-left font-[300] truncate w-full"
                  title={playlistName}
                >
                  {playlistName}
                </span>
                <span
                  class="text-gray-400 text-left text-base font-[300] truncate w-full"
                  title={playlistOwner}
                >
                  {playlistOwner}
                </span>
              </div>
            </button>
          {/each}
        {/if}
      {:else}
        <div class="text-center py-12 mx-4">
          <Icon
            icon="mdi:magnify"
            width="64"
            height="64"
            class="text-gray-500 mb-4"
          />
          <h3
            class="{textClass} text-xl font-semibold mb-2 justify-center flex font-[300]"
          >
            No Results Found
          </h3>
          <p
            class="text-gray-400 font-[300] justify-center flex text-left text-lg"
          >
            Try a different search query.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>



