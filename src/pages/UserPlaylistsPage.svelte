<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser, getPlayerId } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import UserPlaylistsPage from './spotify/UserPlaylistsPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let userId = null;
	let userName = '';
	let playlists = [];
	let spotifyApi = null;

	// Get user ID from route
	$: {
		if (browser && $currentRoute) {
			const match = $currentRoute.match(/^\/user\/(.+)$/);
			if (match && match[1] !== userId) {
				userId = match[1];
				if (spotifyApi) {
					loadUserPlaylists();
				}
			}
		}
	}

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
			
			// Extract user ID from route
			if ($currentRoute) {
				const match = $currentRoute.match(/^\/user\/(.+)$/);
				if (match) {
					userId = match[1];
					await loadUserPlaylists();
				} else {
					router.goto('/people');
				}
			}
		} else {
			isLoading = false;
			router.goto('/');
		}
	}

	async function initializeSpotifyApi(token) {
		try {
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

	async function loadUserPlaylists() {
		if (!spotifyApi || !userId) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getUserPlaylistsKey(userId);
			
			// Get user info first (not cached)
			try {
				const userInfo = await spotifyApi.getUser(userId);
				userName = userInfo.display_name || userInfo.id || 'User';
			} catch (err) {
				userName = userId;
			}

			// Load user's playlists with caching
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				let allPlaylists = [];
				let offset = 0;
				const limit = 50;
				let hasMore = true;

				while (hasMore) {
					const response = await spotifyApi.getUserPlaylists(userId, { limit, offset });
					const fetchedPlaylists = response.items || [];

					if (fetchedPlaylists.length === 0) {
						hasMore = false;
					} else {
						allPlaylists = allPlaylists.concat(fetchedPlaylists);
						offset += limit;

						if (fetchedPlaylists.length < limit || !response.next) {
							hasMore = false;
						}
					}
				}

				const filtered = allPlaylists.filter((playlist) => playlist.name && playlist.name.trim() !== '');
				filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'user_playlists' });

			playlists = cachedData;
		} catch (error) {
			console.error('Error loading user playlists:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 404) {
				addToast('User not found');
				router.goto('/people');
			} else {
				addToast('Failed to load user playlists');
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
	<UserPlaylistsPage
		{isExiting}
		{isLoading}
		userName={userName}
		{playlists}
		onPlaylistClick={handlePlaylistClick}
	/>
</div>

