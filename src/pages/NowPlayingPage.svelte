<script>
  import { onMount } from "svelte";
  import { router } from "../lib/router.js";
  import { accountsStore } from "../store/accounts.js";
  import {
    musicStore,
    currentTrack,
    isPlaying,
    playbackProgress,
  } from "../store/music.js";
  import NowPlayingPageComponent from "./spotify/NowPlayingPage.svelte";

  export let isExiting = false;

  let currentTrackData = null;
  let isPlayingState = false;
  let progress = { currentTime: 0, duration: 0, seekValue: 0 };

  // Subscribe to music store
  $: currentTrackData = $currentTrack;
  $: isPlayingState = $isPlaying;
  $: progress = $playbackProgress;

  // Derived values for display
  $: nowPlayingTrack =
    currentTrackData && currentTrackData.type === "spotify"
      ? currentTrackData
      : null;
  $: currentTime = progress.currentTime;
  $: duration = progress.duration;
  $: seekValue = progress.seekValue;

  async function playNext() {
    await musicStore.playNext();
  }

  async function playPrevious() {
    await musicStore.playPrevious();
  }

  async function togglePlayPause() {
    await musicStore.togglePlayPause();
  }

  // Note: Authentication check is handled by App.svelte, so this component only renders when authenticated
</script>

<div class="page-holder">
  {#if nowPlayingTrack}
    <NowPlayingPageComponent
      {isExiting}
      {nowPlayingTrack}
      {currentTime}
      {duration}
      {seekValue}
      {isPlayingState}
      onPlayPrevious={playPrevious}
      onPlayNext={playNext}
      onTogglePlayPause={togglePlayPause}
    />
  {:else}
    <!-- Show empty state if no track is playing -->
    <div class="flex flex-col h-screen ">
      <span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify</span>
      <span class="text-6xl font-[200] h-auto py-1 px-4">now playing</span>
      <p class="text-gray-400 px-4 mt-16 text-xl font-[200]">No track is currently playing</p>
    </div>
  {/if}
</div>
