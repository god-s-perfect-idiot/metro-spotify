<script>
	import { onMount } from 'svelte';
	import { router } from '../lib/router.js';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	import { addToast } from '../store/toast.js';
	import { getRedirectUri } from '../lib/spotify-config.js';
	import { App as CapacitorApp } from '@capacitor/app';
	
	let debugInfo = '';
	let isProcessing = true;

	onMount(() => {
		if (browser) {
			setTimeout(() => {
				handleCallback();
			}, 100);
		}
	});

	async function handleCallback() {
		if (!browser) return;
		
		let urlParams = {};
		let urlString = '';
		
		// Handle Capacitor deep link
		if (window.Capacitor) {
			CapacitorApp.addListener('appUrlOpen', (data) => {
				urlString = data.url;
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
		debugInfo = `Processing callback with params: ${JSON.stringify(params)}`;
		
		// Check for error parameters first
		const error = params.error;
		
		if (error) {
			console.error('❌ Spotify OAuth error:', error);
			debugInfo += `\nError: ${error}`;
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
			debugInfo += '\nAuthorization code received successfully!';
			
			try {
				console.log('🔄 Starting token exchange...');
				const storedClientId = localStorage.getItem('spotify_client_id') || '';
				const storedClientSecret = localStorage.getItem('spotify_client_secret') || '';
				const redirectUri = getRedirectUri();
				console.log('📋 Token exchange params:', { 
					hasClientId: !!storedClientId, 
					hasClientSecret: !!storedClientSecret,
					redirectUri 
				});
				
				// Exchange the code for an access token
				// Note: In production, this should be done on a backend server
				// For Android, you'll need a backend endpoint or use PKCE flow
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
				
				// Store authentication data
				console.log('🔐 Storing authentication data...', {
					hasAccessToken: !!tokenData.access_token,
					expiresIn: tokenData.expires_in,
					hasRefreshToken: !!tokenData.refresh_token
				});
				
				accountsStore.setAuth('spotify', {
					access_token: tokenData.access_token,
					expires_in: tokenData.expires_in,
					refresh_token: tokenData.refresh_token
				});
				
				// Verify storage immediately
				const storedValue = localStorage.getItem('metro_spotify_account_spotify');
				console.log('📦 LocalStorage check after save:', storedValue ? 'Token in storage' : 'No token in storage');
				if (storedValue) {
					console.log('📦 Stored value preview:', storedValue.substring(0, 100) + '...');
				}
				
				// Verify storage after save
				const isAuth = accountsStore.isAuthenticated('spotify');
				const hasToken = accountsStore.hasValidToken('spotify');
				console.log('✅ Auth verification after save:', { isAuth, hasToken });
				console.log('📋 Account state:', accountsStore.accounts.spotify ? 'Account exists' : 'No account');
				
				debugInfo += '\nAccess token received and stored!';
				debugInfo += `\nAuth verified: ${isAuth}`;
				debugInfo += `\nToken valid: ${hasToken}`;
				
				addToast('Spotify account connected successfully');
				
				// Use a small delay to ensure storage is written, then redirect
				// Using window.location instead of router to force a full page reload
				setTimeout(() => {
					window.location.href = '/';
				}, 500);
				
			} catch (error) {
				console.error('Token exchange failed:', error);
				debugInfo += `\nToken exchange failed: ${error.message}`;
				setTimeout(() => {
					router.replace('/?error=token_exchange_failed');
				}, 3000);
			}
		} else {
			console.error('No authorization code found');
			debugInfo += '\nNo authorization code found in URL';
			setTimeout(() => {
				router.replace('/?error=no_code');
			}, 3000);
		}
		
		isProcessing = false;
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 text-white">
	<div class="text-center max-w-2xl mx-4">
		<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
		<h1 class="text-2xl font-bold mb-2">Connecting to Spotify...</h1>
		<p class="text-gray-400 mb-6">Please wait while we complete your authentication.</p>
		
		{#if debugInfo}
			<div class="bg-gray-800 p-4 rounded-lg text-left">
				<h3 class="text-lg font-semibold mb-2">Debug Info:</h3>
				<pre class="text-xs text-gray-300 whitespace-pre-wrap">{debugInfo}</pre>
			</div>
		{/if}
	</div>
</div>
