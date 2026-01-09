<script>
  import { onMount } from "svelte";
  import { browser } from "../lib/browser.js";
  import { accountsStore } from "../store/accounts.js";
  import { musicStore } from "../store/music.js";
  import { router } from "../lib/router.js";
  import { addToast } from "../store/toast.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";
  import Loader from "../components/Loader.svelte";

  export let isExiting = false;

  let spotifyApi = null;
  let isLoading = false;
  let searchQuery = "";
  let searchResults = {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
  };

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;

  onMount(async () => {
    if (browser) {
      // Get search query from URL
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

      const metroPlayer = availableDevices.find(
        (device) => device.name === "Metro Spotify"
      );

      if (metroPlayer) {
        musicStore.setSelectedDeviceId(metroPlayer.id);
      } else if (availableDevices.length > 0) {
        musicStore.setSelectedDeviceId(availableDevices[0].id);
      }
    } catch (error) {
      console.error("Error loading available devices:", error);
    }
  }

  async function performSearch(query) {
    if (!spotifyApi || !query.trim()) return;

    isLoading = true;
    try {
      // Search for all types: tracks, albums, artists, playlists
      const results = await spotifyApi.search(
        query,
        ["track", "album", "artist", "playlist"],
        {
          limit: 20,
        }
      );

      // Filter out null/undefined items from search results
      searchResults = {
        tracks: (results.tracks?.items || []).filter(
          (item) => item && item.name
        ),
        albums: (results.albums?.items || []).filter(
          (item) => item && item.name
        ),
        artists: (results.artists?.items || []).filter(
          (item) => item && item.name
        ),
        playlists: (results.playlists?.items || []).filter(
          (item) => item && item.name
        ),
      };
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
      if (error.status === 404) {
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
    router.goto("/");
  }
</script>

<div class="page-holder">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
  >
    <!-- Header -->
    <div class="flex items-center gap-4 px-4 pt-4 pb-2 flex-shrink-0">
      <h1 class="{textClass} text-4xl font-[200]">
        {searchQuery || "search results"}
      </h1>
    </div>

    <div
      class="flex flex-col gap-8 pb-24 mt-4 overflow-y-auto overflow-x-hidden px-4 flex-1 min-h-0"
    >
      {#if isLoading}
        <div class="flex flex-col gap-4 items-center justify-center my-24">
          <Loader />
        </div>
      {:else if searchQuery}
          <!-- Tracks Section -->
          {#if searchResults.tracks.length > 0}
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-[300] text-green-600">tracks</h2>
            <div class="flex gap-4 overflow-x-auto overflow-y-hidden -mx-4 px-4" style="scrollbar-width: none; -ms-overflow-style: none;">
            {#each searchResults.tracks.slice(0, 6) as track}
              {@const trackName = track?.name || "Unknown Track"}
              {@const trackArtists =
                track?.artists
                  ?.filter((a) => a?.name)
                  .map((a) => a.name)
                  .join(", ") || "Unknown Artist"}
              <button
                class="flex flex-col gap-2 items-start flex-shrink-0 w-40"
                on:click={() => playTrack(track)}
              >
                {#if track?.album?.images && track.album.images.length > 0}
                  <img
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    class="w-40 h-40 object-cover aspect-square"
                  />
                {:else}
                  <div
                    class="w-40 h-40 rounded-lg bg-gray-700 flex items-center justify-center aspect-square"
                  >
                    <Icon
                      icon="mdi:music"
                      width="24"
                      height="24"
                      class="text-gray-400"
                    />
                  </div>
                {/if}

                <div
                  class="flex flex-col min-w-0 flex-1 items-start overflow-hidden"
                >
                  <span
                    class="{textClass} text-base text-left font-[300] truncate w-full max-w-40"
                    title={trackName}
                  >
                    {trackName}
                  </span>
                  <span
                    class="text-gray-400 text-left text-sm font-[300] truncate w-full max-w-40"
                    title={trackArtists}
                  >
                    {trackArtists}
                  </span>
                </div>
              </button>
            {/each}
            </div>
            {#if searchResults.tracks.length > 6}
              <button
                class="{textClass} text-base font-[300] text-left py-1 border-2 px-2 self-start border-white"
                on:click={() =>
                  router.goto(
                    `/search/tracks?q=${encodeURIComponent(searchQuery)}`
                  )}
              >
                show all
              </button>
            {/if}
          </div>
        {/if}

        <!-- Artists Section -->
        {#if searchResults.artists.length > 0}
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-[300] text-green-600">artists</h2>
            <div class="flex gap-4 overflow-x-auto overflow-y-hidden -mx-4 px-4" style="scrollbar-width: none; -ms-overflow-style: none;">
            {#each searchResults.artists.slice(0, 6) as artist}
              {@const artistName = artist?.name || "Unknown Artist"}
              <button
                class="flex flex-col gap-2 items-start flex-shrink-0 w-40"
                on:click={() => navigateToArtist(artist?.id)}
              >
                {#if artist?.images && artist.images.length > 0}
                  <img
                    src={artist.images[0].url}
                    alt={artistName}
                    class="w-40 h-40 object-cover aspect-square"
                  />
                {:else}
                  <div
                    class="w-40 h-40 bg-gray-700 flex items-center justify-center aspect-square"
                  >
                    <Icon
                      icon="material-symbols:artist"
                      width="24"
                      height="24"
                      class="text-gray-400"
                    />
                  </div>
                {/if}

                <div
                  class="flex flex-col min-w-0 flex-1 items-start overflow-hidden w-full"
                >
                  <span
                    class="{textClass} text-base text-left font-[300] truncate w-full max-w-32"
                    title={artistName}
                  >
                    {artistName}
                  </span>
                </div>
              </button>
            {/each}
            </div>
            {#if searchResults.artists.length > 6}
              <button
                class="{textClass} text-base font-[300] text-left py-1 border-2 px-2 self-start border-white"
                on:click={() =>
                  router.goto(
                    `/search/artists?q=${encodeURIComponent(searchQuery)}`
                  )}
              >
                show all
              </button>
            {/if}
          </div>
        {/if}

        <!-- Albums Section -->
        {#if searchResults.albums.length > 0}
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-[300] text-green-600">albums</h2>
            <div class="flex gap-4 overflow-x-auto overflow-y-hidden -mx-4 px-4" style="scrollbar-width: none; -ms-overflow-style: none;">
            {#each searchResults.albums.slice(0, 6) as album}
              {@const albumName = album?.name || "Unknown Album"}
              {@const albumArtists =
                album?.artists
                  ?.filter((a) => a?.name)
                  .map((a) => a.name)
                  .join(", ") || "Unknown Artist"}
              <button
                class="flex flex-col gap-2 items-start flex-shrink-0 w-40"
                on:click={() => navigateToAlbum(album?.id)}
              >
                {#if album?.images && album.images.length > 0}
                  <img
                    src={album.images[0].url}
                    alt={albumName}
                    class="w-40 h-40 object-cover aspect-square"
                  />
                {:else}
                  <div
                    class="w-40 h-40 rounded-lg bg-gray-700 flex items-center justify-center aspect-square"
                  >
                    <Icon
                      icon="mdi:album"
                      width="24"
                      height="24"
                      class="text-gray-400"
                    />
                  </div>
                {/if}

                <div
                  class="flex flex-col min-w-0 flex-1 items-start overflow-hidden w-full"
                >
                  <span
                    class="{textClass} text-base text-left font-[300] truncate w-full max-w-32"
                    title={albumName}
                  >
                    {albumName}
                  </span>
                  <span
                    class="text-gray-400 text-left text-sm font-[300] truncate w-full max-w-32"
                    title={albumArtists}
                  >
                    {albumArtists}
                  </span>
                </div>
              </button>
            {/each}
            </div>
            {#if searchResults.albums.length > 6}
              <button
                class="{textClass} text-base font-[300] text-left py-1 border-2 px-2 self-start border-white"
                on:click={() =>
                  router.goto(
                    `/search/albums?q=${encodeURIComponent(searchQuery)}`
                  )}
              >
                show all
              </button>
            {/if}
          </div>
        {/if}

        <!-- Playlists Section -->
        {#if searchResults.playlists.length > 0}
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-[300] text-green-600">playlists</h2>
            <div class="flex gap-4 overflow-x-auto overflow-y-hidden -mx-4 px-4" style="scrollbar-width: none; -ms-overflow-style: none;">
            {#each searchResults.playlists.slice(0, 6) as playlist}
              {@const playlistName = playlist?.name || "Unknown Playlist"}
              {@const playlistOwner =
                playlist?.owner?.display_name ||
                playlist?.owner?.id ||
                "Unknown Owner"}
              <button
                class="flex flex-col gap-2 items-start flex-shrink-0 w-40"
                on:click={() => navigateToPlaylist(playlist?.id)}
              >
                {#if playlist?.images && playlist.images.length > 0}
                  <img
                    src={playlist.images[0].url}
                    alt={playlistName}
                    class="w-40 h-40 object-cover aspect-square"
                  />
                {:else}
                  <div
                    class="w-40 h-40 rounded-lg bg-gray-700 flex items-center justify-center aspect-square"
                  >
                    <Icon
                      icon="dashicons:playlist-audio"
                      width="24"
                      height="24"
                      class="text-gray-400"
                    />
                  </div>
                {/if}

                <div
                  class="flex flex-col min-w-0 flex-1 items-start overflow-hidden w-full"
                >
                  <span
                    class="{textClass} text-base text-left font-[300] truncate w-full max-w-32"
                    title={playlistName}
                  >
                    {playlistName}
                  </span>
                  <span
                    class="text-gray-400 text-left text-sm font-[300] truncate w-full max-w-32"
                    title={playlistOwner}
                  >
                    {playlistOwner}
                  </span>
                </div>
              </button>
            {/each}
            </div>
            {#if searchResults.playlists.length > 6}
              <button
                class="{textClass} text-base font-[300] text-left py-1 border-2 px-2 self-start border-white"
                on:click={() =>
                  router.goto(
                    `/search/playlists?q=${encodeURIComponent(searchQuery)}`
                  )}
              >
                show all
              </button>
            {/if}
          </div>
        {/if}

        <!-- No Results -->
        {#if searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.artists.length === 0 && searchResults.playlists.length === 0}
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
      {/if}
    </div>
  </div>
</div>
