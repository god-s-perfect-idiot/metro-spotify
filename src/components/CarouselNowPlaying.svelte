<script>
  import Icon from "@iconify/svelte";
  import { router } from "../lib/router.js";

  export let nowPlayingTrack = null;
  export let currentTime = 0;
  export let duration = 0;
  export let seekValue = 0;
  export let isPlayingState = false;
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
  $: {
    const currentUri = nowPlayingTrack?.uri;
    if (currentUri) {
      if (currentUri !== lastCurrentTrackUri) {
        // Current track changed - commit to the next track at this moment
        if (nextTrack) {
          committedNextTrack = nextTrack;
          lastCurrentTrackUri = currentUri;
          
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
          lastCurrentTrackUri = currentUri;
          if (previousNextTrackUri !== null) {
            previousNextTrackUri = null;
          }
        }
      } else if (lastCurrentTrackUri === null && nextTrack) {
        // Initialize committed next track on first load
        committedNextTrack = nextTrack;
        lastCurrentTrackUri = currentUri;
        previousNextTrackUri = nextTrack.uri;
        
        // Trigger entry animation
        isNextTrackTransitioning = true;
        setTimeout(() => {
          isNextTrackTransitioning = false;
        }, 400);
      }
    }
  }
</script>

<div class="flex flex-col w-full h-full font-[400] px-4 pt-24">
  <span class="text-5xl font-[300] h-auto py-1">now playing</span>

  {#if nowPlayingTrack}
    <div class="flex flex-col gap-2 mt-4">
      <!-- Album Art and Shuffle/Repeat Controls -->
      <div class="flex flex-row items-center gap-4 w-full mt-4">
        <div class="flex justify-start items-center w-full max-w-[60%] relative">
          <!-- Previous image fading out -->
          {#if showPreviousImage && previousTrackImage}
            <img
              src={previousTrackImage}
              alt="Previous track"
              class="w-full aspect-square object-cover album-art absolute inset-0 fade-out"
            />
          {/if}
          
          <!-- Current image fading in -->
          {#if nowPlayingTrack?.album?.images}
            <img
              src={formatImageUrl(nowPlayingTrack.album.images, 300)}
              alt={nowPlayingTrack.album.name}
              class="w-full aspect-square object-cover album-art"
              class:fade-in={isTransitioning}
            />
          {:else}
            <div
              class="w-full aspect-square bg-gray-700 flex items-center justify-center album-art"
              class:fade-in={isTransitioning}
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

      <!-- Seek Bar -->
      <div class="flex flex-col gap-2 w-full max-w-[60%]">
        <div class="relative w-full h-2 bg-gray-200">
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
        class="flex flex-col gap-1 w-full max-w-[60%] self-start justify-start relative"
      >
        <!-- Previous Title (flipping out) -->
        {#if showPreviousTitle && previousTitle}
          <span
            class="text-2xl font-[300] truncate song-title absolute flip-out"
            title={previousTitle}
          >
            {previousTitle}
          </span>
        {/if}
        
        <!-- Current Title (flipping in) -->
        <span
          class="text-2xl font-[300] truncate song-title"
          class:flip-in={isTitleTransitioning}
          title={nowPlayingTrack?.name}
        >
          {nowPlayingTrack?.name}
        </span>
        
        <!-- Previous Artist (flipping out) -->
        {#if showPreviousArtist && previousArtist}
          <span
            class="text-lg text-gray-400 truncate artist-name absolute flip-out"
            style="top: 2rem;"
            title={previousArtist}
          >
            {previousArtist}
          </span>
        {/if}
        
        <!-- Current Artist (flipping in) -->
        <span
          class="text-lg text-gray-400 truncate artist-name"
          class:flip-in={isArtistTransitioning}
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

      <!-- Up Next -->
      {#if committedNextTrack}
        <div class="flex flex-col gap-2 mt-6 w-full max-w-full">
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
  
  .album-art {
    transition: opacity 0.6s ease-in-out;
  }
  
  .album-art.fade-out {
    opacity: 0;
    z-index: 1;
  }
  
  .album-art.fade-in {
    opacity: 0;
    z-index: 2;
    animation: fadeIn 0.6s ease-in-out forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
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
    opacity: 0;
  }
  
  .song-title.flip-in,
  .artist-name.flip-in {
    transform: rotateX(90deg);
    animation: flipIn 0.4s ease-in-out forwards;
  }
  
  @keyframes flipIn {
    from {
      transform: rotateX(90deg);
      opacity: 0;
    }
    to {
      transform: rotateX(0deg);
      opacity: 1;
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
