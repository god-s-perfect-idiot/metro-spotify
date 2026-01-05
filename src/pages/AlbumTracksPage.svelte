<script>
	import { router, currentRoute } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import AlbumTracksPage from './spotify/AlbumTracksPage.svelte';

	let isExiting = false;
	let isLoading = true;
	let albumId = null;
	let albumName = '';
	let albumArtist = '';
    let copyright = '';
	let tracks = [];
	let spotifyApi = null;

	// Get album ID from route
	$: {
		if (browser && $currentRoute) {
			const match = $currentRoute.match(/^\/album\/(.+)$/);
			if (match && match[1] !== albumId) {
				albumId = match[1];
				if (spotifyApi) {
					loadAlbumTracks();
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
			
			// Extract album ID from route
			if ($currentRoute) {
				const match = $currentRoute.match(/^\/album\/(.+)$/);
				if (match) {
					albumId = match[1];
					await loadAlbumTracks();
				} else {
					router.goto('/albums');
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

	async function loadAlbumTracks() {
		if (!spotifyApi || !albumId) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getAlbumTracksKey(albumId);
			
			// Get album info (not cached as it might change)
			const albumInfo = await spotifyApi.getAlbum(albumId);
			albumName = albumInfo.name || 'Album';
			albumArtist = albumInfo.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
			copyright = albumInfo.copyrights?.map((c) => c.text).join('\n') || '';

			// Load tracks with caching
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				let allTracks = [];
				let offset = 0;
				const limit = 50;
				let hasMore = true;

				while (hasMore) {
					const response = await spotifyApi.getAlbumTracks(albumId, { limit, offset });
					const fetchedTracks = response.items.filter((track) => track && track.uri);

					if (fetchedTracks.length === 0) {
						hasMore = false;
					} else {
						const enrichedTracks = fetchedTracks.map(track => ({
							...track,
							album: {
								id: albumInfo.id,
								name: albumInfo.name,
								images: albumInfo.images,
								artists: albumInfo.artists
							}
						}));
						
						allTracks = allTracks.concat(enrichedTracks);
						offset += limit;

						if (fetchedTracks.length < limit || !response.next) {
							hasMore = false;
						}
					}
				}

				return allTracks.map(track => ({
					...track,
					type: 'spotify'
				}));
			}, { cacheType: 'album_tracks' });

			tracks = cachedData;

			// Set queue to album tracks
			musicStore.setQueue(tracks);
		} catch (error) {
			console.error('Error loading album tracks:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 404) {
				addToast('Album not found.');
				router.goto('/albums');
			} else {
				addToast('Failed to load album tracks. Please try again.');
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
	<AlbumTracksPage
		{isExiting}
		{isLoading}
		albumName={albumName}
		albumArtist={albumArtist}
		{copyright}
		{tracks}
		onPlaySong={handlePlaySong}
	/>
</div>

