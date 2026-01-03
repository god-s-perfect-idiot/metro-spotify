<script>
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import InitializingPage from './spotify/InitializingPage.svelte';
	import SetupPage from './spotify/SetupPage.svelte';
	import LoginPage from './spotify/LoginPage.svelte';
	import { getAuthUrl } from '../lib/spotify-config.js';
	import { addToast } from '../store/toast.js';
	
	let isInitializing = true;
	let showSetup = false;
	let spotifyClientId = '';
	let spotifyClientSecret = '';
	
	onMount(async () => {
		if (browser) {
			loadSpotifySettings();
			accountsStore.loadFromStorage();
			// Check if we have a token
			const hasToken = accountsStore.hasValidToken('spotify');
			if (!hasToken) {
				isInitializing = false;
			} else {
				// If we have a token, we should be authenticated and this component shouldn't render
				isInitializing = false;
			}
		}
	});
	
	function loadSpotifySettings() {
		if (!browser) return;
		spotifyClientId = localStorage.getItem('spotify_client_id') || '';
		spotifyClientSecret = localStorage.getItem('spotify_client_secret') || '';
	}
	
	function saveSpotifySettings() {
		if (!browser) return;
		localStorage.setItem('spotify_client_id', spotifyClientId);
		localStorage.setItem('spotify_client_secret', spotifyClientSecret);
	}
	
	export async function connectSpotify() {
		// Save credentials first
		saveSpotifySettings();
		
		// Check if client ID is configured
		if (!spotifyClientId) {
			addToast('Please enter your Spotify Client ID first.');
			return;
		}

		// Trigger OAuth
		await login();
	}
	
	async function login() {
		const authUrl = getAuthUrl();
		// Always use window.location.href to navigate in the same tab
		window.location.href = authUrl;
	}
	
	export function showSetupPage() {
		showSetup = true;
	}

	export function hideSetupPage() {
		showSetup = false;
	}
	
	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');
	
	// Determine current view state
	$: viewState = (() => {
		if (isInitializing) return 'initializing';
		if (isAuthenticated) return 'authenticated'; // Shouldn't happen, but just in case
		return showSetup ? 'setup' : 'login';
	})();
</script>

{#if viewState === 'initializing'}
	<InitializingPage isExiting={false} />
{:else if viewState === 'setup'}
	<SetupPage
		isExiting={false}
		bind:spotifyClientId
		bind:spotifyClientSecret
		onConnect={connectSpotify}
	/>
{:else if viewState === 'login'}
	<LoginPage isExiting={false} onSetupClick={showSetupPage} />
{/if}

