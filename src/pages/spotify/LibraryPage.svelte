<script>
	import Icon from '@iconify/svelte';
	import LetterGrid from '../../components/LetterGrid.svelte';
	import Loader from '../../components/Loader.svelte';
	import { accentColorStore, textColorClassStore } from '../../utils/theme.js';
	
	export let isExiting = false;
	export let isLoading = false;
	export let likedSongs = [];
	export let musicList = {};
	export let showGrid = false;
	export let onPlaySong = (uri, song) => {};
	export let onLetterClick = (char) => {};
	export let onShowGrid = () => {};
	
	let gridExiting = false;
	
	// When showGrid becomes false, reset gridExiting
	$: if (!showGrid) {
		gridExiting = false;
	}
	
	// Wrapper function to handle letter click with exit animation
	function handleLetterClickWithExit(char) {
		gridExiting = true;
		onLetterClick(char);
	}
	
	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;
</script>

<div
	class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
	class:page-exit={isExiting}
>
	
	{#if showGrid}
		<LetterGrid
			items={likedSongs}
			itemNameKey="name"
			{showGrid}
			isExiting={gridExiting}
			onLetterClick={handleLetterClickWithExit}
		/>
	{:else}
	<span class="text-6xl font-[200] h-auto py-1 px-4">songs</span>
		<div class="flex flex-col gap-8 pb-20 mt-6 overflow-y-auto overflow-x-hidden px-4 h-full">
			{#if isLoading}
				<div class="flex flex-col gap-4 items-center justify-center my-24">
					<Loader />
				</div>
		{:else if !isLoading && likedSongs.length > 0}
			{#each Object.entries(musicList) as musicEntry}
				<div class="flex flex-col gap-4">
					<button
						class="{textClass} text-3xl lowercase border-2 w-12 h-12 justify-start items-end flex pl-1 pb-1 font-[300]"
						style="background-color: {accentColor}; border-color: {accentColor};"
						id={musicEntry[0].toUpperCase()}
						on:click={onShowGrid}
					>
						{musicEntry[0]}
					</button>
					{#each musicEntry[1] as song}
						<button
							class="flex flex-row gap-4 items-center w-full min-w-0"
							on:click={() => onPlaySong(song.uri, song)}
						>
							{#if song.album?.images && song.album.images.length > 0}
								<img
									src={song.album.images[0].url}
									alt={song.album.name}
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
								<span class="text-2xl text-left font-[300] truncate w-full" title={song.name}>
									{song.name}
								</span>
								<span
									class="text-gray-400 text-left text-base font-[300] truncate w-full"
									title={song.artists?.map((a) => a.name).join(', ')}
								>
									{song.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
								</span>
							</div>
						</button>
					{/each}
				</div>
			{/each}
		{:else if !isLoading}
			<div class="text-center py-12 mx-4">
				<Icon icon="mdi:music" width="64" height="64" class="text-gray-500 mb-4" />
				<h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
					No Liked Songs Found
				</h3>
				<p class="text-gray-400 font-[300] justify-start flex text-left text-lg">
					Like some songs on Spotify to see them here.
				</p>
			</div>
		{/if}
		</div>
	{/if}
</div>

