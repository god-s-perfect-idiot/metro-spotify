<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser, getPlayerId } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import PlaylistsPage from './spotify/PlaylistsPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let playlists = [];
	let spotifyApi = null;

	// Initialize Spotify on page load
	onMount(async () => {
		if (browser) {
			accountsStore.loadFromStorage();
			await initializeSpotify();
		}
	});

	async function initializeSpotify() {
		const hasToken = await accountsStore.hasValidToken('spotify');
		
		if (hasToken) {
			const token = await accountsStore.getAccessToken('spotify');
			await initializeSpotifyApi(token);
			await loadAvailableDevices();
			await loadPlaylists();
		} else {
			isLoading = false;
			// Redirect to home if not authenticated
			router.goto('/');
		}
	}

	async function initializeSpotifyApi(token) {
		try {
			// Dynamically import Spotify Web API
			const { default: SpotifyWebApi } = await import('spotify-web-api-js');
			spotifyApi = new SpotifyWebApi();
			spotifyApi.setAccessToken(token);
			musicStore.setSpotifyApi(spotifyApi);
		} catch (error) {
			console.error('Error initializing Spotify API:', error);
		}
	}

	async function loadAvailableDevices() {
		if (!spotifyApi) return;

		try {
			const devices = await spotifyApi.getMyDevices();
			const availableDevices = devices.devices || [];

			// Get player ID to match the correct device for this tab
			const playerId = getPlayerId();
			const metroPlayer = availableDevices.find(
				(device) => {
					if (playerId) {
						// Match device name that starts with "Metro Spotify" and contains the player ID
						return device.name === `Metro Spotify (${playerId})` || device.name.startsWith('Metro Spotify');
					} else {
						// Fallback to exact match or pattern match if no player ID
						return device.name === 'Metro Spotify' || device.name.startsWith('Metro Spotify');
					}
				}
			);

			if (metroPlayer) {
				musicStore.setSelectedDeviceId(metroPlayer.id);
			} else {
				// DO NOT fall back to other devices - only use Metro Spotify
				musicStore.setSelectedDeviceId(null);
			}
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadPlaylists() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getPlaylistsKey();
			
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				let allPlaylists = [];
				let offset = 0;
				const limit = 50;
				let hasMore = true;

				while (hasMore) {
					const response = await spotifyApi.getUserPlaylists({ limit, offset });
					const fetchedPlaylists = response.items || [];

					if (fetchedPlaylists.length === 0) {
						hasMore = false;
					} else {
						allPlaylists = allPlaylists.concat(fetchedPlaylists);
						offset += limit;

						if (fetchedPlaylists.length < limit) {
							hasMore = false;
						}
					}
				}

				const filtered = allPlaylists.filter((playlist) => playlist.name && playlist.name.trim() !== '');
				filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'playlists' });

			playlists = cachedData;
		} catch (error) {
			console.error('Error loading playlists:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else {
				addToast('Failed to load playlists. Please try again.');
			}
		} finally {
			isLoading = false;
		}
	}

	function handlePlaylistClick(playlist) {
		// Navigate to playlist detail page
		router.goto(`/playlist/${playlist.id}`);
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<PlaylistsPage
		{isExiting}
		{isLoading}
		{playlists}
		onPlaylistClick={handlePlaylistClick}
	/>
</div>

