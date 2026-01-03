<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { musicStore } from '../store/music.js';
	import { addToast } from '../store/toast.js';
	
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
		const hasToken = accountsStore.hasValidToken('spotify');
		
		if (hasToken) {
			const token = accountsStore.getAccessToken('spotify');
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
						.filter(owner => owner && owner.id && owner.id !== 'spotify') // Exclude Spotify-owned playlists
						.filter((owner, index, self) => 
							index === self.findIndex(o => o.id === owner.id) // Get unique users
						);

					// Fetch full user profiles for each owner
					for (const owner of playlistOwners) {
						try {
							const userProfile = await spotifyApi.getUser(owner.id);
							if (userProfile && !allUsers.find(u => u.id === userProfile.id)) {
								allUsers.push(userProfile);
							}
						} catch (err) {
							// If we can't get the full profile, use the owner info we have
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

			users = allUsers.filter((user) => user.display_name && user.display_name.trim() !== '');
			users.sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }));
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
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');
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

