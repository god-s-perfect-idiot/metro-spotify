<script>
	import BottomControls from '../../components/BottomControls.svelte';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { accountsStore } from '../../store/accounts.js';
	import { getAuthUrl } from '../../lib/spotify-config.js';
	import LetterGrid from '../../components/LetterGrid.svelte';
	import Select from '../../components/Select.svelte';
	import Loader from '../../components/Loader.svelte';
	import { accentColorStore, textColorClassStore } from '../../utils/theme';
	import { musicStore, currentTrack, isPlaying, playbackProgress } from '../../store/music.js';

	let isExpanded = false;
	let isUnmounting = false;
	let isExiting = false;
	let isLoading = false;
	let likedSongs = [];
	let spotifyApi = null;
	let showGrid = false;
	let musicList = {};
	let targetChar = '';

	// Subscribe to music store
	let currentTrackData = null;
	let isPlayingState = false;
	let progress = { currentTime: 0, duration: 0, seekValue: 0 };
	
	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;
	
	// Subscribe to music store
	$: currentTrackData = $currentTrack;
	$: isPlayingState = $isPlaying;
	$: progress = $playbackProgress;
	
	// Derived values for display
	$: nowPlayingTrack = currentTrackData && currentTrackData.type === 'spotify' ? currentTrackData : null;
	$: currentTime = progress.currentTime;
	$: duration = progress.duration;
	$: seekValue = progress.seekValue;
	
	let availableDevices = [];
	let selectedDeviceId = null;
	let selectedDeviceName = null;
	let webPlayerReady = false;

	function handleToggle(event) {
		isExpanded = event.detail.expanded;
	}

	const closePage = () => {
		isUnmounting = true;
		setTimeout(() => {
			isExpanded = false;
			setTimeout(() => {
				isExiting = true;
				setTimeout(() => {
					goto('/');
				}, 200);
			}, 300);
		}, 300);
	};

	// Initialize Spotify on page load
	onMount(async () => {
		isInitializing = true;
		if (browser) {
			await initializeSpotify();
		}
		isExpanded = false;
	});

	let isInitializing = true; // New variable to track initialization status

	async function initializeSpotify() {
		// Check if we have a valid token
		if (accountsStore.hasValidToken('spotify')) {
			const token = accountsStore.getAccessToken('spotify');
			await initializeSpotifyApi(token);
			await initializeWebPlayer(token);
			await loadAvailableDevices();
			// Poll for devices a few times to catch the web player
			setTimeout(() => loadAvailableDevices(), 2000);
			setTimeout(() => loadAvailableDevices(), 4000);
			await loadLikedSongs();
			isInitializing = false; // Mark as done initializing
		} else {
			isInitializing = false; // Mark as done even if not authenticated
		}
	}

	async function initializeSpotifyApi(token) {
		try {
			// Dynamically import Spotify Web API
			const { default: SpotifyWebApi } = await import('spotify-web-api-js');
			spotifyApi = new SpotifyWebApi();
			spotifyApi.setAccessToken(token);
			// Set Spotify API in music store
			musicStore.setSpotifyApi(spotifyApi);
		} catch (error) {
			console.error('Error initializing Spotify API:', error);
		}
	}

	async function initializeWebPlayer(token) {
		if (!browser) return;
		
		// Load Spotify Web Playback SDK script
		return new Promise((resolve) => {
			if (window.Spotify) {
				setupWebPlayer(token);
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://sdk.scdn.co/spotify-player.js';
			script.async = true;
			script.onload = () => {
				setupWebPlayer(token);
				resolve();
			};
			script.onerror = () => {
				console.error('Failed to load Spotify Web Playback SDK');
				resolve();
			};
			document.head.appendChild(script);
		});
	}

	function setupWebPlayer(initialToken) {
		if (!window.Spotify || !browser) return;

		try {
			const player = new window.Spotify.Player({
				name: 'Ubiquity Web Player',
				getOAuthToken: (cb) => {
					// Get fresh token from accounts store
					if (accountsStore.hasValidToken('spotify')) {
						const currentToken = accountsStore.getAccessToken('spotify');
						cb(currentToken);
					} else {
						cb(initialToken);
					}
				},
				volume: 0.5
			});

			// Error handling
			player.addListener('initialization_error', ({ message }) => {
				console.error('Spotify Player initialization error:', message);
			});

			player.addListener('authentication_error', ({ message }) => {
				console.error('Spotify Player authentication error:', message);
			});

			player.addListener('account_error', ({ message }) => {
				console.error('Spotify Player account error:', message);
			});

			player.addListener('playback_error', ({ message }) => {
				console.error('Spotify Player playback error:', message);
			});

			// Ready event
			player.addListener('ready', ({ device_id }) => {
				console.log('Spotify Web Player ready with device ID:', device_id);
				webPlayerReady = true;
				selectedDeviceId = device_id;
				selectedDeviceName = 'Ubiquity Web Player';
				// Reload devices to include this one
				loadAvailableDevices();
			});

			// Connect to the player
			player.connect().then((success) => {
				if (success) {
					console.log('Spotify Web Player connected successfully');
				}
			}).catch((error) => {
				console.error('Failed to connect Spotify Web Player:', error);
			});

			// Store player globally for cleanup if needed
			window.spotifyPlayer = player;
		} catch (error) {
			console.error('Error setting up Spotify Web Player:', error);
		}
	}

	async function loadAvailableDevices() {
		if (!spotifyApi) return;

		try {
			const devices = await spotifyApi.getMyDevices();
			availableDevices = devices.devices || [];

			// Prioritize our embedded web player
			const ubiquityPlayer = availableDevices.find(
				(device) => device.name === 'Ubiquity Web Player'
			);

			if (ubiquityPlayer) {
				selectedDeviceId = ubiquityPlayer.id;
				selectedDeviceName = ubiquityPlayer.name;
				musicStore.setSelectedDeviceId(ubiquityPlayer.id);
				console.log('Selected Ubiquity Web Player device:', ubiquityPlayer.id);
			} else {
				// Fallback to other web players
				const webPlayer = availableDevices.find(
					(device) =>
						device.type === 'Computer' &&
						(device.name.includes('Web Player') ||
							device.name.includes('Chrome') ||
							device.name.includes('Safari'))
				);

				if (webPlayer) {
					selectedDeviceId = webPlayer.id;
					selectedDeviceName = webPlayer.name;
					musicStore.setSelectedDeviceId(webPlayer.id);
					console.log('Selected web player device:', webPlayer.name);
				} else if (availableDevices.length > 0) {
					selectedDeviceId = availableDevices[0].id;
					selectedDeviceName = availableDevices[0].name;
					musicStore.setSelectedDeviceId(availableDevices[0].id);
					console.log('Selected device:', availableDevices[0].name);
				}
			}

			console.log('Available devices:', availableDevices);
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadLikedSongs() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			// Fetch all liked songs using pagination
			let allSongs = [];
			let offset = 0;
			const limit = 50; // Spotify's maximum limit
			let hasMore = true;

			while (hasMore) {
				const response = await spotifyApi.getMySavedTracks({ limit, offset });
				const songs = response.items.map((item) => item.track);

				if (songs.length === 0) {
					hasMore = false;
				} else {
					allSongs = allSongs.concat(songs);
					offset += limit;

					// If we got less than the limit, we've reached the end
					if (songs.length < limit) {
						hasMore = false;
					}
				}
				// disable this for local development. keep enabled or we will hit the rate limit.
				hasMore = false;
			}

			// Filter out songs without names
			likedSongs = allSongs.filter((song) => song.name && song.name.trim() !== '');

			// Sort songs alphabetically by name
			likedSongs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

			console.log(`Loaded ${likedSongs.length} total liked songs in alphabetical order (filtered)`);

			// Initialize queue in music store
			const tracksWithType = likedSongs.map(song => ({
				...song,
				type: 'spotify'
			}));
			musicStore.setQueue(tracksWithType);

			// Organize songs by first letter for LetterGrid
			organizeSongsByLetter();
		} catch (error) {
			console.error('Error loading liked songs:', error);
			// If token is invalid, logout
			if (error.status === 401) {
				await logout();
			}
		} finally {
			isLoading = false;
		}
	}

	function organizeSongsByLetter() {
		musicList = {};
		likedSongs.forEach((song) => {
			const firstLetter = song.name.charAt(0).toUpperCase();
			if (musicList[firstLetter]) {
				musicList[firstLetter].push(song);
			} else {
				musicList[firstLetter] = [song];
			}
		});
	}

	async function scrollToChar(char) {
		await tick();
		const targetElement = document.getElementById(char);
		console.log(targetElement);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'instant' });
		}
	}

	function handleLetterClick(char) {
		targetChar = char;
		isExiting = true;
		setTimeout(
			() => {
				const targetId = char.toUpperCase();
				scrollToChar(targetId);
				showGrid = false;
				isExiting = false;
			},
			27 * 10 + 200 // 27 letters in the grid
		); // Wait for all animations to complete
		targetChar = '';
	}

	async function login() {
		window.location.href = getAuthUrl();
	}

	async function logout() {
		// Disconnect web player if it exists
		if (window.spotifyPlayer) {
			try {
				await window.spotifyPlayer.disconnect();
			} catch (error) {
				console.error('Error disconnecting player:', error);
			}
			window.spotifyPlayer = null;
		}
		
		accountsStore.logout('spotify');
		accountsStore.cleanupStorage('spotify');
		spotifyApi = null;
		likedSongs = [];
		musicList = {};
		musicStore.clear();
		musicStore.setSpotifyApi(null);
		webPlayerReady = false;
	}

	async function playSong(uri, song = null) {
		if (!spotifyApi || !song) return;

		try {
			// Use music store to play track
			const track = {
				...song,
				type: 'spotify'
			};
			
			const currentState = musicStore.getCurrentState();
			const songIndex = currentState.queue.findIndex((s) => s.uri === uri);
			
			await musicStore.playTrack(track, songIndex);
			showGrid = false;
		} catch (error) {
			console.error('Error playing song:', error);

			if (error.status === 404) {
				// Try opening web player as fallback
				const webPlayerUrl = 'https://open.spotify.com';
				window.open(webPlayerUrl, '_blank');

				alert(
					"No active Spotify device found.\n\nI've opened Spotify web player for you.\n\nPlease:\n1. Keep the web player tab open\n2. Log in to Spotify\n3. Try playing the song again\n\nYour app will control the web player once it's active."
				);
			} else if (error.status === 403) {
				alert('Playback control requires a Spotify Premium account.');
			} else {
				alert(`Error playing song: ${error.message || 'Unknown error'}`);
			}
		}
	}

	async function playNext() {
		await musicStore.playNext();
	}

	async function playPrevious() {
		await musicStore.playPrevious();
	}

	async function togglePlayPause() {
		await musicStore.togglePlayPause();
	}

	// Playback polling is now handled by the music store

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatImageUrl(images, size = 300) {
		if (!images || images.length === 0) return null;
		return images.find((img) => img.width >= size)?.url || images[0].url;
	}

	// Helper function to open Spotify web player
	function openSpotifyWebPlayer() {
		const webPlayerUrl = 'https://open.spotify.com';
		window.open(webPlayerUrl, '_blank');
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');

	// Reactive statement to update selected device when devices change
	$: if (availableDevices.length > 0 && !selectedDeviceId) {
		// Auto-select web player if available, otherwise first device
		const webPlayer = availableDevices.find(
			(device) =>
				device.type === 'Computer' &&
				(device.name.includes('Web Player') ||
					device.name.includes('Chrome') ||
					device.name.includes('Safari'))
		);

		if (webPlayer) {
			selectedDeviceId = webPlayer.id;
			selectedDeviceName = webPlayer.name;
			console.log('Auto-selected web player device:', webPlayer.name);
		} else {
			selectedDeviceId = availableDevices[0].id;
			selectedDeviceName = availableDevices[0].name;
			console.log('Auto-selected device:', availableDevices[0].name);
		}
	}

	// Reactive statement to sync selectedDeviceName with selectedDeviceId
	$: if (selectedDeviceName && availableDevices.length > 0) {
		const device = availableDevices.find((d) => d.name === selectedDeviceName);
		if (device) {
			selectedDeviceId = device.id;
			musicStore.setSelectedDeviceId(device.id);
			console.log('Device selection changed to:', device.name, 'ID:', device.id);
		}
	}
</script>

<div class="page-holder">
	{#if isInitializing}
		<!-- Always show loader first -->
		<div class="page pt-4 px-4 flex flex-col h-screen" class:page-exit={isExiting}>
			<span class="text-6xl font-[300] h-[10%]">spotify</span>
			<div class="flex-1 flex flex-col items-center justify-center my-24">
				<Loader />
			</div>
		</div>
	{:else if !isAuthenticated}
		<!-- Login State - shown after loading if no auth -->
		<div class="page pt-4 px-4 flex flex-col h-screen" class:page-exit={isExiting}>
			<span class="text-6xl font-[300] h-[10%]">spotify</span>
			<div class="flex-1 flex flex-col items-start justify-center">
				<div class="max-w-md">
					<Icon icon="mdi:music" width="150" height="150" class="text-green-600 mb-6" />
					<h2 class="text-3xl font-[300] mb-4">Connect Your Spotify Account</h2>
					<p class="text-gray-400 mb-8 font-[300] text-xl">
						Connect your Spotify account to access your liked songs and music library.
					</p>
					<button
						on:click={login}
						class="px-4 py-2 bg-green-600 hover:bg-green-600 {textClass} font-medium text-lg transition-colors"
					>
						Connect with Spotify
					</button>
				</div>
			</div>
		</div>
	{:else if nowPlayingTrack && nowPlayingTrack.type === 'spotify'}
		<!-- Now Playing State -->
		<div
			class="flex flex-col pt-4 w-full font-[400] h-screen page px-4 overflow-x-hidden"
			class:page-exit={isExiting}
		>
			<span class="text-6xl font-[300] h-[10%]">spotify</span>
			<div class="flex flex-col gap-2 mb-16 overflow-x-hidden">
				<span class="text-4xl font-[300]">now playing</span>

				<!-- Album Art -->
				<div class="flex w-72 h-72 justify-center items-center mt-4">
					{#if nowPlayingTrack.album?.images}
						<img
							src={formatImageUrl(nowPlayingTrack.album.images, 300)}
							alt={nowPlayingTrack.album.name}
							class="w-72 h-72 object-cover"
						/>
					{:else}
						<div class="w-72 h-72 bg-gray-700 flex items-center justify-center">
							<Icon icon="mdi:music" width="168" height="168" class="text-gray-400" />
						</div>
					{/if}
				</div>

				<!-- Seek Bar -->
				<div class="flex flex-col gap-2 w-72 max-w-md">
					<div class="flex justify-between text-sm text-gray-400">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
					<div class="relative w-full h-2 bg-gray-200">
						<div
							class="absolute top-0 left-0 h-full bg-green-600 transition-all duration-100 ease-in-out"
							style="width: {seekValue}%"
						></div>
					</div>
				</div>

				<!-- Song Info -->
				<div class="flex flex-col gap-1 w-72 max-w-full">
					<span class="text-2xl font-[300] mt-2 truncate" title={nowPlayingTrack.name}>{nowPlayingTrack.name}</span>
					<span class="text-lg text-gray-400 truncate" title={nowPlayingTrack.artists?.map((a) => a.name).join(', ')}
						>{nowPlayingTrack.artists?.map((a) => a.name).join(', ')}</span
					>
				</div>

				<!-- Playback Controls -->
				<div class="flex flex-row justify-between mt-6 w-72">
					<button
						class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2"
						on:click={playPrevious}
					>
						<Icon icon="mdi:skip-previous" width="32" height="32" />
					</button>
					<button
						class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2"
						on:click={togglePlayPause}
					>
						<Icon icon={isPlayingState ? 'mdi:pause' : 'mdi:play'} width="32" height="32" />
					</button>
					<button
						class="flex flex-row gap-4 items-center border-2 border-white rounded-full p-2"
						on:click={playNext}
					>
						<Icon icon="mdi:skip-next" width="32" height="32" />
					</button>
				</div>
				<!-- <div class="flex flex-row gap-4 items-center mt-4 w-full">
                    <Select
                        bind:selection={selectedDeviceName}
                        data={availableDevices.map(device => device.name)}
                        label="Select device to play on"
                        className="w-full"
                    />
                </div> -->
			</div>
		</div>
	{:else}
		<!-- Library State -->
		<div>
			{#if showGrid}
				<LetterGrid
					items={likedSongs}
					itemNameKey="name"
					{showGrid}
					{isExiting}
					onLetterClick={handleLetterClick}
				/>
			{:else}
				<div
					class="flex flex-col pt-4 w-full font-[400] h-screen page overflow-x-hidden"
					class:page-exit={isExiting}
				>
					<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
					<div class="flex flex-col gap-8 pb-16 mt-6 overflow-y-auto overflow-x-hidden px-4">
						{#if isLoading}
							<!-- Loading State -->
							<div class="flex flex-col gap-4 items-center justify-center my-24">
								<Loader />
							</div>
						{:else if likedSongs.length > 0}
							<!-- Liked Songs List -->
							{#each Object.entries(musicList) as musicEntry}
								<div class="flex flex-col gap-6">
									<button
										class="{textClass} text-3xl lowercase border-2 w-12 h-12 justify-start items-end flex pl-1 pb-1 font-[300]"
										style="background-color: {accentColor}; border-color: {accentColor};"
										id={musicEntry[0].toUpperCase()}
										on:click={() => {
											showGrid = true;
										}}
									>
										{musicEntry[0]}
									</button>
									{#each musicEntry[1] as song}
										<button
											class="flex flex-row gap-4 items-center w-full min-w-0"
											on:click={() => playSong(song.uri, song)}
										>
											<!-- Album Art -->
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

											<!-- Song Info -->
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
						{:else}
							<!-- Empty State -->
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
				</div>
			{/if}
		</div>
	{/if}
</div>
<BottomControls expanded={isExpanded} unmounting={isUnmounting} on:toggle={handleToggle}>
	<div class="flex flex-row gap-12 justify-center items-center">
		{#if nowPlayingTrack}
			<div
				class="btn-animate flex flex-col gap-2 justify-center items-center"
				class:animate={isExpanded}
			>
				<button
					class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
					on:click={() => {
						musicStore.clear();
					}}
				>
					<Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
				</button>
				<span class="text-xs font-[400]">library</span>
			</div>
		{/if}
		<div
			class="btn-animate flex flex-col gap-2 justify-center items-center"
			class:animate={isExpanded}
		>
			<button
				on:click={closePage}
				class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
			>
				<Icon icon="rivet-icons:close" width="18" height="18" strokeWidth="2" />
			</button>
			<span class="text-xs font-[400]">close</span>
		</div>
	</div>
</BottomControls>

<style>
	.btn-animate {
		transform: translateY(120%);
		opacity: 0;
	}

	.btn-animate.animate {
		animation: button-overshoot 0.5s ease-out forwards;
		opacity: 1;
	}

	@keyframes button-overshoot {
		0% {
			transform: translateY(120%);
		}
		70% {
			transform: translateY(-20%);
		}
		100% {
			transform: translateY(0);
		}
	}
</style>
