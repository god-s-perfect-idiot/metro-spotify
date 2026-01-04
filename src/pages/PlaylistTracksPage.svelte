<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	
	// Page components
	import PlaylistTracksPage from './spotify/PlaylistTracksPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let playlistId = null;
	let playlistName = '';
	let tracks = [];
	let spotifyApi = null;

	// Get playlist ID from route
	$: {
		if (browser && $currentRoute) {
			const match = $currentRoute.match(/^\/playlist\/(.+)$/);
			if (match && match[1] !== playlistId) {
				playlistId = match[1];
				if (spotifyApi) {
					loadPlaylistTracks();
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
			
			// Extract playlist ID from route
			if ($currentRoute) {
				const match = $currentRoute.match(/^\/playlist\/(.+)$/);
				if (match) {
					playlistId = match[1];
					await loadPlaylistTracks();
				} else {
					router.goto('/playlists');
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

	async function loadPlaylistTracks() {
		if (!spotifyApi || !playlistId) return;

		isLoading = true;
		try {
			// First, get playlist info to get the name
			const playlistInfo = await spotifyApi.getPlaylist(playlistId);
			playlistName = playlistInfo.name || 'Playlist';

			// Then load all tracks
			let allTracks = [];
			let offset = 0;
			const limit = 100;
			let hasMore = true;

			while (hasMore) {
				const response = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
				const fetchedTracks = response.items
					.map((item) => item.track)
					.filter((track) => track && track.uri); // Filter out null tracks

				if (fetchedTracks.length === 0) {
					hasMore = false;
				} else {
					allTracks = allTracks.concat(fetchedTracks);
					offset += limit;

					if (fetchedTracks.length < limit || !response.next) {
						hasMore = false;
					}
				}
			}

			// Set tracks with type
			tracks = allTracks.map(track => ({
				...track,
				type: 'spotify'
			}));

			// Set queue to playlist tracks
			musicStore.setQueue(tracks);
		} catch (error) {
			console.error('Error loading playlist tracks:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 404) {
				addToast('Playlist not found.');
				router.goto('/playlists');
			} else {
				addToast('Failed to load playlist tracks. Please try again.');
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
			if (error.status === 404) {
				addToast('No active Spotify device found. Please open Spotify on another device.');
			} else if (error.status === 403) {
				addToast('Playback control requires a Spotify Premium account.');
			} else {
				addToast(`Error playing song: ${error.message || 'Unknown error'}`);
			}
		}
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<PlaylistTracksPage
		{isExiting}
		{isLoading}
		{playlistName}
		{tracks}
		onPlaySong={handlePlaySong}
	/>
</div>

