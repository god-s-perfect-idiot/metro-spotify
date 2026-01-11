<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import AlbumsPage from './spotify/AlbumsPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let albums = [];
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
			await loadAlbums();
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

			const metroPlayer = availableDevices.find(
				(device) => device.name === 'Metro Spotify'
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

	async function loadAlbums() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getAlbumsKey();
			
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				let allAlbums = [];
				let offset = 0;
				const limit = 50;
				let hasMore = true;

				while (hasMore) {
					const response = await spotifyApi.getMySavedAlbums({ limit, offset });
					const fetchedAlbums = response.items.map((item) => item.album);

					if (fetchedAlbums.length === 0) {
						hasMore = false;
					} else {
						allAlbums = allAlbums.concat(fetchedAlbums);
						offset += limit;

						if (fetchedAlbums.length < limit) {
							hasMore = false;
						}
					}
				}

				const filtered = allAlbums.filter((album) => album.name && album.name.trim() !== '');
				filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'albums' });

			albums = cachedData;
		} catch (error) {
			console.error('Error loading albums:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else {
				addToast('Failed to load albums');
			}
		} finally {
			isLoading = false;
		}
	}

	function handleAlbumClick(album) {
		// Navigate to album detail page
		router.goto(`/album/${album.id}`);
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<AlbumsPage
		{isExiting}
		{isLoading}
		{albums}
		onAlbumClick={handleAlbumClick}
	/>
</div>

