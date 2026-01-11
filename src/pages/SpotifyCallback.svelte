<script>
	import { onMount } from 'svelte';
	import { router } from '../lib/router.js';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { addToast } from '../store/toast.js';
	import { getRedirectUri } from '../lib/spotify-config.js';
	import { App as CapacitorApp } from '@capacitor/app';
	import { textColorClassStore, accentColorStore } from '../utils/theme.js';
	import Loader from '../components/Loader.svelte';
	
	let statusMessage = 'CONNECTING';
	let hasAnimated = false;
	let showDebug = false;
	
	$: textClass = $textColorClassStore;
	$: accentColor = $accentColorStore;

	onMount(() => {
		// Trigger page animation
		setTimeout(() => {
			hasAnimated = true;
		}, 50);
		
		if (browser) {
			setTimeout(() => {
				handleCallback();
			}, 100);
		}
	});

	async function handleCallback() {
		if (!browser) return;
		
		let urlParams = {};
		
		// Handle Capacitor deep link
		if (window.Capacitor) {
			CapacitorApp.addListener('appUrlOpen', (data) => {
				const url = new URL(data.url);
				urlParams = Object.fromEntries(url.searchParams);
				if (url.hash) {
					const hashParams = new URLSearchParams(url.hash.substring(1));
					urlParams = { ...urlParams, ...Object.fromEntries(hashParams) };
				}
				processCallback(urlParams);
			});
		}
		
		// Handle web URL
		if (window.location.search || window.location.hash) {
			const searchParams = new URLSearchParams(window.location.search);
			urlParams = Object.fromEntries(searchParams);
			
			if (window.location.hash) {
				const hashParams = new URLSearchParams(window.location.hash.substring(1));
				urlParams = { ...urlParams, ...Object.fromEntries(hashParams) };
			}
			
			processCallback(urlParams);
		}
	}

	async function processCallback(params) {
		console.log('🔵 processCallback called with params:', params);
		
		// Check for error parameters first
		const error = params.error;
		
		if (error) {
			console.error('❌ Spotify OAuth error:', error);
			statusMessage = 'ERROR';
			setTimeout(() => {
				router.replace(`/?error=${error}`);
			}, 2000);
			return;
		}
		
		// For Authorization Code flow, we get a 'code' parameter
		const authCode = params.code;
		console.log('🎟️ Auth code check:', { hasCode: !!authCode, codeLength: authCode?.length });
		
		if (authCode) {
			console.log('✅ Successfully got authorization code');
			statusMessage = 'AUTHENTICATING';
			
			try {
				console.log('🔄 Starting token exchange...');
				const storedClientId = localStorage.getItem('spotify_client_id') || '';
				const storedClientSecret = localStorage.getItem('spotify_client_secret') || '';
				const redirectUri = getRedirectUri();
				
				// Exchange the code for an access token
				const response = await fetch('https://accounts.spotify.com/api/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Authorization': 'Basic ' + btoa(storedClientId + ':' + storedClientSecret)
					},
					body: new URLSearchParams({
						grant_type: 'authorization_code',
						code: authCode,
						redirect_uri: redirectUri
					})
				});
				
				console.log('📡 Token exchange response status:', response.status);
				
				if (!response.ok) {
					const errorData = await response.text();
					console.error('❌ Token exchange failed:', errorData);
					throw new Error(`Token exchange failed: ${errorData}`);
				}
				
				const tokenData = await response.json();
				console.log('✅ Token exchange successful, received token data');
				
				statusMessage = 'STORING';
				
				// Save client ID and secret to localStorage for easy token refresh
				if (storedClientId) {
					localStorage.setItem('spotify_client_id', storedClientId);
				}
				if (storedClientSecret) {
					localStorage.setItem('spotify_client_secret', storedClientSecret);
				}
				console.log('💾 Client credentials saved to localStorage for token refresh');
				
				// Store authentication data
				accountsStore.setAuth('spotify', {
					access_token: tokenData.access_token,
					expires_in: tokenData.expires_in,
					refresh_token: tokenData.refresh_token
				});
				
				// Fetch and save username
				try {
					const { default: SpotifyWebApi } = await import('spotify-web-api-js');
					const spotifyApi = new SpotifyWebApi();
					spotifyApi.setAccessToken(tokenData.access_token);
					const userInfo = await spotifyApi.getMe();
					const username = userInfo.display_name || userInfo.id || 'Spotify User';
					localStorage.setItem('spotify_username', username);
					console.log('✅ Username saved to localStorage:', username);
				} catch (error) {
					console.error('Error fetching username:', error);
					// Continue even if username fetch fails
				}
				
				// Verify storage after save
				const isAuth = await accountsStore.isAuthenticated('spotify');
				const hasToken = await accountsStore.hasValidToken('spotify');
				console.log('✅ Auth verification after save:', { isAuth, hasToken });
				
				statusMessage = 'SUCCESS';
				addToast('Account connected');
				
				// Use a small delay to ensure storage is written, then redirect
				setTimeout(() => {
					window.location.href = '/';
				}, 500);
				
			} catch (error) {
				console.error('Token exchange failed:', error);
				statusMessage = 'ERROR';
				setTimeout(() => {
					router.replace('/?error=token_exchange_failed');
				}, 3000);
			}
		} else {
			console.error('No authorization code found');
			statusMessage = 'ERROR';
			setTimeout(() => {
				router.replace('/?error=no_code');
			}, 3000);
		}
	}
</script>

<div class="page-holder w-full h-full">
	<div
		class="flex flex-col items-center justify-center w-full h-full page font-[400]"
		class:page-animated={hasAnimated}
	>
		<div class="flex flex-col items-center gap-4 px-4 w-full">
			<!-- Status Text -->
			<div class="flex flex-col items-center">
				<Loader />
			</div>
		</div>
	</div>
</div>

<style>
	.page {
		opacity: 0;
		transform: rotateY(90deg);
		transition: opacity 0.2s ease-out, transform 0.2s ease-out;
		transform-origin: left;
	}
	
	.page.page-animated {
		opacity: 1;
		transform: rotateY(0deg);
	}
</style>
