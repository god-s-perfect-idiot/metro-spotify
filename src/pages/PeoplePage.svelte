<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser, getPlayerId } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	import { cacheManager } from '../lib/cache.js';
	
	// Page components
	import PeoplePage from './spotify/PeoplePage.svelte';

	let isExiting = false;
	let isLoading = true;
	let currentUser = null;
	let users = [];
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
			await loadCurrentUser();
			await loadFollowedUsers();
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

	async function loadCurrentUser() {
		if (!spotifyApi) return;

		try {
			const me = await spotifyApi.getMe();
			currentUser = me;
		} catch (error) {
			console.error('Error loading current user:', error);
		}
	}

	async function loadFollowedUsers() {
		if (!spotifyApi) return;

		isLoading = true;
		try {
			const cacheKey = cacheManager.getPeopleKey();
			
			const cachedData = await cacheManager.getOrFetch(cacheKey, async () => {
				// Note: Spotify Web API doesn't provide a direct endpoint to get all followed users.
				// We can get users from followed playlists as a workaround.
				// This will show users whose playlists you follow.
				
				let allUsers = [];
				let offset = 0;
				const limit = 50;
				let hasMore = true;

				// Get user's playlists to find playlist owners
				while (hasMore) {
					const response = await spotifyApi.getUserPlaylists({ limit, offset });
					const fetchedPlaylists = response.items || [];

					if (fetchedPlaylists.length === 0) {
						hasMore = false;
					} else {
						// Extract unique users from playlists
						const playlistOwners = fetchedPlaylists
							.map(playlist => playlist.owner)
							.filter(owner => owner && owner.id && owner.id !== 'spotify')
							.filter((owner, index, self) => 
								index === self.findIndex(o => o.id === owner.id)
							);

						// Fetch full user profiles for each owner
						for (const owner of playlistOwners) {
							try {
								const userProfile = await spotifyApi.getUser(owner.id);
								if (userProfile && !allUsers.find(u => u.id === userProfile.id)) {
									allUsers.push(userProfile);
								}
							} catch (err) {
								if (!allUsers.find(u => u.id === owner.id)) {
									allUsers.push({
										id: owner.id,
										display_name: owner.display_name || owner.id,
										images: owner.images || [],
										external_urls: owner.external_urls || {}
									});
								}
							}
						}

						offset += limit;

						if (fetchedPlaylists.length < limit || !response.next) {
							hasMore = false;
						}
					}
				}

				const filtered = allUsers.filter((user) => user.display_name && user.display_name.trim() !== '');
				filtered.sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }));
				
				return filtered;
			}, { cacheType: 'people' });

			users = cachedData;
		} catch (error) {
			console.error('Error loading followed users:', error);
			if (error.status === 401) {
				accountsStore.logout('spotify');
				router.goto('/');
			} else if (error.status === 403) {
				addToast('Please re-authenticate to access people. Log out and sign in again.');
				console.error('Scope error: User needs to re-authenticate with user-follow-read scope');
			} else {
				addToast('Failed to load people. Please try again.');
			}
		} finally {
			isLoading = false;
		}
	}

	function handleUserClick(user) {
		// Navigate to user profile/playlists page
		router.goto(`/user/${user.id}`);
	}

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
</script>

<div class="page-holder">
	<PeoplePage
		{isExiting}
		{isLoading}
		currentUser={currentUser}
		{users}
		onUserClick={handleUserClick}
	/>
</div>

