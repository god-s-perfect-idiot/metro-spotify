<script>
	import Icon from '@iconify/svelte';
	import { musicStore } from '../../store/music.js';
	import { accentColorStore, textColorClassStore } from '../../utils/theme';

	export let gridSize = '2x2'; // '2x2' or '4x2'

	$: accentColor = $accentColorStore;
	$: textColor = $textColorClassStore;

	// Subscribe directly to musicStore for reactive updates
	$: musicState = $musicStore;
	$: currentTrackData = musicState?.currentTrack || null;
	$: isPlayingState = musicState?.isPlaying || false;
	$: serviceType = musicState?.serviceType || null;

	// Only show Spotify tracks
	$: spotifyTrackData = currentTrackData && serviceType === 'spotify' ? currentTrackData : null;

	// Make these reactive so they update when currentTrackData changes
	$: trackDisplayName = spotifyTrackData
		? spotifyTrackData.name || 'Unknown track'
		: 'No track playing';
	$: trackArtist = spotifyTrackData?.artists
		? Array.isArray(spotifyTrackData.artists)
			? spotifyTrackData.artists.map((a) => a.name).join(', ')
			: 'Unknown Artist'
		: 'Unknown Artist';
	$: backgroundStyle =
		spotifyTrackData?.album?.images && spotifyTrackData.album.images.length > 0
			? `background-image: url('${spotifyTrackData.album.images[0].url}'); background-size: cover; background-position: center;`
			: `background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%);`;

	$: console.log(backgroundStyle);
	async function handlePlayPause(event) {
		event.preventDefault();
		event.stopPropagation();
		await musicStore.togglePlayPause();
	}

	async function handleNext(event) {
		event.preventDefault();
		event.stopPropagation();
		await musicStore.playNext();
	}

	async function handlePrevious(event) {
		event.preventDefault();
		event.stopPropagation();
		await musicStore.playPrevious();
	}
</script>

{#if gridSize === '2x2'}
	<!-- 2x2 Tile: Compact Spotify player -->
	<div
		class="w-full h-full flex flex-col justify-between items-between text-white {textColor} relative overflow-hidden p-2"
		style={backgroundStyle}
	>
		{#if backgroundStyle.includes('background-image')}
			<div class="absolute inset-0 bg-black/40 z-0"></div>
		{/if}

		{#if spotifyTrackData}
			<!-- Track info -->
			<div class="flex flex-col items-start gap-1 flex-1 justify-center z-10">
				<span class="text-lg font-[500] truncate w-full" title={trackDisplayName}>
					{trackDisplayName}
				</span>
				{#if trackArtist}
					<span class="text-sm font-[300] opacity-90 truncate w-full" title={trackArtist}>
						{trackArtist}
					</span>
				{/if}
			</div>

			<!-- Controls -->
			<div class="flex flex-row justify-between px-2 pb-2 items-center gap-2 z-10">
				<button
					on:click={handlePrevious}
					class="p-1 rounded-full border-2 border-white transition-colors"
					title="Previous"
				>
					<Icon icon="mdi:skip-previous" width="24" height="24" />
				</button>
				<button
					on:click={handlePlayPause}
					class="p-1 rounded-full border-2 border-white transition-colors"
					title={isPlayingState ? 'Pause' : 'Play'}
				>
					<Icon icon={isPlayingState ? 'mdi:pause' : 'mdi:play'} width="24" height="24" />
				</button>
				<button
					on:click={handleNext}
					class="p-1 rounded-full border-2 border-white transition-colors"
					title="Next"
				>
					<Icon icon="mdi:skip-next" width="24" height="24" />
				</button>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="flex flex-col items-center justify-center h-full gap-2">
				<Icon icon="mdi:spotify" width="56" height="56" />
				<span class="text-base font-medium left-2 bottom-2 absolute">Spotify</span>
			</div>
		{/if}
	</div>
{:else if gridSize === '4x2'}
	<!-- 4x2 Tile: Full Spotify player with album art background -->
	<div
		class="w-full h-full flex flex-col justify-between text-white {textColor} relative overflow-hidden p-3 bg-cover bg-center"
		style={backgroundStyle}
	>
		<!-- Overlay for better text readability -->
		{#if backgroundStyle.includes('background-image')}
			<div class="absolute inset-0 bg-black/40 z-0"></div>
		{/if}

		{#if spotifyTrackData}
			<!-- Left side: Track info -->
			<div class="flex flex-col justify-between h-full flex-1 min-w-0 z-10">
				<div class="flex flex-row justify-between items-center gap-3">
					<div class="flex flex-col items-start gap-1">
						<span class="text-xl font-[500] truncate w-full" title={trackDisplayName}>
							{trackDisplayName}
						</span>
						{#if trackArtist}
							<span class="text-base font-[300] opacity-90 truncate w-full" title={trackArtist}>
								{trackArtist}
							</span>
						{/if}
					</div>
                    <Icon icon="mdi:spotify" width="48" height="48" />
				</div>

				<!-- Controls -->
				<div class="flex flex-row justify-between items-center gap-3 max-w-[70%]">
					<button
						on:click={handlePrevious}
						class="p-2 rounded-full border-2 border-white transition-colors"
						title="Previous"
					>
						<Icon icon="mdi:skip-previous" width="28" height="28" />
					</button>
					<button
						on:click={handlePlayPause}
						class="p-2 rounded-full border-2 border-white transition-colors"
						title={isPlayingState ? 'Pause' : 'Play'}
					>
						<Icon icon={isPlayingState ? 'mdi:pause' : 'mdi:play'} width="28" height="28" />
					</button>
					<button
						on:click={handleNext}
						class="p-2 rounded-full border-2 border-white transition-colors"
						title="Next"
					>
						<Icon icon="mdi:skip-next" width="28" height="28" />
					</button>
				</div>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="flex flex-col items-center justify-center h-full w-full gap-3 z-10">
				<Icon icon="mdi:spotify" width="72" height="72" />
				<span class="absolute bottom-2 left-2 text-base font-medium">Spotify</span>
			</div>
		{/if}
	</div>
{/if}
