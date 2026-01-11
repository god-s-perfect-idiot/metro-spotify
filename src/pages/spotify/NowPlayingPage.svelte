<script>
  import Icon from "@iconify/svelte";
  import { router } from "../../lib/router.js";
  import Loader from "../../components/Loader.svelte";

  export let isExiting = false;
  export let nowPlayingTrack = null;
  export let currentTime = 0;
  export let duration = 0;
  export let seekValue = 0;
  export let isPlayingState = false;
  export let isBuffering = false;
  export let onPlayPrevious = () => {};
  export let onPlayNext = () => {};
  export let onTogglePlayPause = () => {};
  export let onToggleShuffle = () => {};
  export let onCycleRepeat = () => {};
  export let shuffleState = false;
  export let repeatState = 'off';
  export let nextTrack = null;

  let tappedControlId = null;
  let previousTrackUri = null;
  let previousTrackImage = null;
  let isTransitioning = false;
  let showPreviousImage = false;
  let currentTrackImage = null;
  let isTitleTransitioning = false;
  let isArtistTransitioning = false;
  let previousTitle = null;
  let previousArtist = null;
  let showPreviousTitle = false;
  let showPreviousArtist = false;
  let hasInitialized = false;
  let isNextTrackTransitioning = false;
  let previousNextTrackUri = null;
  let committedNextTrack = null; // The next track we've committed to displaying
  let lastCurrentTrackUri = null; // Track when current track changes (user skips)
  
  // Track previous values separately
  let previousTrackTitle = null;
  let previousTrackArtist = null;
  
  // Track when track changes to trigger transitions
  $: {
    const currentUri = nowPlayingTrack?.uri;
    const newImage = nowPlayingTrack?.album?.images ? formatImageUrl(nowPlayingTrack.album.images, 300) : null;
    const currentTitle = nowPlayingTrack?.name || null;
    const currentArtist = nowPlayingTrack?.artists?.map((a) => a.name).join(", ") || null;
    
    if (currentUri && currentUri !== previousTrackUri) {
      if (previousTrackUri !== null) {
        // Store the current image as previous before updating to new track
        if (currentTrackImage) {
          previousTrackImage = currentTrackImage;
          showPreviousImage = true;
        }
        
        // Store previous text (from the previous state, not current)
        previousTitle = previousTrackTitle;
        previousArtist = previousTrackArtist;
        
        // Hide old text immediately when skipping
        showPreviousTitle = false;
        showPreviousArtist = false;
        
        isTransitioning = true;
        
        // Start title flip first
        isTitleTransitioning = true;
        setTimeout(() => {
          isTitleTransitioning = false;
        }, 400);
        
        // Start artist flip slightly after title
        setTimeout(() => {
          isArtistTransitioning = true;
          setTimeout(() => {
            isArtistTransitioning = false;
          }, 400);
        }, 100);
        
        // After transition, hide previous image
        setTimeout(() => {
          showPreviousImage = false;
          isTransitioning = false;
          previousTrackImage = null;
          previousTitle = null;
          previousArtist = null;
        }, 500); // Slightly longer to account for staggered artist flip
      } else {
        // First time showing a track - trigger entry animation
        isTitleTransitioning = true;
        setTimeout(() => {
          isTitleTransitioning = false;
        }, 400);
        
        setTimeout(() => {
          isArtistTransitioning = true;
          setTimeout(() => {
            isArtistTransitioning = false;
          }, 400);
        }, 100);
      }
      
      // Update to new track - store current values as previous for next change
      previousTrackUri = currentUri;
      currentTrackImage = newImage;
      previousTrackTitle = currentTitle;
      previousTrackArtist = currentArtist;
      hasInitialized = true;
    } else if (currentUri && !hasInitialized) {
      // Initialize on first load - trigger entry animation
      currentTrackImage = newImage;
      previousTrackUri = currentUri;
      previousTrackTitle = currentTitle;
      previousTrackArtist = currentArtist;
      hasInitialized = true;
      
      // Trigger entry animation
      isTitleTransitioning = true;
      setTimeout(() => {
        isTitleTransitioning = false;
      }, 400);
      
      setTimeout(() => {
        isArtistTransitioning = true;
        setTimeout(() => {
          isArtistTransitioning = false;
        }, 400);
      }, 100);
    }
  }

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
  
  // Track when current track changes (user skips) - only then update committed next track
  $: if (nowPlayingTrack?.uri && nowPlayingTrack.uri !== lastCurrentTrackUri) {
    // Current track changed - commit to the next track at this moment
    if (nextTrack) {
      committedNextTrack = nextTrack;
      lastCurrentTrackUri = nowPlayingTrack.uri;
      
      // Trigger animation if this is a different next track
      if (previousNextTrackUri !== null && nextTrack.uri !== previousNextTrackUri) {
        isNextTrackTransitioning = true;
        setTimeout(() => {
          isNextTrackTransitioning = false;
        }, 400);
      } else if (previousNextTrackUri === null) {
        // First time showing next track - trigger entry animation
        isNextTrackTransitioning = true;
        setTimeout(() => {
          isNextTrackTransitioning = false;
        }, 400);
      }
      previousNextTrackUri = nextTrack.uri;
    } else {
      // No next track
      committedNextTrack = null;
      lastCurrentTrackUri = nowPlayingTrack.uri;
      if (previousNextTrackUri !== null) {
        previousNextTrackUri = null;
      }
    }
  }
  
  // Update committed next track when nextTrack changes (e.g., when shuffle is toggled)
  // Only update if the current track hasn't changed (same URI)
  $: if (nextTrack && nowPlayingTrack?.uri && nowPlayingTrack.uri === lastCurrentTrackUri) {
    // Current track is the same, but nextTrack changed (e.g., shuffle toggle)
    if (committedNextTrack?.uri !== nextTrack.uri) {
      committedNextTrack = nextTrack;
      
      // Trigger animation if this is a different next track
      if (previousNextTrackUri !== null && nextTrack.uri !== previousNextTrackUri) {
        isNextTrackTransitioning = true;
        setTimeout(() => {
          isNextTrackTransitioning = false;
        }, 400);
      }
      previousNextTrackUri = nextTrack.uri;
    }
  } else if (!nextTrack && nowPlayingTrack?.uri && nowPlayingTrack.uri === lastCurrentTrackUri) {
    // Current track is the same, but nextTrack became null
    if (committedNextTrack !== null) {
      committedNextTrack = null;
      if (previousNextTrackUri !== null) {
        previousNextTrackUri = null;
      }
    }
  }
  
  // Initialize committed next track on first load
  $: if (nowPlayingTrack?.uri && lastCurrentTrackUri === null && nextTrack) {
    committedNextTrack = nextTrack;
    lastCurrentTrackUri = nowPlayingTrack.uri;
    previousNextTrackUri = nextTrack.uri;
    
    // Trigger entry animation
    isNextTrackTransitioning = true;
    setTimeout(() => {
      isNextTrackTransitioning = false;
    }, 400);
  }
