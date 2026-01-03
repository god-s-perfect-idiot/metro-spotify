<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { accountsStore } from '../../../store/accounts.js';
	import { addToast } from '../../../store/toast';
	import { getRedirectUri } from '../../../lib/spotify-config.js';
	
	let debugInfo = '';
	let isProcessing = true;

	onMount(() => {
		if (browser) {
			// Add a small delay to ensure URL is fully loaded
			setTimeout(() => {
				handleCallback();
			}, 100);
		}
	});

	async function handleCallback() {
		if (!browser) return;
		
		// Debug: Log the current URL and search params
		console.log('Callback URL:', window.location.href);
		console.log('Hash:', window.location.hash);
		console.log('Search:', window.location.search);
		
		debugInfo = `URL: ${window.location.href}\nHash: ${window.location.hash}\nSearch: ${window.location.search}`;
		
		// Check for error parameters first
		const error = new URLSearchParams(window.location.search).get('error') || 
					 new URLSearchParams(window.location.hash.substring(1)).get('error');
		
		if (error) {
			console.error('Spotify OAuth error:', error);
			debugInfo += `\nError: ${error}`;
			setTimeout(() => {
				goto(`/spotify?error=${error}`);
			}, 2000);
			return;
		}
		
		// For Authorization Code flow, we get a 'code' parameter
		const authCode = new URLSearchParams(window.location.search).get('code');
		
		if (authCode) {
			console.log('Successfully got authorization code');
			debugInfo += '\nAuthorization code received successfully!';
			
			try {
				// Get stored credentials from localStorage only
				const storedClientId = localStorage.getItem('spotify_client_id') || '';
				const storedClientSecret = localStorage.getItem('spotify_client_secret') || '';
				
				// Get the redirect URI (must match what was used in auth)
				const redirectUri = getRedirectUri();
				
				// Exchange the code for an access token
				const response = await fetch('/api/spotify/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ 
						code: authCode,
						clientId: storedClientId,
						clientSecret: storedClientSecret,
						redirectUri: redirectUri
					})
				});
				
				const tokenData = await response.json();
				
				if (tokenData.error) {
					throw new Error(tokenData.error);
				}
				
				// Store authentication data using the accounts store
				accountsStore.setAuth('spotify', {
					access_token: tokenData.access_token,
					expires_in: tokenData.expires_in,
					refresh_token: tokenData.refresh_token
				});
				
				// Save to localStorage
				accountsStore.saveToStorage('spotify');
				
				debugInfo += '\nAccess token received and stored in accounts store!';
				
				// Clean up URL
				window.history.replaceState({}, document.title, '/spotify');

				addToast('Spotify account connected successfully');
				
				// Redirect back to the main Spotify page
				setTimeout(() => {
					goto('/spotify?auth_success=true');
				}, 1000);
				
			} catch (error) {
				console.error('Token exchange failed:', error);
				debugInfo += `\nToken exchange failed: ${error.message}`;
				setTimeout(() => {
					goto('/spotify?error=token_exchange_failed');
				}, 3000);
			}
		} else {
			console.error('No authorization code found');
			debugInfo += '\nNo authorization code found in URL';
			// If no code found, redirect back with error
			setTimeout(() => {
				goto('/spotify?error=no_code');
			}, 3000);
		}
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
