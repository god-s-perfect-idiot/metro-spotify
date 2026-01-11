// Browser detection (replaces $app/environment)
export const browser = typeof window !== 'undefined';

// Get or create a unique player ID for this tab/instance
// Uses sessionStorage (per-tab) first, then localStorage as fallback to maintain the ID across page reloads
// This ensures each tab has its own unique ID
export function getPlayerId() {
  if (!browser) return null;
  
  const STORAGE_KEY = 'metro_spotify_player_id';
  
  // Try to get existing ID from sessionStorage first (per-tab)
  let playerId = sessionStorage.getItem(STORAGE_KEY);
  
  // If no ID in sessionStorage, check localStorage (might be from a previous session)
  // Then generate a new unique ID for this tab
  if (!playerId) {
    // Generate a unique ID using timestamp + random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    playerId = `${timestamp}-${random}`;
    
    // Store it in sessionStorage (per-tab, persists across page reloads)
    sessionStorage.setItem(STORAGE_KEY, playerId);
    // Also store in localStorage as backup
    localStorage.setItem(STORAGE_KEY, playerId);
  }
  
  return playerId;
}
