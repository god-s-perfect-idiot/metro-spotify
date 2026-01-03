<script>
	import { onMount } from 'svelte';
	import { router } from '../lib/router.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore, currentTrack, isPlaying, playbackProgress } from '../store/music.js';
	import NowPlayingPageComponent from './spotify/NowPlayingPage.svelte';
	
	export let isExiting = false;
	
	let currentTrackData = null;
	let isPlayingState = false;
	let progress = { currentTime: 0, duration: 0, seekValue: 0 };
	
	// Subscribe to music store
	$: currentTrackData = $currentTrack;
	$: isPlayingState = $isPlaying;
	$: progress = $playbackProgress;
	
	// Derived values for display
	$: nowPlayingTrack = currentTrackData && currentTrackData.type === 'spotify' ? currentTrackData : null;
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
			isExiting={isExiting}
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
		<div class="flex flex-col items-center justify-center h-screen page" class:page-exit={isExiting}>
			<p class="text-gray-400">No track is currently playing</p>
		</div>
	{/if}
</div>