</script>

<div
  class="flex flex-col pt-4 w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase">spotify</span>
  <span class="text-6xl font-[300] h-auto py-1 px-4">now playing</span>
  <div class="flex flex-col gap-2 mb-16 overflow-x-hidden px-4">
    <!-- Album Art and Shuffle/Repeat Controls -->
    <div class="flex flex-row items-center gap-4 mt-16">
      <div class="flex w-72 h-72 justify-center items-center relative">
        <!-- Previous image fading out -->
        {#if showPreviousImage && previousTrackImage}
          <img
            src={previousTrackImage}
            alt="Previous track"
            class="w-72 h-72 object-cover album-art absolute inset-0 fade-out"
          />
        {/if}
        
        <!-- Current image fading in -->
        {#if nowPlayingTrack?.album?.images}
          <img
            src={formatImageUrl(nowPlayingTrack.album.images, 300)}
            alt={nowPlayingTrack.album.name}
            class="w-72 h-72 object-cover album-art"
            class:fade-in={isTransitioning}
          />
        {:else}
          <div class="w-72 h-72 bg-gray-700 flex items-center justify-center album-art" class:fade-in={isTransitioning}>
            <Icon
              icon="mdi:music"
              width="168"
              height="168"
              class="text-gray-400"
            />
          </div>
        {/if}
      </div>
      
      <!-- Shuffle, Repeat, and Queue Buttons -->
      <div class="flex flex-col justify-between h-full">
        <!-- Top: Shuffle and Repeat Buttons -->
        <div class="flex flex-col gap-8">
          <!-- Shuffle Button -->
          <button
            class="flex items-center justify-center transition-colors"
            class:tapped={tappedControlId === "shuffle"}
            on:click={() => {
              handleControlTap("shuffle");
              onToggleShuffle();
            }}
            on:touchstart={() => handleControlTap("shuffle")}
            title="Shuffle"
          >
            <Icon
              icon="mdi:shuffle"
              width="24"
              height="24"
              class={shuffleState ? "text-white" : "text-gray-400"}
            />
          </button>
          
          <!-- Repeat Button -->
          <button
            class="flex items-center justify-center transition-colors"
            class:tapped={tappedControlId === "repeat"}
            on:click={() => {
              handleControlTap("repeat");
              onCycleRepeat();
            }}
            on:touchstart={() => handleControlTap("repeat")}
            title={repeatState === 'off' ? 'Repeat Off' : repeatState === 'one' ? 'Repeat One' : 'Repeat All'}
          >
            <!-- Always render all repeat icons to preload them, but only show the active one -->
            <Icon
              icon="mdi:repeat"
              width="24"
              height="24"
              class={repeatState === 'one' ? "hidden" : (repeatState === 'off' ? "text-gray-400" : "text-white")}
              style={repeatState === 'one' ? "position: absolute; visibility: hidden;" : ""}
            />
            <Icon
              icon="mdi:repeat-once"
              width="24"
              height="24"
              class={repeatState !== 'one' ? "hidden" : "text-white"}
              style={repeatState !== 'one' ? "position: absolute; visibility: hidden;" : ""}
            />
          </button>
        </div>
        
        <!-- Bottom: Queue Button -->
        <button
          class="flex items-center justify-center transition-colors"
          class:tapped={tappedControlId === "queue"}
          on:click={() => {
            handleControlTap("queue");
            router.goto("/play-queue");
          }}
          on:touchstart={() => handleControlTap("queue")}
          title="Play Queue"
        >
          <Icon
            icon="ic:baseline-list"
            width="24"
            height="24"
            class="text-white"
          />
        </button>
      </div>
    </div>

    <!-- Seek Bar / Loader -->
    <div class="flex flex-col gap-2 w-72 max-w-md">
      <div class="relative w-full h-2 bg-gray-200">
        <div
          class="absolute top-0 left-0 h-full bg-green-600 transition-all duration-100 ease-in-out"
          style="width: {seekValue}%"
        ></div>
      </div>
      {#if isBuffering}
        <div class="flex items-center justify-center py-2">
          <Loader hideText={true} />
        </div>
      {:else}
        <div class="flex justify-between text-sm text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      {/if}
    </div>

    <!-- Song Info -->
    <div class="flex flex-col gap-1 w-72 max-w-full relative">
      <!-- Previous Title (flipping out) -->
      {#if showPreviousTitle && previousTitle}
        <span
          class="text-2xl font-[300] mt-2 truncate song-title absolute flip-out"
          title={previousTitle}
        >{previousTitle}</span
        >
      {/if}
      
      <!-- Current Title (flipping in) -->
      <span
        class="text-2xl font-[300] mt-2 truncate song-title"
        class:flip-in={isTitleTransitioning}
        title={nowPlayingTrack?.name}>{nowPlayingTrack?.name}</span
      >
      
      <!-- Previous Artist (flipping out) -->
      {#if showPreviousArtist && previousArtist}
        <span
          class="text-lg text-gray-400 truncate artist-name absolute flip-out"
          style="top: 2rem;"
          title={previousArtist}
        >{previousArtist}</span
        >
      {/if}
      
      <!-- Current Artist (flipping in) -->
      <span
        class="text-lg text-gray-400 truncate artist-name"
        class:flip-in={isArtistTransitioning}
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
        <!-- Always render both icons to preload them, but only show the active one -->
        <Icon
          icon="mdi:play"
          width="32"
          height="32"
          class={isPlayingState === true ? "hidden" : ""}
          style={isPlayingState === true ? "position: absolute; visibility: hidden;" : ""}
        />
        <Icon
          icon="mdi:pause"
          width="32"
          height="32"
          class={isPlayingState === false ? "hidden" : ""}
          style={isPlayingState === false ? "position: absolute; visibility: hidden;" : ""}
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

    <!-- Up Next -->
    {#if committedNextTrack}
      <div class="flex flex-col gap-2 mt-6 w-full">
        <span class="text-base text-gray-400">Up next</span>
        <div class="flex flex-row items-center gap-3 up-next-content" class:flip-in={isNextTrackTransitioning}>
          <div class="flex flex-row gap-1 flex-1 min-w-0">
            <span class="text-base font-[300] truncate" title={committedNextTrack?.name}>
              {committedNextTrack?.name}
            </span>
            <span
              class="text-base text-gray-400 truncate"
              title={committedNextTrack?.artists?.map((a) => a.name).join(", ")}
            >
              by {committedNextTrack?.artists?.map((a) => a.name).join(", ")}
            </span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .control-button {
    transition: transform 0.1s ease-out;
  }

  .control-button.tapped {
    transform: translate(2px, 2px);
  }
  
  .album-art {
    transition: opacity 0.4s ease-in-out;
  }
  
  .album-art.fade-out {
    opacity: 0.25;
    z-index: 1;
  }
  
  .album-art.fade-in {
    opacity: 0.25;
    z-index: 2;
    animation: fadeIn 0.4s ease-in-out forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0.25;
    }
    to {
      opacity: 1;
    }
  }
  
  .song-title,
  .artist-name {
    transform-style: preserve-3d;
    perspective: 1000px;
  }
  
  .song-title.flip-out,
  .artist-name.flip-out {
    transform: rotateX(90deg);
    transition: transform 0.4s ease-in-out;
    /* opacity: 0; */
  }
  
  .song-title.flip-in,
  .artist-name.flip-in {
    transform: rotateX(90deg);
    animation: flipIn 0.4s ease-in-out forwards;
  }
  
  @keyframes flipIn {
    from {
      transform: rotateX(90deg);
      /* opacity: 0; */
    }
    to {
      transform: rotateX(0deg);
      /* opacity: 1; */
    }
  }
  
  .up-next-content {
    transform-style: preserve-3d;
    perspective: 1000px;
  }
  
  .up-next-content.flip-in {
    transform: rotateX(90deg);
    animation: flipIn 0.4s ease-in-out forwards;
  }
</style>

