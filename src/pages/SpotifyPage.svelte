<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount, tick } from 'svelte';
	import { browser, getPlayerId } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { getAuthUrl } from '../lib/spotify-config.js';
	import { musicStore, currentTrack, isPlaying, playbackProgress } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { bottomBarExpanded } from '../store/bottomBar.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import LibraryPage from './spotify/LibraryPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let likedSongs = [];
	let spotifyApi = null;
	let showGrid = false;
	let musicList = {};
	let targetChar = '';

	// Subscribe to music store
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
	
	let availableDevices = [];
	let selectedDeviceId = null;
	let selectedDeviceName = null;
	let webPlayerReady = false;
	let isInitializing = true;
	let spotifyClientId = '';
	let spotifyClientSecret = '';


	// Initialize Spotify on page load
	onMount(async () => {
		isInitializing = true;
		if (browser) {
			loadSpotifySettings();
			// Reload accounts from storage in case we just came from callback
			accountsStore.loadFromStorage();
			await initializeSpotify();
		}
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

	export async function connectSpotify() {
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
		const hasToken = await accountsStore.hasValidToken('spotify');
		const isAuth = await accountsStore.isAuthenticated('spotify');
		console.log('📋 Auth status:', { hasToken, isAuth });
		
		// Check if we have a valid token
		if (hasToken) {
			console.log('✅ Valid token found, initializing Spotify API...');
			const token = await accountsStore.getAccessToken('spotify');
			console.log('🎫 Token retrieved:', token ? 'Token exists' : 'No token');
			await initializeSpotifyApi(token);
			await initializeWebPlayer(token);
			await loadAvailableDevices();
			// Poll for devices a few times to catch the web player
			setTimeout(() => loadAvailableDevices(), 2000);
			setTimeout(() => loadAvailableDevices(), 4000);
			await loadLikedSongs();
			// Fetch and save username if not already in localStorage (fallback for existing users)
			await fetchAndSaveUsername(token);
			isInitializing = false;
			console.log('✅ Spotify initialization complete');
		} else {
			console.log('❌ No valid token found');
			isInitializing = false;
			isLoading = false;
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

	async function fetchAndSaveUsername(token) {
		// Only fetch if username is not already in localStorage
		if (localStorage.getItem('spotify_username')) {
			return;
		}

		try {
			if (!spotifyApi) {
				const { default: SpotifyWebApi } = await import('spotify-web-api-js');
				spotifyApi = new SpotifyWebApi();
				spotifyApi.setAccessToken(token);
			}
			const userInfo = await spotifyApi.getMe();
			const username = userInfo.display_name || userInfo.id || 'Spotify User';
			localStorage.setItem('spotify_username', username);
			console.log('✅ Username fetched and saved to localStorage:', username);
		} catch (error) {
			console.error('Error fetching username:', error);
			// Continue even if username fetch fails
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
			// Get unique player ID for this tab/instance
			const playerId = getPlayerId();
			const playerName = playerId ? `Metro Spotify (${playerId})` : 'Metro Spotify';

			const player = new window.Spotify.Player({
				name: playerName,
				getOAuthToken: async (cb) => {
					const hasToken = await accountsStore.hasValidToken('spotify');
					if (hasToken) {
						const currentToken = await accountsStore.getAccessToken('spotify');
						cb(currentToken);
					} else {
						cb(initialToken);
					}
				},
				volume: 0.5
			});

			player.addListener('initialization_error', ({ message }) => {
				console.error('❌ Spotify Player initialization error:', message);
				addToast('Failed to initialize Metro Spotify player: ' + message);
			});

			player.addListener('authentication_error', ({ message }) => {
				console.error('❌ Spotify Player authentication error:', message);
				addToast('Authentication error: ' + message);
			});

			player.addListener('account_error', ({ message }) => {
				console.error('❌ Spotify Player account error:', message);
				addToast('Account error: ' + message);
			});

			player.addListener('playback_error', ({ message }) => {
				console.error('❌ Spotify Player playback error:', message);
			});

			player.addListener('ready', ({ device_id }) => {
				console.log('✅ Spotify Web Player ready with device ID:', device_id);
				webPlayerReady = true;
				selectedDeviceId = device_id;
				const playerId = getPlayerId();
				selectedDeviceName = playerId ? `Metro Spotify (${playerId})` : 'Metro Spotify';
				// Immediately set the device ID in music store
				musicStore.setSelectedDeviceId(device_id);
				console.log('✅ Metro Spotify device ID set in music store:', device_id);
				loadAvailableDevices();
			});

			player.addListener('not_ready', ({ device_id }) => {
				console.warn('⚠️ Spotify Web Player not ready, device_id:', device_id);
			});

			console.log('🔄 Attempting to connect Metro Spotify web player...');
			player.connect().then((success) => {
				if (success) {
					console.log('✅ Spotify Web Player connected successfully');
				} else {
					console.error('❌ Spotify Web Player connection returned false');
					addToast('Failed to connect Metro Spotify player. Please refresh the page.');
				}
			}).catch((error) => {
				console.error('❌ Failed to connect Spotify Web Player:', error);
				addToast('Failed to connect Metro Spotify player: ' + (error.message || 'Unknown error'));
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

			// Get player ID to match the correct device
			const playerId = getPlayerId();
			const metroPlayer = availableDevices.find(
				(device) => {
					if (playerId) {
						// Match device name that starts with "Metro Spotify" and contains the player ID
						return device.name === `Metro Spotify (${playerId})` || device.name.startsWith('Metro Spotify');
					} else {
						// Fallback to exact match if no player ID
						return device.name === 'Metro Spotify' || device.name.startsWith('Metro Spotify');
					}
				}
			);

			if (metroPlayer) {
				selectedDeviceId = metroPlayer.id;
				selectedDeviceName = metroPlayer.name;
				musicStore.setSelectedDeviceId(metroPlayer.id);
				console.log('✅ Metro Spotify device selected:', metroPlayer.id);
			} else {
				// DO NOT fall back to other devices - only use Metro Spotify
				console.warn('⚠️ Metro Spotify device not found. Waiting for device to be available...');
				// Clear device selection to prevent using wrong device
				selectedDeviceId = null;
				selectedDeviceName = null;
				musicStore.setSelectedDeviceId(null);
			}
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadLikedSongs() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getLikedSongsKey();
			
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				// Fetch all songs
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
				}

				// Filter and sort
				const filtered = allSongs.filter((song) => song.name && song.name.trim() !== '');
				filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'liked_songs' });

			likedSongs = cachedData;

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
		targetChar = char;
		// Don't set isExiting for letter grid - it's not a page navigation
		setTimeout(
			() => {
				const targetId = char.toUpperCase();
				scrollToChar(targetId);
				showGrid = false;
			},
			27 * 10 + 200
		);
		targetChar = '';
	}

	function showSetupPage() {
		showSetup = true;
	}

	function hideSetupPage() {
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
		// Clear username from localStorage
		localStorage.removeItem('spotify_username');
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
			const track = {
				...song,
				type: 'spotify'
			};
			
			// Get all tracks from the current list (musicList)
			// Flatten all tracks from all letter groups
			const allTracks = Object.values(musicList).flat().map(s => ({
				...s,
				type: 'spotify'
			}));
			
			// Find the index of the current track in the list
			const songIndex = allTracks.findIndex((s) => s.uri === uri);
			
			await musicStore.playTrack(track, songIndex >= 0 ? songIndex : -1, allTracks);
			showGrid = false;
			
			// Navigate to now-playing when playing a song
			router.goto('/now-playing');
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

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
	$: {
		if (browser) {
			console.log('🔍 Auth state changed:', { isAuthenticated });
		}
	}
	
	// SpotifyPage only handles library view - now-playing is a separate route
	
	// Track state changes to auto-close bottom bar
	let previousStateKey = '';
	$: currentStateKey = `${showGrid}-${nowPlayingTrack?.id || 'none'}`;
	
	// Close bottom bar whenever state changes
	$: {
		if (previousStateKey && previousStateKey !== currentStateKey) {
			bottomBarExpanded.set(false);
		}
		previousStateKey = currentStateKey;
	}
</script>

<div class="page-holder">
	<LibraryPage
		{isExiting}
		{isLoading}
		{likedSongs}
		{musicList}
		{showGrid}
		onPlaySong={playSong}
		onLetterClick={handleLetterClick}
		onShowGrid={() => { showGrid = true; }}
	/>
</div>
