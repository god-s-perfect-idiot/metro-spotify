<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import ArtistsPage from './spotify/ArtistsPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let artists = [];
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
			await loadArtists();
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
			} else if (availableDevices.length > 0) {
				musicStore.setSelectedDeviceId(availableDevices[0].id);
			}
		} catch (error) {
			console.error('Error loading devices:', error);
		}
	}

	async function loadArtists() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getArtistsKey();
			
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				let allArtists = [];
				let after = null;
				const limit = 50;
				let hasMore = true;

				while (hasMore) {
					// Only include 'after' in options if it's not null
					const options = { limit };
					if (after) {
						options.after = after;
					}
					
					const response = await spotifyApi.getFollowedArtists(options);
					const fetchedArtists = response.artists?.items || [];

					if (fetchedArtists.length === 0) {
						hasMore = false;
					} else {
						allArtists = allArtists.concat(fetchedArtists);
						after = response.artists.cursors?.after;

						if (!after || fetchedArtists.length < limit) {
							hasMore = false;
						}
					}
				}

				const filtered = allArtists.filter((artist) => artist.name && artist.name.trim() !== '');
				filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'artists' });

			artists = cachedData;
		} catch (error) {
			console.error('Error loading artists:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 403) {
				// Scope error - user needs to re-authenticate with new scopes
				addToast('Please re-authenticate to access artists. Log out and sign in again.');
				console.error('Scope error: User needs to re-authenticate with user-follow-read scope');
			} else if (error.status === 400) {
				// Bad request - might be API issue
				console.error('Bad request error:', error.message);
				addToast('Error loading artists. Please try again later.');
			} else {
				addToast('Failed to load artists. Please try again.');
			}
		} finally {
			isLoading = false;
		}
	}

	function handleArtistClick(artist) {
		// Navigate to artist tracks page
		router.goto(`/artist/${artist.id}`);
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<ArtistsPage
		{isExiting}
		{isLoading}
		{artists}
		onArtistClick={handleArtistClick}
	/>
</div>

