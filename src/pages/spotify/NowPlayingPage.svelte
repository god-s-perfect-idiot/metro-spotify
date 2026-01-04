<script>
  import Icon from "@iconify/svelte";

  export let isExiting = false;
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

<div
  class="flex flex-col pt-4 w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase">spotify</span>
  <span class="text-6xl font-[300] h-auto py-1 px-4">now playing</span>
  <div class="flex flex-col gap-2 mb-16 overflow-x-hidden px-4">
    <!-- Album Art -->
    <div class="flex w-72 h-72 justify-center items-center mt-4">
      {#if nowPlayingTrack?.album?.images}
        <img
          src={formatImageUrl(nowPlayingTrack.album.images, 300)}
          alt={nowPlayingTrack.album.name}
          class="w-72 h-72 object-cover"
        />
      {:else}
        <div class="w-72 h-72 bg-gray-700 flex items-center justify-center">
          <Icon
            icon="mdi:music"
            width="168"
            height="168"
            class="text-gray-400"
          />
        </div>
      {/if}
    </div>

    <!-- Seek Bar -->
    <div class="flex flex-col gap-2 w-72 max-w-md">
      <div class="relative w-full h-2 bg-gray-200">
        <div
          class="absolute top-0 left-0 h-full bg-green-600 transition-all duration-100 ease-in-out"
          style="width: {seekValue}%"
        ></div>
      </div>
      <div class="flex justify-between text-sm text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>

    <!-- Song Info -->
    <div class="flex flex-col gap-1 w-72 max-w-full">
      <span
        class="text-2xl font-[300] mt-2 truncate"
        title={nowPlayingTrack?.name}>{nowPlayingTrack?.name}</span
      >
      <span
        class="text-lg text-gray-400 truncate"
        title={nowPlayingTrack?.artists?.map((a) => a.name).join(", ")}
        >{nowPlayingTrack?.artists?.map((a) => a.name).join(", ")}</span
      >
    </div>

    <!-- Playback Controls -->
    <div class="flex flex-row justify-between mt-6 w-72 pb-2">
      <button
        class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2 control-button"
        class:tapped={tappedControlId === "previous"}
        on:click={() => {
          handleControlTap("previous");
          onPlayPrevious();
        }}
        on:touchstart={() => handleControlTap("previous")}
      >
        <Icon icon="mdi:skip-previous" width="32" height="32" />
      </button>
      <button
        class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2 control-button"
        class:tapped={tappedControlId === "playpause"}
        on:click={() => {
          handleControlTap("playpause");
          onTogglePlayPause();
        }}
        on:touchstart={() => handleControlTap("playpause")}
      >
        <Icon
          icon={isPlayingState ? "mdi:pause" : "mdi:play"}
          width="32"
          height="32"
        />
      </button>
      <button
        class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2 control-button"
        class:tapped={tappedControlId === "next"}
        on:click={() => {
          handleControlTap("next");
          onPlayNext();
        }}
        on:touchstart={() => handleControlTap("next")}
      >
        <Icon icon="mdi:skip-next" width="32" height="32" />
      </button>
    </div>
  </div>
</div>

<style>
  .control-button {
    transition: transform 0.1s ease-out;
  }

  .control-button.tapped {
    transform: translate(2px, 2px);
  }
</style>
