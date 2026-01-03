<script>
  import Icon from "@iconify/svelte";
  import Loader from "../../components/Loader.svelte";
  import { accentColorStore, textColorClassStore } from "../../utils/theme.js";

  export let isExiting = false;
  export let isLoading = false;
  export let albums = [];
  export let onAlbumClick = (album) => {};

  $: accentColor = $accentColorStore;
  $: textClass = $textColorClassStore;
</script>

<div
  class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify</span>
  <span class="text-6xl font-[200] h-auto py-1 px-4">albums</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    {#if isLoading}
      <div class="flex flex-col gap-4 items-center justify-center my-24">
        <Loader />
      </div>
    {:else if !isLoading && albums.length > 0}
      {#each albums as album}
        <button
          class="flex flex-row gap-4 items-center w-full min-w-0"
          on:click={() => onAlbumClick(album)}
        >
          {#if album.images && album.images.length > 0}
            <img
              src={album.images[0].url}
              alt={album.name}
              class="w-16 h-16 object-cover flex-shrink-0"
            />
          {:else}
            <div
              class="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0"
            >
              <Icon
                icon="mdi:album"
                width="32"
                height="32"
                class="text-gray-400"
              />
            </div>
          {/if}

          <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
            <span
              class="text-2xl text-left font-[300] truncate w-full"
              title={album.name}
            >
              {album.name}
            </span>
            <span
              class="text-gray-400 text-left text-base font-[300] truncate w-full"
              title={album.artists?.map((a) => a.name).join(', ')}
            >
              {album.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
            </span>
          </div>
        </button>
      {/each}
    {:else if !isLoading}
      <div class="text-center py-12 mx-4">
        <Icon
          icon="mdi:album"
          width="64"
          height="64"
          class="text-gray-500 mb-4"
        />
        <h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
          No Albums Found
        </h3>
        <p
          class="text-gray-400 font-[300] justify-start flex text-left text-lg"
        >
          Save albums on Spotify to see them here.
        </p>
      </div>
    {/if}
  </div>
</div>

