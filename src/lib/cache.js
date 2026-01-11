/**
 * Cache utility for Spotify API responses
 * Caches data in localStorage and clears on app exit/re-entry
 */

const CACHE_PREFIX = 'spotify_cache_';
const CACHE_TIMESTAMP_PREFIX = 'spotify_cache_timestamp_';
const APP_SESSION_KEY = 'spotify_app_session';

class CacheManager {
  constructor() {
    this.sessionId = this.getOrCreateSession();
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    // Check if this is a new app session (app was closed and reopened)
    const lastSessionId = localStorage.getItem(APP_SESSION_KEY);
    if (lastSessionId && lastSessionId !== this.sessionId) {
      // New session - clear all caches
      this.clearAll();
    }
    
    // Update session ID
    localStorage.setItem(APP_SESSION_KEY, this.sessionId);
    
    // Don't clear cache on app state changes or page unload
    // Cache should persist across page navigations and when app goes to background
    // Only clear cache when a new session is detected (app was fully closed and reopened)
  }

  getOrCreateSession() {
    if (typeof window === 'undefined') return Date.now().toString();
    
    let sessionId = sessionStorage.getItem(APP_SESSION_KEY);
    if (!sessionId) {
      sessionId = Date.now().toString();
      sessionStorage.setItem(APP_SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  clearAll() {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🗑️ Cleared all Spotify API caches');
  }

  clearSongCaches() {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    const songCacheTypes = ['liked_songs', 'playlist_tracks', 'album_tracks', 'playlists', 'user_playlists'];
    
    keys.forEach(key => {
      // Check if this key is for song/track caches
      const isSongCache = songCacheTypes.some(type => {
        // Match cache keys like "spotify_cache_liked_songs_..." or "spotify_cache_playlist_tracks_..."
        const cacheKeyPattern = `${CACHE_PREFIX}${type}_`;
        const timestampKeyPattern = `${CACHE_TIMESTAMP_PREFIX}${CACHE_PREFIX}${type}_`;
        return key.startsWith(cacheKeyPattern) || key.startsWith(timestampKeyPattern);
      });
      
      if (isSongCache) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🗑️ Cleared all song/track and playlist caches');
  }

  getCacheKey(type, params = {}) {
    // Create a unique cache key based on type and params
    const paramString = JSON.stringify(params);
    return `${CACHE_PREFIX}${type}_${paramString}`;
  }

  // Minimize track objects to reduce storage size
  minimizeTrack(track) {
    if (!track) return track;
    
    return {
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists?.map(a => ({
        id: a.id,
        name: a.name
      })) || [],
      album: track.album ? {
        id: track.album.id,
        name: track.album.name,
        images: track.album.images?.slice(0, 1) || [] // Only keep first image
      } : null,
      duration_ms: track.duration_ms,
      type: track.type || 'spotify'
    };
  }

  // Minimize other objects similarly
  minimizePlaylist(playlist) {
    if (!playlist) return playlist;
    return {
      id: playlist.id,
      name: playlist.name,
      owner: playlist.owner ? {
        id: playlist.owner.id,
        display_name: playlist.owner.display_name
      } : null,
      images: playlist.images?.slice(0, 1) || [],
      tracks: playlist.tracks ? {
        total: playlist.tracks.total
      } : null
    };
  }

  minimizeAlbum(album) {
    if (!album) return album;
    return {
      id: album.id,
      name: album.name,
      artists: album.artists?.map(a => ({
        id: a.id,
        name: a.name
      })) || [],
      images: album.images?.slice(0, 1) || [],
      release_date: album.release_date
    };
  }

  minimizeArtist(artist) {
    if (!artist) return artist;
    return {
      id: artist.id,
      name: artist.name,
      images: artist.images?.slice(0, 1) || []
    };
  }

  // Minimize data based on type
  minimizeData(data, type) {
    if (!data) return data;
    
    if (type === 'tracks' || type === 'liked_songs' || type === 'playlist_tracks' || type === 'album_tracks') {
      return Array.isArray(data) ? data.map(t => this.minimizeTrack(t)) : this.minimizeTrack(data);
    } else if (type === 'playlists' || type === 'user_playlists') {
      return Array.isArray(data) ? data.map(p => this.minimizePlaylist(p)) : this.minimizePlaylist(data);
    } else if (type === 'albums') {
      return Array.isArray(data) ? data.map(a => this.minimizeAlbum(a)) : this.minimizeAlbum(data);
    } else if (type === 'artists') {
      return Array.isArray(data) ? data.map(a => this.minimizeArtist(a)) : this.minimizeArtist(data);
    }
    
    return data;
  }

  getEstimatedSize(data) {
    // Rough estimate: JSON string length in bytes
    return new Blob([JSON.stringify(data)]).size;
  }

  get(key) {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return null;
  }

  set(key, data, type = null) {
    if (typeof window === 'undefined') return false;
    
    try {
      // Minimize data if type is provided
      const dataToCache = type ? this.minimizeData(data, type) : data;
      
      // Check estimated size (5MB limit for safety, leaving room for other data)
      const estimatedSize = this.getEstimatedSize(dataToCache);
      const MAX_SIZE = 4 * 1024 * 1024; // 4MB
      
      if (estimatedSize > MAX_SIZE) {
        console.warn(`Data too large to cache (${(estimatedSize / 1024 / 1024).toFixed(2)}MB), skipping cache`);
        return false;
      }
      
      localStorage.setItem(key, JSON.stringify(dataToCache));
      localStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${key}`, Date.now().toString());
      return true;
    } catch (error) {
      console.error('Error writing to cache:', error);
      // If storage is full, clear old caches and try once more
      if (error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing old caches');
        this.clearAll();
        // Don't retry - data is too large
        return false;
      }
      return false;
    }
  }

  async getOrFetch(key, fetchFn, options = {}) {
    const { forceRefresh = false, cacheType = null } = options;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached !== null) {
        console.log(`📦 Cache hit for ${key}`);
        return cached;
      }
    }
    
    // Fetch fresh data
    console.log(`🌐 Fetching fresh data for ${key}`);
    const data = await fetchFn();
    
    // Cache the result (with minimization if type provided)
    const cached = this.set(key, data, cacheType);
    if (!cached) {
      console.warn(`⚠️ Could not cache data for ${key} (too large or storage full)`);
    }
    
    return data;
  }

  // Specific cache keys for different data types
  getLikedSongsKey() {
    return this.getCacheKey('liked_songs');
  }

  getPlaylistsKey() {
    return this.getCacheKey('playlists');
  }

  getUserPlaylistsKey(userId) {
    return this.getCacheKey('user_playlists', { userId });
  }

  getAlbumsKey() {
    return this.getCacheKey('albums');
  }

  getArtistsKey() {
    return this.getCacheKey('artists');
  }

  getPlaylistTracksKey(playlistId) {
    return this.getCacheKey('playlist_tracks', { playlistId });
  }

  getAlbumTracksKey(albumId) {
    return this.getCacheKey('album_tracks', { albumId });
  }

  getPeopleKey() {
    return this.getCacheKey('people');
  }
}

export const cacheManager = new CacheManager();

