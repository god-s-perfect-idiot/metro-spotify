// Helper function to get Client ID from localStorage only
function getClientId() {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('spotify_client_id') || '';
	}
	return '';
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
		'user-top-read'
	]
};

// Helper function to get redirect URI
export function getRedirectUri() {
	// Use current origin (works for both development and production)
	if (typeof window !== 'undefined') {
		return `${window.location.origin}/spotify/callback`;
	}
	// Fallback for server-side (shouldn't happen for auth URL)
	return import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'https://ubiquity-1.netlify.app/spotify/callback';
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
		response_type: 'code', // Authorization Code Flow - modern and secure
		redirect_uri: getRedirectUri(),
		scope: SPOTIFY_CONFIG.SCOPES.join(' '),
		show_dialog: 'true'
	});

	return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
