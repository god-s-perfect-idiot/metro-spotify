// Helper function to get Client ID from localStorage or environment variable
function getClientId() {
	if (typeof window !== 'undefined') {
		// Check localStorage first (user override), then fall back to environment variable
		const localClientId = localStorage.getItem('spotify_client_id');
		if (localClientId) {
			return localClientId;
		}
		// Fall back to environment variable (for default/shared Client ID)
		return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
	}
	// Server-side fallback
	return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
}

// Spotify configuration constants
export const SPOTIFY_CONFIG = {
	// Get Client ID from localStorage (preferred) or environment variable
	get CLIENT_ID() {
		return getClientId();
	},

	// Scopes for the Spotify API
	SCOPES: [
		'user-read-private',
		'user-read-email',
		'user-read-playback-state',
		'user-modify-playback-state',
		'user-read-currently-playing',
		'streaming',
		'playlist-read-private',
		'playlist-read-collaborative',
		'user-library-read',
		'user-top-read',
		'user-follow-read'
	]
};

// Helper function to get redirect URI
export function getRedirectUri() {
	if (typeof window === 'undefined') {
		return 'metrospotify://callback';
	}

	// Check if we're actually running in a native Capacitor app
	const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
	
	if (isNative) {
		// For Android/iOS native app, use custom URL scheme
		return 'metrospotify://callback';
	}
	
	// For web browser, use the web callback URL
    const authWebOverride = "https://ready-laws-grin.loca.lt/callback";
	return authWebOverride || `${window.location.origin}/spotify/callback`;
}

// Helper function to get authorization URL
export function getAuthUrl() {
	const clientId = SPOTIFY_CONFIG.CLIENT_ID;

	if (!clientId) {
		console.error(
			'Spotify Client ID is not configured. Please set it in Settings > Accounts > Spotify.'
		);
		throw new Error('Spotify Client ID is not configured');
	}

	const params = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: getRedirectUri(),
		scope: SPOTIFY_CONFIG.SCOPES.join(' '),
		show_dialog: 'true'
	});

	return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
