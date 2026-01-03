<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	
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
		const hasToken = accountsStore.hasValidToken('spotify');
		
		if (hasToken) {
			const token = accountsStore.getAccessToken('spotify');
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

			const metroPlayer = availableDevices.find(
				(device) => device.name === 'Metro Spotify'
			);

			if (metroPlayer) {
				musicStore.setSelectedDeviceId(metroPlayer.id);
			} else if (availableDevices.length > 0) {
				musicStore.setSelectedDeviceId(availableDevices[0].id);
			}
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadUserPlaylists() {
		if (!spotifyApi || !userId) return;

		isLoading = true;
		try {
			// Get user info first
			try {
				const userInfo = await spotifyApi.getUser(userId);
				userName = userInfo.display_name || userInfo.id || 'User';
			} catch (err) {
				userName = userId;
			}

			// Load user's playlists
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

			playlists = allPlaylists.filter((playlist) => playlist.name && playlist.name.trim() !== '');
			playlists.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
		} catch (error) {
			console.error('Error loading user playlists:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 404) {
				addToast('User not found.');
				router.goto('/people');
			} else {
				addToast('Failed to load user playlists. Please try again.');
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
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');
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

