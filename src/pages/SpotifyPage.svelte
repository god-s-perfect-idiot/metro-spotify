<script>
	import BottomControls from '../components/BottomControls.svelte';
	import Icon from '@iconify/svelte';
	import { router } from '../lib/router.js';
	import { onMount, tick } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { getAuthUrl } from '../lib/spotify-config.js';
	import LetterGrid from '../components/LetterGrid.svelte';
	import Loader from '../components/Loader.svelte';
	import Input from '../components/Input.svelte';
	import Button from '../components/Button.svelte';
	import { accentColorStore, textColorClassStore } from '../utils/theme.js';
	import { musicStore, currentTrack, isPlaying, playbackProgress } from '../store/music.js';
	import { addToast } from '../store/toast.js';

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
	let isInitializing = true;
	let showSetup = false;
	let spotifyClientId = '';
	let spotifyClientSecret = '';

	function handleToggle(event) {
		isExpanded = event.detail.expanded;
	}

	function closeBottomBar() {
		if (isExpanded) {
			isExpanded = false;
			isUnmounting = true;
			setTimeout(() => {
				isUnmounting = false;
			}, 300);
		}
	}

	const closePage = () => {
		isUnmounting = true;
		setTimeout(() => {
			isExpanded = false;
			setTimeout(() => {
				isExiting = true;
				setTimeout(() => {
					router.goto('/');
				}, 200);
			}, 300);
		}, 300);
	};

	// Initialize Spotify on page load
	onMount(async () => {
		isInitializing = true;
		if (browser) {
			loadSpotifySettings();
			// Reload accounts from storage in case we just came from callback
			accountsStore.loadFromStorage();
			await initializeSpotify();
		}
		isExpanded = false;
	});

	function loadSpotifySettings() {
		if (!browser) return;
		spotifyClientId = localStorage.getItem('spotify_client_id') || '';
		spotifyClientSecret = localStorage.getItem('spotify_client_secret') || '';
	}

	function saveSpotifySettings() {
		if (!browser) return;
		localStorage.setItem('spotify_client_id', spotifyClientId);
		localStorage.setItem('spotify_client_secret', spotifyClientSecret);
	}

	async function connectSpotify() {
		// Save credentials first
		saveSpotifySettings();
		
		// Check if client ID is configured
		if (!spotifyClientId) {
			addToast('Please enter your Spotify Client ID first.');
			return;
		}

		// Trigger OAuth
		await login();
	}

	async function initializeSpotify() {
		console.log('🔄 Initializing Spotify...');
		const hasToken = accountsStore.hasValidToken('spotify');
		const isAuth = accountsStore.isAuthenticated('spotify');
		console.log('📋 Auth status:', { hasToken, isAuth });
		
		// Check if we have a valid token
		if (hasToken) {
			console.log('✅ Valid token found, initializing Spotify API...');
			const token = accountsStore.getAccessToken('spotify');
			console.log('🎫 Token retrieved:', token ? 'Token exists' : 'No token');
			await initializeSpotifyApi(token);
			await initializeWebPlayer(token);
			await loadAvailableDevices();
			// Poll for devices a few times to catch the web player
			setTimeout(() => loadAvailableDevices(), 2000);
			setTimeout(() => loadAvailableDevices(), 4000);
			await loadLikedSongs();
			isInitializing = false;
			console.log('✅ Spotify initialization complete');
		} else {
			console.log('❌ No valid token found');
			isInitializing = false;
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
				name: 'Metro Spotify',
				getOAuthToken: (cb) => {
					if (accountsStore.hasValidToken('spotify')) {
						const currentToken = accountsStore.getAccessToken('spotify');
						cb(currentToken);
					} else {
						cb(initialToken);
					}
				},
				volume: 0.5
			});

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

			player.addListener('ready', ({ device_id }) => {
				console.log('Spotify Web Player ready with device ID:', device_id);
				webPlayerReady = true;
				selectedDeviceId = device_id;
				selectedDeviceName = 'Metro Spotify';
				loadAvailableDevices();
			});

			player.connect().then((success) => {
				if (success) {
					console.log('Spotify Web Player connected successfully');
				}
			}).catch((error) => {
				console.error('Failed to connect Spotify Web Player:', error);
			});

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

			const metroPlayer = availableDevices.find(
				(device) => device.name === 'Metro Spotify'
			);

			if (metroPlayer) {
				selectedDeviceId = metroPlayer.id;
				selectedDeviceName = metroPlayer.name;
				musicStore.setSelectedDeviceId(metroPlayer.id);
			} else if (availableDevices.length > 0) {
				selectedDeviceId = availableDevices[0].id;
				selectedDeviceName = availableDevices[0].name;
				musicStore.setSelectedDeviceId(availableDevices[0].id);
			}
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadLikedSongs() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			let allSongs = [];
			let offset = 0;
			const limit = 50;
			let hasMore = true;

			while (hasMore) {
				const response = await spotifyApi.getMySavedTracks({ limit, offset });
				const songs = response.items.map((item) => item.track);

				if (songs.length === 0) {
					hasMore = false;
				} else {
					allSongs = allSongs.concat(songs);
					offset += limit;

					if (songs.length < limit) {
						hasMore = false;
					}
				}
				// Limit for development
				hasMore = false;
			}

			likedSongs = allSongs.filter((song) => song.name && song.name.trim() !== '');
			likedSongs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

			const tracksWithType = likedSongs.map(song => ({
				...song,
				type: 'spotify'
			}));
			musicStore.setQueue(tracksWithType);

			organizeSongsByLetter();
		} catch (error) {
			console.error('Error loading liked songs:', error);
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
		if (targetElement) {
			// Find the scrollable container (the div with overflow-y-auto)
			const scrollContainer = targetElement.closest('.overflow-y-auto');
			if (scrollContainer) {
				// Get the position of the target element relative to the scroll container
				const containerRect = scrollContainer.getBoundingClientRect();
				const targetRect = targetElement.getBoundingClientRect();
				const scrollTop = scrollContainer.scrollTop;
				const targetOffsetTop = targetRect.top - containerRect.top + scrollTop;
				// Scroll to the target within the container
				scrollContainer.scrollTo({ top: targetOffsetTop, behavior: 'instant' });
			} else {
				// Fallback to scrollIntoView if container not found
				targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
			}
		}
	}

	function handleLetterClick(char) {
		closeBottomBar();
		targetChar = char;
		isExiting = true;
		setTimeout(
			() => {
				const targetId = char.toUpperCase();
				scrollToChar(targetId);
				showGrid = false;
				isExiting = false;
			},
			27 * 10 + 200
		);
		targetChar = '';
	}

	function showSetupPage() {
		closeBottomBar();
		showSetup = true;
	}

	function hideSetupPage() {
		closeBottomBar();
		showSetup = false;
	}

	async function login() {
		const authUrl = getAuthUrl();
		// Always use window.location.href to navigate in the same tab
		window.location.href = authUrl;
	}

	async function logout() {
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

		closeBottomBar();

		try {
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
				alert('No active Spotify device found. Please open Spotify on another device.');
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

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatImageUrl(images, size = 300) {
		if (!images || images.length === 0) return null;
		return images.find((img) => img.width >= size)?.url || images[0].url;
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');
	$: {
		if (browser) {
			console.log('🔍 Auth state changed:', { isAuthenticated });
		}
	}

	// Track previous view state for navigation detection
	let previousViewState = '';

	// Determine current view state
	$: viewState = (() => {
		if (isInitializing) return 'initializing';
		if (!isAuthenticated) {
			return showSetup ? 'setup' : 'login';
		}
		if (nowPlayingTrack && nowPlayingTrack.type === 'spotify') {
			return 'now-playing';
		}
		return showGrid ? 'letter-grid' : 'library';
	})();

	// Animate bottom bar close on view state change
	$: if (previousViewState && viewState !== previousViewState) {
		// Close the bottom bar when navigating
		isExpanded = false;
		isUnmounting = true;
		setTimeout(() => {
			isUnmounting = false;
		}, 300); // Match the animation duration
	}
	$: previousViewState = viewState;
</script>

<div class="page-holder">
	{#if viewState === 'initializing'}
		<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
			<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
			<div class="flex-1 flex flex-col items-center justify-center my-24">
				<Loader />
			</div>
		</div>
	{:else if viewState === 'setup'}
			<!-- Setup Page -->
			<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
				<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
				<div class="flex flex-col gap-6 mt-12 flex-1 overflow-y-auto pb-24 px-4">
					<!-- Developer Setup -->
					<div class="flex flex-col gap-4">
						<span class="text-xl font-[300]" style="color: {accentColor};">developer setup</span>
						<span class="text-sm font-[300] text-[#a1a1a1]">
							Get credentials from the
							<a
								href="https://developer.spotify.com/dashboard"
								target="_blank"
								rel="noopener noreferrer"
								class="text-blue-400 underline">Spotify Developer Dashboard</a
							>.
						</span>

						<div class="flex flex-col gap-4">
							<Input label="Client ID" bind:content={spotifyClientId} />
							<div class="flex flex-col gap-2 font-[400]">
								<label for="spotify-client-secret" class="text-[#767676] text-sm">Client Secret</label>
								<input
									id="spotify-client-secret"
									type="password"
									bind:value={spotifyClientSecret}
									class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
								/>
							</div>
						</div>

						<div class="flex flex-col gap-2">
							<span class="text-sm font-[300] text-[#a1a1a1]">Redirect URI:</span>
							<span class="text-base font-[300] text-[#767676] mt-1">metrospotify://callback</span>
						</div>
					</div>

					<!-- Connection Status -->
					<div class="flex flex-col gap-2">
						<span class="text-xl font-[300]">
							Enter your credentials above, then click connect to authorize the app.
						</span>
						<span class="text-sm font-[300] text-[#a1a1a1]">
							Your credentials are stored locally on your device and never shared with anyone.
						</span>
					</div>

					<!-- Connect Button -->
					<div class="mt-6">
						<Button text="connect" onClick={connectSpotify} className="w-auto" />
					</div>
				</div>
			</div>
	{:else if viewState === 'login'}
		<!-- Login Page -->
		<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
			<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
			<div class="flex-1 flex flex-col items-start justify-center px-4">
				<div class="max-w-md">
					<Icon icon="mdi:music" width="150" height="150" class="text-green-500 mb-6" />
					<h2 class="text-3xl font-[300] mb-4">Connect Your Spotify Account</h2>
					<p class="text-gray-400 mb-8 font-[300] text-xl">
						Connect your Spotify account to access your liked songs and music library.
					</p>
					<button
						on:click={showSetupPage}
						class="px-4 py-2 bg-green-600 hover:bg-green-700 {textClass} font-medium text-lg transition-colors"
					>
						Connect with Spotify
					</button>
				</div>
			</div>
		</div>
	{:else if viewState === 'now-playing'}
		<div
			class="flex flex-col pt-4 w-full font-[400] h-screen page overflow-x-hidden"
			class:page-exit={isExiting}
		>
			<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
			<div class="flex flex-col gap-2 mb-16 overflow-x-hidden px-4">
				<span class="text-4xl font-[300]">now playing</span>

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

				<div class="flex flex-col gap-2 w-72 max-w-md">
					<div class="flex justify-between text-sm text-gray-400">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
					<div class="relative w-full h-2 bg-gray-200">
						<div
							class="absolute top-0 left-0 h-full bg-green-500 transition-all duration-100 ease-in-out"
							style="width: {seekValue}%"
						></div>
					</div>
				</div>

				<div class="flex flex-col gap-1 w-72 max-w-full">
					<span class="text-2xl font-[300] mt-2 truncate" title={nowPlayingTrack.name}>{nowPlayingTrack.name}</span>
					<span class="text-lg text-gray-400 truncate" title={nowPlayingTrack.artists?.map((a) => a.name).join(', ')}
						>{nowPlayingTrack.artists?.map((a) => a.name).join(', ')}</span
					>
				</div>

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
			</div>
		</div>
	{:else if viewState === 'letter-grid'}
		<LetterGrid
			items={likedSongs}
			itemNameKey="name"
			{showGrid}
			{isExiting}
			onLetterClick={handleLetterClick}
		/>
	{:else if viewState === 'library'}
				<div
					class="flex flex-col pt-4 w-full font-[400] h-screen page overflow-x-hidden"
					class:page-exit={isExiting}
				>
					<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
					<div class="flex flex-col gap-8 pb-16 mt-6 overflow-y-auto overflow-x-hidden px-4">
						{#if isLoading}
							<div class="flex flex-col gap-4 items-center justify-center my-24">
								<Loader />
							</div>
						{:else if likedSongs.length > 0}
							{#each Object.entries(musicList) as musicEntry}
								<div class="flex flex-col gap-6">
									<button
										class="{textClass} text-3xl lowercase border-2 w-12 h-12 justify-start items-end flex pl-1 pb-1 font-[300]"
										style="background-color: {accentColor}; border-color: {accentColor};"
										id={musicEntry[0].toUpperCase()}
										on:click={() => {
											closeBottomBar();
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
						{:else}
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
<BottomControls expanded={isExpanded} unmounting={isUnmounting} on:toggle={handleToggle}>
	<div class="flex flex-row gap-12 justify-center items-center">
		{#if showSetup && !isAuthenticated}
			<div
				class="btn-animate flex flex-col gap-2 justify-center items-center"
				class:animate={isExpanded}
			>
				<button
					class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
					on:click={hideSetupPage}
				>
					<Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
				</button>
				<span class="text-xs font-[400]">back</span>
			</div>
			<div
				class="btn-animate flex flex-col gap-2 justify-center items-center"
				class:animate={isExpanded}
			>
				<button
					class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
					on:click={connectSpotify}
				>
					<Icon icon="mdi:check" width="18" height="18" strokeWidth="2" />
				</button>
				<span class="text-xs font-[400]">connect</span>
			</div>
		{/if}
		{#if isAuthenticated && nowPlayingTrack}
			<div
				class="btn-animate flex flex-col gap-2 justify-center items-center"
				class:animate={isExpanded}
			>
				<button
					class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
					on:click={() => {
						closeBottomBar();
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
