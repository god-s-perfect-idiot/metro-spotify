<script>
	import Icon from '@iconify/svelte';
	import { musicStore, queue, currentIndex } from '../../store/music.js';
	import { accentColorStore, textColorClassStore } from '../../utils/theme.js';
	
	export let isExiting = false;
	
	let tappedTrackId = null;
	
	function handleTrackTap(track) {
		// Create a unique ID for the track item
		const trackId = `${track.uri}-${track.name}`;
		tappedTrackId = trackId;
		
		// Reset after animation completes
		setTimeout(() => {
			tappedTrackId = null;
		}, 200);
	}
	
	async function playTrack(track, index) {
		if (!musicStore.spotifyApi || !musicStore.selectedDeviceId) return;
		
		try {
			await musicStore.playTrack(track, index, $queue);
		} catch (error) {
			console.error('Error playing track from queue:', error);
		}
	}
	
	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;
	$: queueList = $queue;
	$: currentIdx = $currentIndex;
</script>

<div
	class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
	class:page-exit={isExiting}
>
	<span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify</span>
	<span class="text-6xl font-[200] h-auto py-1 px-4">play queue</span>
	<div class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full">
		{#if queueList.length > 0}
			{#each queueList as track, index}
				{@const trackId = `${track.uri}-${track.name}`}
				{@const isCurrentTrack = index === currentIdx}
				<button
					class="flex flex-row gap-4 items-center w-full min-w-0 queue-item"
					class:tapped={tappedTrackId === trackId}
					class:current={isCurrentTrack}
					on:click={() => {
						if (!isCurrentTrack) {
							handleTrackTap(track);
							playTrack(track, index);
						}
					}}
					on:touchstart={() => {
						if (!isCurrentTrack) {
							handleTrackTap(track);
						}
					}}
				>
					{#if track.album?.images && track.album.images.length > 0}
						<img
							src={track.album.images[0].url}
							alt={track.album.name}
							class="w-16 h-16 object-cover flex-shrink-0"
						/>
					{:else}
						<div
							class="w-12 h-12 rounded-lg bg-gray-700 flex items-start justify-center flex-shrink-0"
						>
							<Icon icon="mdi:music" width="24" height="24" class="text-gray-400" />
						</div>
					{/if}

					<div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
						<span class="text-2xl text-left font-[300] truncate w-full" title={track.name}>
							{track.name}
						</span>
						<span
							class="text-gray-400 text-left text-base font-[300] truncate w-full"
							title={track.artists?.map((a) => a.name).join(', ')}
						>
							{track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
						</span>
					</div>
					
					{#if isCurrentTrack}
						<Icon icon="mdi:play" width="24" height="24" class="text-green-500 flex-shrink-0" />
					{/if}
				</button>
			{/each}
		{:else}
			<div class="text-center py-12 mx-4">
				<Icon icon="ic:sharp-queue-music" width="64" height="64" class="text-gray-500 mb-4" />
				<h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
					Queue is empty
				</h3>
				<p class="text-gray-400 font-[300] justify-start flex text-left text-lg">
					Play a song to start building your queue.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.queue-item {
		transition: transform 0.1s ease-out;
	}
	
	.queue-item.tapped {
		transform: translate(2px, 2px);
	}
	
	.queue-item.current {
		opacity: 0.7;
	}
</style>

