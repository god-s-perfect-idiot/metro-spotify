<script>
  import Icon from "@iconify/svelte";

  export let nowPlayingTrack = null;
  export let currentTime = 0;
  export let duration = 0;
  export let seekValue = 0;
  export let isPlayingState = false;
  export let onPlayPrevious = () => {};
  export let onPlayNext = () => {};
  export let onTogglePlayPause = () => {};

  let tappedControlId = null;

  function handleControlTap(controlId) {
    tappedControlId = controlId;
    setTimeout(() => {
      tappedControlId = null;
    }, 200);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatImageUrl(images, size = 300) {
    if (!images || images.length === 0) return null;
    return images.find((img) => img.width >= size)?.url || images[0].url;
  }
</script>

<div class="flex flex-col w-full h-full font-[400] px-4 pt-24">
  <span class="text-5xl font-[300] h-auto py-1">now playing</span>

  {#if nowPlayingTrack}
    <div class="flex flex-col gap-2 mt-4">
      <!-- Album Art -->
      <div class="flex justify-start items-center w-full max-w-[60%]">
        {#if nowPlayingTrack?.album?.images}
          <img
            src={formatImageUrl(nowPlayingTrack.album.images, 300)}
            alt={nowPlayingTrack.album.name}
            class="w-full aspect-square object-cover"
          />
        {:else}
          <div
            class="w-full aspect-square bg-gray-700 flex items-center justify-center"
          >
            <Icon
              icon="mdi:music"
              width="128"
              height="128"
              class="text-gray-400"
            />
          </div>
        {/if}
      </div>

      <!-- Seek Bar -->
      <div class="flex flex-col gap-2 w-full max-w-[60%]">
        <div class="relative w-full h-1 bg-gray-200">
          <div
            class="absolute top-0 left-0 h-full bg-green-600 transition-all duration-100 ease-in-out"
            style="width: {seekValue}%"
          ></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <!-- Song Info -->
      <div
        class="flex flex-col gap-1 w-full max-w-[60%] self-start justify-start"
      >
        <span
          class="text-2xl font-[300] truncate"
          title={nowPlayingTrack?.name}
        >
          {nowPlayingTrack?.name}
        </span>
        <span
          class="text-lg text-gray-400 truncate"
          title={nowPlayingTrack?.artists?.map((a) => a.name).join(", ")}
        >
          {nowPlayingTrack?.artists?.map((a) => a.name).join(", ")}
        </span>
      </div>

      <!-- Playback Controls -->
      <div class="flex flex-row justify-between gap-4 mt-2 w-full max-w-[60%] pb-2">
        <button
          class="flex items-center justify-center border-2 border-white rounded-full p-1 w-10 h-10 control-button"
          class:tapped={tappedControlId === 'previous'}
          on:click={() => {
            handleControlTap('previous');
            onPlayPrevious();
          }}
          on:touchstart={() => handleControlTap('previous')}
        >
          <Icon icon="mdi:skip-previous" width="24" height="24" />
        </button>
        <button
          class="flex items-center justify-center border-2 border-white rounded-full p-1 w-10 h-10 control-button"
          class:tapped={tappedControlId === 'playpause'}
          on:click={() => {
            handleControlTap('playpause');
            onTogglePlayPause();
          }}
          on:touchstart={() => handleControlTap('playpause')}
        >
          <!-- Always render both icons to preload them, but only show the active one -->
          <Icon
            icon="mdi:play"
            width="28"
            height="28"
            class={isPlayingState ? "hidden" : ""}
            style={isPlayingState ? "position: absolute; visibility: hidden;" : ""}
          />
          <Icon
            icon="mdi:pause"
            width="28"
            height="28"
            class={isPlayingState === false ? "hidden" : ""}
            style={isPlayingState === false ? "position: absolute; visibility: hidden;" : ""}
          />
        </button>
        <button
          class="flex items-center justify-center border-2 border-white rounded-full p-1 w-10 h-10 control-button"
          class:tapped={tappedControlId === 'next'}
          on:click={() => {
            handleControlTap('next');
            onPlayNext();
          }}
          on:touchstart={() => handleControlTap('next')}
        >
          <Icon icon="mdi:skip-next" width="24" height="24" />
        </button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-start justify-center mt-4 gap-2 max-w-[60%]">
      <div class="w-full h-64 bg-gray-700 flex items-center justify-center">
        <Icon icon="mdi:music" width="128" height="128" class="text-gray-400" />
      </div>
      <p class="text-gray-400 text-lg font-[200]">
        No track is currently playing
      </p>
    </div>
  {/if}
</div>

<style>
  .control-button {
    transition: transform 0.1s ease-out;
  }
  
  .control-button.tapped {
    transform: translate(2px, 2px);
  }
</style>
