<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser, getPlayerId } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	
	// Page components
	import ArtistTracksPage from './spotify/ArtistTracksPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let artistId = null;
	let artistName = '';
	let tracks = [];
	let spotifyApi = null;

	// Get artist ID from route
	$: {
		if (browser && $currentRoute) {
			const match = $currentRoute.match(/^\/artist\/(.+)$/);
			if (match && match[1] !== artistId) {
				artistId = match[1];
				if (spotifyApi) {
					loadArtistTracks();
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
			
			// Extract artist ID from route
			if ($currentRoute) {
				const match = $currentRoute.match(/^\/artist\/(.+)$/);
				if (match) {
					artistId = match[1];
					await loadArtistTracks();
				} else {
					router.goto('/artists');
				}
			}
		} else {
			isLoading = false;
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

	async function loadArtistTracks() {
		if (!spotifyApi || !artistId) return;

		isLoading = true;
		try {
			// First, get artist info to get the name
			const artistInfo = await spotifyApi.getArtist(artistId);
			artistName = artistInfo.name || 'Artist';

			// Get artist's top tracks (defaults to 'US' market, can be changed)
			const topTracksResponse = await spotifyApi.getArtistTopTracks(artistId, 'US');
			const fetchedTracks = topTracksResponse.tracks || [];

			// Set tracks with type
			tracks = fetchedTracks.map(track => ({
				...track,
				type: 'spotify'
			}));
			// Don't set queue here - queue is set when playing via playTrack()
		} catch (error) {
			console.error('Error loading artist tracks:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 404) {
				addToast('Artist not found');
				router.goto('/artists');
			} else {
				addToast('Failed to load artist tracks');
			}
		} finally {
			isLoading = false;
		}
	}

	async function handlePlaySong(uri, song) {
		if (!spotifyApi || !song) return;

		try {
			const track = {
				...song,
				type: 'spotify'
			};
			
			// Find the index of the current track in the list
			const songIndex = tracks.findIndex((s) => s.uri === uri);
			
			await musicStore.playTrack(track, songIndex >= 0 ? songIndex : -1, tracks);
			router.goto('/now-playing');
		} catch (error) {
			console.error('Error playing song:', error);
			if (error.message && error.message.includes('Metro Spotify device not found')) {
				addToast('Device not found. Wait and retry');
			} else if (error.status === 404) {
				addToast('No active device found');
			} else if (error.status === 403) {
				addToast('Premium account required');
			} else {
				addToast('Error playing song');
			}
		}
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<ArtistTracksPage
		{isExiting}
		{isLoading}
		{artistName}
		{tracks}
		onPlaySong={handlePlaySong}
	/>
</div>

