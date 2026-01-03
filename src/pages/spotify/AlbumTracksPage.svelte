<script>
	import Icon from '@iconify/svelte';
	import Loader from '../../components/Loader.svelte';
	import { accentColorStore, textColorClassStore } from '../../utils/theme.js';
	
	export let isExiting = false;
	export let isLoading = false;
	export let albumName = '';
	export let albumArtist = '';
	export let copyright = '';
	export let tracks = [];
	export let onPlaySong = (uri, song) => {};
	
	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;
</script>

<div
	class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
	class:page-exit={isExiting}
>
	<span class="text-base font-[500] h-fit px-4 uppercase truncate mt-2" title={albumName}>{albumName}</span>
	{#if albumArtist}
		<span class="text-6xl font-[200] px-4 mt-2 py-1 mb-2 truncate" title={albumArtist}>{albumArtist}</span>
	{/if}
	<div class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full">
		{#if isLoading}
			<div class="flex flex-col gap-4 items-center justify-center my-24">
				<Loader />
			</div>
		{:else if !isLoading && tracks.length > 0}
			{#each tracks as track}
				<button
					class="flex flex-row gap-4 items-center w-full min-w-0"
					on:click={() => onPlaySong(track.uri, track)}
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
				</button>
			{/each}
		{:else if !isLoading}
			<div class="text-center py-12 mx-4">
				<Icon icon="mdi:music" width="64" height="64" class="text-gray-500 mb-4" />
				<h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
					This album is empty
				</h3>
				<p class="text-gray-400 font-[300] justify-start flex text-left text-lg">
					This album doesn't have any tracks.
				</p>
			</div>
		{/if}
		{#if copyright}
			<span class="text-gray-400 text-left text-xs mt-8 font-[300] w-full" title={copyright}>
				{copyright}
			</span>
		{/if}
	</div>
</div>

