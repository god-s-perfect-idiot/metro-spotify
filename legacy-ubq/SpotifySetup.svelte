<script>
	import { accentColorStore, textColorClassStore } from '../../../utils/theme';
	import { accountsStore } from '../../../store/accounts.js';
	import { addToast } from '../../../store/toast';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Input from '../../../components/Input.svelte';
	import Button from '../../../components/Button.svelte';
	import { getAuthUrl } from '../../../lib/spotify-config.js';

	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;

	let spotifyClientId = '';
	let spotifyClientSecret = '';
	let isSpotifyConnected = false;
	const SPOTIFY_REDIRECT_URI = 'https://ubiquity-1.netlify.app/spotify/callback';

	onMount(() => {
		checkSpotifyStatus();
		loadSpotifySettings();
	});

	const loadSpotifySettings = () => {
		if (!browser) return;

		// Load Client ID from localStorage only
		spotifyClientId = localStorage.getItem('spotify_client_id') || '';

		// Load Client Secret from localStorage only
		spotifyClientSecret = localStorage.getItem('spotify_client_secret') || '';
	};

	const saveSpotifySettings = () => {
		if (!browser) return;

		localStorage.setItem('spotify_client_id', spotifyClientId);
		localStorage.setItem('spotify_client_secret', spotifyClientSecret);
		addToast('Spotify credentials saved successfully.');
	};

	const checkSpotifyStatus = () => {
		isSpotifyConnected = accountsStore.isAuthenticated('spotify');
	};

	const connectSpotify = () => {
		if (!spotifyClientId) {
			addToast('Please enter your Spotify Client ID first.');
			return;
		}

		// Save credentials before connecting (required for getAuthUrl to work)
		if (spotifyClientId) {
			localStorage.setItem('spotify_client_id', spotifyClientId);
			if (spotifyClientSecret) {
				localStorage.setItem('spotify_client_secret', spotifyClientSecret);
			}
		}

		try {
			const authUrl = getAuthUrl();
			window.location.href = authUrl;
		} catch (error) {
			addToast('Error: ' + error.message);
		}
	};

	const disconnectSpotify = () => {
		accountsStore.logout('spotify');
		accountsStore.cleanupStorage('spotify');
		isSpotifyConnected = false;
		addToast('Spotify account disconnected successfully.');
	};
</script>

<div class="flex flex-col gap-4 items-start justify-start w-full h-full p-4">
	<span class="text-lg text-left w-full font-semibold {textClass}">SPOTIFY SETUP</span>

	<p class="text-lg {textClass}">
		You can connect your Spotify account to your device to use the Metro Spotify music player app.
	</p>

	<!-- Developer Setup -->
	<div class="flex flex-col gap-4 w-full">
		<span class="text-sm font-[300] text-[#a1a1a1]">
			Get credentials from the
			<a
				href="https://developer.spotify.com/dashboard"
				target="_blank"
				rel="noopener noreferrer"
				class="text-blue-400 underline">Spotify Developer Dashboard</a
			>.
		</span>

		<div class="flex flex-col gap-4">
			<Input label="Client ID" bind:content={spotifyClientId} />
			<div class="flex flex-col gap-2 font-[400]">
				<label for="spotify-client-secret" class="text-[#767676] text-sm">Client Secret</label>
				<input
					id="spotify-client-secret"
					type="password"
					bind:value={spotifyClientSecret}
					class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-[300] text-[#a1a1a1]">Redirect URI:</span>
			<span class="text-base font-[300] text-[#767676] mt-1">{SPOTIFY_REDIRECT_URI}</span>
		</div>

		<div class="mt-2">
			<Button text="save" onClick={saveSpotifySettings} />
		</div>
	</div>

	<!-- Connection Status -->
	<div class="flex flex-col gap-4 w-full mt-6">
		{#if isSpotifyConnected}
			<span class="text-xl font-[300]">Your Spotify account is connected.</span>
			<Button text="disconnect spotify account" onClick={disconnectSpotify} />
		{:else}
			<span class="text-xl font-[300]">Your Spotify account is not connected .</span>
			<Button text="connect spotify account" onClick={connectSpotify} />
		{/if}
	</div>
</div>

<style>
	.stage-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1.5rem;
	}

	.icon-container {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background-color: var(--accent-color);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.9;
		margin-bottom: 1rem;
	}

	.stage-title {
		font-size: 2rem;
		font-weight: 300;
		margin: 0;
	}

	.stage-description {
		font-size: 1.125rem;
		line-height: 1.6;
		opacity: 0.8;
		margin: 0;
		max-width: 500px;
	}
</style>
