<script>
  import Icon from "@iconify/svelte";
  import Loader from "../../components/Loader.svelte";
  import { accentColorStore, textColorClassStore } from "../../utils/theme.js";

  export let isExiting = false;
  export let isLoading = false;
  export let userName = '';
  export let playlists = [];
  export let onPlaylistClick = (playlist) => {};

  let tappedPlaylistId = null;

  function handlePlaylistTap(playlist) {
    // Create a unique ID for the playlist item
    const playlistId = `${playlist.id}-${playlist.name}`;
    tappedPlaylistId = playlistId;

    // Reset after animation completes
    setTimeout(() => {
      tappedPlaylistId = null;
    }, 200);
  }

  $: accentColor = $accentColorStore;
  $: textClass = $textColorClassStore;
</script>

<div
  class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase truncate mt-2" title={userName}>{userName}</span>
  <span class="text-6xl font-[200] h-auto py-1 px-4">playlists</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    {#if isLoading}
      <div class="flex flex-col gap-4 items-center justify-center my-24">
        <Loader />
      </div>
    {:else if !isLoading && playlists.length > 0}
      {#each playlists as playlist}
        {@const playlistId = `${playlist.id}-${playlist.name}`}
        <button
          class="flex flex-row gap-4 items-center w-full min-w-0 playlist-item"
          class:tapped={tappedPlaylistId === playlistId}
          on:click={() => {
            handlePlaylistTap(playlist);
            onPlaylistClick(playlist);
          }}
          on:touchstart={() => handlePlaylistTap(playlist)}
        >
          {#if playlist.images && playlist.images.length > 0}
            <img
              src={playlist.images[0].url}
              alt={playlist.name}
              class="w-16 h-16 object-cover flex-shrink-0"
            />
          {:else}
            <div
              class="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0"
            >
              <Icon
                icon="dashicons:playlist-audio"
                width="32"
                height="32"
                class="text-gray-400"
              />
            </div>
          {/if}

          <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
            <span
              class="text-2xl text-left font-[300] truncate w-full"
              title={playlist.name}
            >
              {playlist.name}
            </span>
            <span
              class="text-gray-400 text-left text-base font-[300] truncate w-full"
              title={playlist.description ||
                `${playlist.tracks?.total || 0} tracks`}
            >
              {playlist.description || `${playlist.tracks?.total || 0} tracks`}
            </span>
          </div>
        </button>
      {/each}
    {:else if !isLoading}
      <div class="text-center py-12 mx-4">
        <Icon
          icon="dashicons:playlist-audio"
          width="64"
          height="64"
          class="text-gray-500 mb-4"
        />
        <h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
          No Playlists Found
        </h3>
        <p
          class="text-gray-400 font-[300] justify-start flex text-left text-lg"
        >
          This user doesn't have any public playlists.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .playlist-item {
    transition: transform 0.1s ease-out;
  }

  .playlist-item.tapped {
    transform: translate(2px, 2px);
  }
</style>

