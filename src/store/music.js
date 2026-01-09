import { writable } from 'svelte/store';
import { mediaServiceBridge } from '../lib/media-service.js';

// Music store for managing playback state
class MusicStore {
  constructor() {
    this.currentTrack = writable(null);
    this.isPlaying = writable(false);
    this.playbackProgress = writable({ currentTime: 0, duration: 0, seekValue: 0 });
    this.queue = writable([]);
    this.currentIndex = writable(-1);
    this.spotifyApi = null;
    this.selectedDeviceId = null;
    this.serviceType = writable(null);
    this.userNavigatedAway = false; // Flag to prevent polling from restoring track
    this.isBuffering = writable(false); // Flag to track when track is loading/buffering
    this.isTogglingPlayPause = false; // Flag to prevent polling from overriding play/pause state during toggle
    this.playPauseToggleTimeout = null; // Timeout to clear the toggle flag
    this.isTogglingShuffle = false; // Flag to prevent polling from overriding shuffle state during toggle
    this.isCyclingRepeat = false; // Flag to prevent polling from overriding repeat state during cycle
    this.hasRestoredPreferences = false; // Flag to track if we've restored preferences from localStorage
    this.justAppliedPreferences = false; // Flag to prevent polling from overriding preferences right after applying them
    this.preferencesApplyTimeout = null; // Timeout to clear the justAppliedPreferences flag
    
    // Load shuffle and repeat preferences from localStorage
    const savedShuffle = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_shuffle') : null;
    const savedRepeat = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_repeat') : null;
    
    this.shuffle = writable(savedShuffle === 'true' ? true : false); // Shuffle state: on or off
    this.repeat = writable(savedRepeat && ['off', 'all', 'one'].includes(savedRepeat) ? savedRepeat : 'off'); // Repeat state: 'off', 'all', 'one'
    
    // Subscribe to changes and save to localStorage
    this.shuffle.subscribe(value => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('metro_spotify_shuffle', value.toString());
      }
    });
    
    this.repeat.subscribe(value => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('metro_spotify_repeat', value);
      }
    });
    this.rateLimitBackoff = 0; // Backoff time in ms when rate limited
    this.consecutiveErrors = 0; // Track consecutive errors for backoff
    
    // Simple interpolation for smooth seekbar between API updates
    this.interpolationInterval = null;
    this.lastApiTime = 0; // Last time from API (in seconds)
    this.lastApiTimestamp = 0; // When we got the last API update (Date.now())
    
    this.pollingInterval = null;
    this.startPolling();
    this.startInterpolation();
    
    // Subscribe to track and playback state changes to update media service
    this.currentTrack.subscribe(track => this._onTrackChange(track));
    this.isPlaying.subscribe(playing => this._onPlaybackStateChange(playing));
  }
  
  _onTrackChange(track) {
    if (track) {
      const trackName = track.name || '';
      const artistName = track.artists && track.artists.length > 0 
        ? track.artists.map(a => a.name).join(', ') 
        : '';
      const playing = this.getCurrentState().isPlaying;
      mediaServiceBridge.updateMetadata(trackName, artistName, playing);
    }
  }
  
  _onPlaybackStateChange(playing) {
    const track = this.getCurrentState().currentTrack;
    if (track) {
      const trackName = track.name || '';
      const artistName = track.artists && track.artists.length > 0 
        ? track.artists.map(a => a.name).join(', ') 
        : '';
      mediaServiceBridge.updatePlaybackState(playing);
      mediaServiceBridge.updateMetadata(trackName, artistName, playing);
    } else if (!playing) {
      // If no track and not playing, stop the service
      mediaServiceBridge.stopService();
    }
  }

  setSpotifyApi(api) {
    this.spotifyApi = api;
  }

  setSelectedDeviceId(deviceId) {
    this.selectedDeviceId = deviceId;
  }

  async ensureMetroSpotifyDevice() {
    if (!this.spotifyApi) {
      throw new Error('Spotify API not initialized');
    }

    // Log current state
    console.log('🔍 ensureMetroSpotifyDevice called');
    console.log('📱 Current selectedDeviceId in music store:', this.selectedDeviceId);
    console.log('🎵 window.spotifyPlayer exists:', typeof window !== 'undefined' && !!window.spotifyPlayer);

    // Get all devices and log them
    try {
      const devices = await this.spotifyApi.getMyDevices();
      const availableDevices = devices.devices || [];
      console.log('📋 ALL AVAILABLE DEVICES:', JSON.stringify(availableDevices.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        is_active: d.is_active,
        volume: d.volume_percent,
        is_restricted: d.is_restricted
      })), null, 2));
    } catch (error) {
      console.error('Error fetching devices for logging:', error);
    }

    // CRITICAL: If we already have a device ID set (from ready event), use it directly
    // The device_id from the 'ready' event IS the Metro Spotify web player
    // We MUST trust it completely - don't verify or clear it
    if (this.selectedDeviceId) {
      console.log('✅ Using Metro Spotify device ID from ready event:', this.selectedDeviceId);
      
      // Verify it exists in device list and log info
      try {
        const devices = await this.spotifyApi.getMyDevices();
        const device = devices.devices?.find(d => d.id === this.selectedDeviceId);
        if (device) {
          console.log('✅ Device ID verified in device list:', {
            id: device.id,
            name: device.name,
            type: device.type,
            is_active: device.is_active
          });
        } else {
          console.warn('⚠️ Device ID not found in device list, but using it anyway (from ready event)');
        }
      } catch (error) {
        console.error('Error verifying device:', error);
      }
      
      return true;
    }

    // If we don't have a device ID, try to get it from the player directly
    // The player should have fired 'ready' event with device_id
    if (typeof window !== 'undefined' && window.spotifyPlayer) {
      try {
        console.log('⏳ Waiting for player ready event...');
        // Wait a bit for the ready event to fire if it hasn't yet
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if device_id was set by the ready event
        if (this.selectedDeviceId) {
          console.log('✅ Got device ID from player ready event:', this.selectedDeviceId);
          return true;
        }
        
        console.warn('⚠️ Player exists but device_id not set - player may not be ready yet');
      } catch (error) {
        console.log('Player not ready yet:', error.message);
      }
    } else {
      console.warn('⚠️ window.spotifyPlayer not found - Metro Spotify web player may not be initialized');
    }

    // Need to find the Metro Spotify web player from device list
    // The device name might not be exactly "Metro Spotify" - Spotify may use "Web Player (Chrome)" etc.
    // So we'll look for active Computer/Web Player devices
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const devices = await this.spotifyApi.getMyDevices();
        const availableDevices = devices.devices || [];
        
        // First, try to find by exact name "Metro Spotify"
        let metroPlayer = availableDevices.find(
          (device) => device.name === 'Metro Spotify'
        );

        // If not found by name, look for Computer/Web Player devices (even if not active)
        // The Metro Spotify web player is a Computer type device
        // Note: It might not be active yet, but we can still use it
        if (!metroPlayer) {
          // Look for Computer type devices (web players)
          const webPlayers = availableDevices.filter(
            (device) => device.type === 'Computer'
          );
          
          if (webPlayers.length > 0) {
            // Prefer active ones, but use any web player if none are active
            const activeWebPlayer = webPlayers.find(d => d.is_active === true);
            metroPlayer = activeWebPlayer || webPlayers[0];
            console.log('⚠️ Metro Spotify not found by name, using web player:', metroPlayer.name, '(active:', metroPlayer.is_active, ')');
          }
        }

        if (metroPlayer) {
          this.selectedDeviceId = metroPlayer.id;
          console.log('✅ Metro Spotify web player found and selected:', metroPlayer.id, metroPlayer.name);
          return true;
        }
        
        // If not found and not the last attempt, wait and retry
        if (attempt < maxRetries - 1) {
          console.log(`⏳ Metro Spotify device not found, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          console.log('Available devices:', availableDevices.map(d => ({ name: d.name, type: d.type, id: d.id, is_active: d.is_active })));
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error('Error ensuring Metro Spotify device:', error);
        // If it's the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw new Error('Metro Spotify device not found. Please ensure the web player is connected and try again.');
        }
        // Otherwise, wait and retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // If we get here, all retries failed
    throw new Error('Metro Spotify device not found after multiple attempts. Please ensure the web player is connected and try again.');
  }

  setQueue(tracks) {
    this.queue.set(tracks);
  }

  async playTrack(track, index = -1, allTracks = []) {
    if (!this.spotifyApi) {
      throw new Error('Spotify API not initialized');
    }

    // ABSOLUTELY ensure we're using Metro Spotify device before playing
    await this.ensureMetroSpotifyDevice();

    if (!this.selectedDeviceId) {
      throw new Error('Metro Spotify device not available');
    }

    // Set buffering state when starting to play
    this.isBuffering.set(true);

    try {
      // If we have a list of tracks, play the selected one and queue the rest
      if (allTracks.length > 0) {
        // Find the index of the track to play
        const playIndex = index >= 0 ? index : allTracks.findIndex(t => t.uri === track.uri);
        const actualIndex = playIndex >= 0 ? playIndex : 0;
        
        // Apply saved shuffle preference BEFORE playing (so queue is shuffled correctly)
        const savedShuffle = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_shuffle') === 'true' : false;
        if (savedShuffle !== this.getCurrentState().shuffle) {
          try {
            console.log('🔄 Applying saved shuffle preference before playing:', savedShuffle);
            await this.spotifyApi.setShuffle(savedShuffle, { device_id: this.selectedDeviceId });
            this.shuffle.set(savedShuffle);
            // Set flag to prevent polling from overriding this for a few seconds
            this.justAppliedPreferences = true;
            if (this.preferencesApplyTimeout) {
              clearTimeout(this.preferencesApplyTimeout);
            }
            this.preferencesApplyTimeout = setTimeout(() => {
              this.justAppliedPreferences = false;
            }, 3000);
          } catch (error) {
            console.error('Error applying shuffle preference:', error);
          }
        }
        
        // Get all URIs starting from the selected track
        const allUris = allTracks.slice(actualIndex).map(t => t.uri);
        
        // Spotify API has a limit of ~50 URIs per request to avoid 413 errors
        // We'll send the first 50 URIs, and the full queue is still tracked for navigation
        const MAX_URIS_PER_REQUEST = 50;
        const urisToPlay = allUris.slice(0, MAX_URIS_PER_REQUEST);
        
        // Play the selected track and first batch of tracks
        await this.spotifyApi.play({
          device_id: this.selectedDeviceId,
          uris: urisToPlay
        });
        
        // Note: The full queue is still stored in the music store for navigation purposes
        // When users skip tracks, Spotify will handle playback from its internal queue
        
        // Store the full queue
        this.queue.set(allTracks);
        this.currentIndex.set(actualIndex);
      } else {
        // Apply saved shuffle preference BEFORE playing
        const savedShuffle = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_shuffle') === 'true' : false;
        if (savedShuffle !== this.getCurrentState().shuffle) {
          try {
            console.log('🔄 Applying saved shuffle preference before playing:', savedShuffle);
            await this.spotifyApi.setShuffle(savedShuffle, { device_id: this.selectedDeviceId });
            this.shuffle.set(savedShuffle);
            // Set flag to prevent polling from overriding this for a few seconds
            this.justAppliedPreferences = true;
            if (this.preferencesApplyTimeout) {
              clearTimeout(this.preferencesApplyTimeout);
            }
            this.preferencesApplyTimeout = setTimeout(() => {
              this.justAppliedPreferences = false;
            }, 3000);
          } catch (error) {
            console.error('Error applying shuffle preference:', error);
          }
        }
        
        // If no list provided, just play the single track
        await this.spotifyApi.play({
          device_id: this.selectedDeviceId,
          uris: [track.uri]
        });
        
        // Store just this track in queue
        this.queue.set([track]);
        this.currentIndex.set(0);
      }

      this.userNavigatedAway = false; // Reset flag when user plays a track
      this.currentTrack.set(track);
      this.serviceType.set(track.type || 'spotify');
      this.isPlaying.set(true);
      
      // Apply saved shuffle and repeat preferences
      // Do this after playback starts to ensure device is ready
      setTimeout(async () => {
        try {
          // Ensure device is still set
          if (!this.selectedDeviceId) {
            await this.ensureMetroSpotifyDevice();
          }
          
          if (!this.selectedDeviceId) {
            console.warn('Cannot apply shuffle/repeat preferences: No device available');
            return;
          }
          
          const savedRepeat = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_repeat') : 'off';
          
          // Apply repeat preference
          if (savedRepeat && ['off', 'all', 'one'].includes(savedRepeat)) {
            const currentRepeat = this.getCurrentState().repeat;
            if (savedRepeat !== currentRepeat) {
              console.log('🔄 Applying saved repeat preference:', savedRepeat);
              const spotifyRepeatState = savedRepeat === 'one' ? 'track' : savedRepeat === 'all' ? 'context' : 'off';
              await this.spotifyApi.setRepeat(spotifyRepeatState, { device_id: this.selectedDeviceId });
              this.repeat.set(savedRepeat);
              // Set flag to prevent polling from overriding this for a few seconds
              this.justAppliedPreferences = true;
              if (this.preferencesApplyTimeout) {
                clearTimeout(this.preferencesApplyTimeout);
              }
              this.preferencesApplyTimeout = setTimeout(() => {
                this.justAppliedPreferences = false;
              }, 3000);
            }
          }
        } catch (error) {
          console.error('Error applying saved shuffle/repeat preferences:', error);
        }
      }, 500);
      
      // Start media service
      const trackName = track.name || '';
      const artistName = track.artists && track.artists.length > 0 
        ? track.artists.map(a => a.name).join(', ') 
        : '';
      mediaServiceBridge.startService(trackName, artistName, true);
      
      // Clear buffering after a short delay to allow playback to start
      // The polling will detect when playback actually starts and clear it
      setTimeout(() => {
        this.updateCurrentTrack();
      }, 500);
    } catch (error) {
      console.error('Error playing track:', error);
      this.isBuffering.set(false);
      throw error;
    }
  }

  async togglePlayPause() {
    if (!this.spotifyApi) {
      console.error('Spotify API not initialized');
      return;
    }

    // Validate device_id early
    if (!this.selectedDeviceId) {
      console.error('No device selected');
      return;
    }

    // Ensure we're using Metro Spotify device (but don't block on it if it fails)
    try {
      await this.ensureMetroSpotifyDevice();
    } catch (error) {
      console.error('Error ensuring device:', error);
      // Continue anyway - device might already be set
    }

    // Set flag to prevent polling from overriding state during toggle
    this.isTogglingPlayPause = true;
    
    // Clear any existing timeout
    if (this.playPauseToggleTimeout) {
      clearTimeout(this.playPauseToggleTimeout);
    }
    
    // Get current state first to determine what action to take
    let currentState;
    try {
      currentState = await this.spotifyApi.getMyCurrentPlaybackState();
    } catch (error) {
      console.error('Error getting current playback state:', error);
      this.isTogglingPlayPause = false;
      return;
    }

    // Determine the action based on current state
    const shouldPlay = !currentState.is_playing;
    const newPlayingState = shouldPlay;

    // Optimistically update the state immediately for responsive UI
    this.isPlaying.set(newPlayingState);

    try {
      // Perform the action directly - no need to check state again
      if (shouldPlay) {
        await this.spotifyApi.play({ device_id: this.selectedDeviceId });
      } else {
        await this.spotifyApi.pause({ device_id: this.selectedDeviceId });
      }
      
      // Update track state after a short delay to sync with API
      setTimeout(async () => {
        try {
          await this.updateCurrentTrack();
        } catch (error) {
          // Ignore errors in update - not critical
        }
      }, 200);
      
      // Clear the flag after a shorter delay
      this.playPauseToggleTimeout = setTimeout(() => {
        this.isTogglingPlayPause = false;
        this.playPauseToggleTimeout = null;
      }, 1500);
    } catch (apiError) {
      console.error('Error toggling play/pause:', apiError);
      
      // Handle JSON parsing errors gracefully
      if (apiError.message && apiError.message.includes('JSON')) {
        console.warn('⚠️ JSON parsing error (may be harmless), verifying state...');
        // Check state after a short delay to see if action succeeded
        setTimeout(async () => {
          try {
            const checkState = await this.spotifyApi.getMyCurrentPlaybackState();
            if (checkState.is_playing === newPlayingState) {
              console.log('✅ Play/pause succeeded despite JSON error');
              await this.updateCurrentTrack();
            } else {
              // Revert if state doesn't match
              this.isPlaying.set(!newPlayingState);
            }
          } catch (checkError) {
            console.error('Error checking playback state:', checkError);
            this.isPlaying.set(!newPlayingState);
          }
          this.isTogglingPlayPause = false;
        }, 300);
      } else {
        // For other errors, revert immediately
        this.isPlaying.set(!newPlayingState);
        this.isTogglingPlayPause = false;
        if (this.playPauseToggleTimeout) {
          clearTimeout(this.playPauseToggleTimeout);
          this.playPauseToggleTimeout = null;
        }
      }
    }
  }

  async playNext() {
    if (!this.spotifyApi) return;

    // Ensure we're using Metro Spotify device
    await this.ensureMetroSpotifyDevice();

    // Set buffering state when skipping
    this.isBuffering.set(true);

    try {
      // Get current queue state
      const queue = this.getCurrentState().queue;
      const currentIdx = this.getCurrentState().currentIndex;
      
      // Check if there's a next track in our queue
      if (queue.length > 0 && currentIdx >= 0 && currentIdx < queue.length - 1) {
        // Use Spotify's skip to next (which will play from queue)
        await this.spotifyApi.skipToNext({ device_id: this.selectedDeviceId });
        // Update index
        this.currentIndex.set(currentIdx + 1);
      } else {
        // Fallback to Spotify's queue
        await this.spotifyApi.skipToNext({ device_id: this.selectedDeviceId });
      }
      
      // Update track state - this will clear buffering when new track starts
      await this.updateCurrentTrack();
    } catch (error) {
      console.error('Error playing next:', error);
      // Clear buffering on error
      this.isBuffering.set(false);
    }
  }

  async playPrevious() {
    if (!this.spotifyApi) return;

    // Ensure we're using Metro Spotify device
    await this.ensureMetroSpotifyDevice();

    // Set buffering state when skipping
    this.isBuffering.set(true);

    try {
      // Get current queue state
      const queue = this.getCurrentState().queue;
      const currentIdx = this.getCurrentState().currentIndex;
      
      // Check if there's a previous track in our queue
      if (queue.length > 0 && currentIdx > 0) {
        // Use Spotify's skip to previous
        await this.spotifyApi.skipToPrevious({ device_id: this.selectedDeviceId });
        // Update index
        this.currentIndex.set(currentIdx - 1);
      } else {
        // Fallback to Spotify's queue
        await this.spotifyApi.skipToPrevious({ device_id: this.selectedDeviceId });
      }
      
      // Update track state - this will clear buffering when new track starts
      await this.updateCurrentTrack();
    } catch (error) {
      console.error('Error playing previous:', error);
      // Clear buffering on error
      this.isBuffering.set(false);
    }
  }

  async updateCurrentTrack() {
    if (!this.spotifyApi) return;
    
    // Don't update if user explicitly navigated away
    if (this.userNavigatedAway) return;

    // Skip if we're in rate limit backoff
    if (this.rateLimitBackoff > 0) {
      return;
    }

    try {
      const state = await this.spotifyApi.getMyCurrentPlaybackState();
      
      // Reset error counter on success
      this.consecutiveErrors = 0;
      this.rateLimitBackoff = 0;
      
      if (state.item) {
        const track = {
          ...state.item,
          type: 'spotify'
        };
        
        this.currentTrack.set(track);
        this.serviceType.set('spotify');
        
        // Don't override play/pause state if we're in the middle of a toggle action
        // This prevents race conditions where polling overrides optimistic state updates
        if (!this.isTogglingPlayPause) {
          this.isPlaying.set(state.is_playing);
        }
        
        // Update current index if we have a queue
        const queue = this.getCurrentState().queue;
        if (queue.length > 0) {
          const trackIndex = queue.findIndex(t => t.uri === track.uri);
          if (trackIndex >= 0) {
            this.currentIndex.set(trackIndex);
          }
        }
        
        // Update progress directly from API
        const currentTime = state.progress_ms / 1000;
        const duration = state.item.duration_ms / 1000;
        
        // Store for interpolation
        this.lastApiTime = currentTime;
        this.lastApiTimestamp = Date.now();
        
        const progress = {
          currentTime: currentTime,
          duration: duration,
          seekValue: (currentTime / duration) * 100
        };
        this.playbackProgress.set(progress);
        
        // Update shuffle and repeat state from API
        // Only update if we're not currently toggling (to prevent flicker) and haven't just applied preferences
        if (typeof state.shuffle_state !== 'undefined' && !this.isTogglingShuffle && !this.justAppliedPreferences) {
          // Restore saved shuffle preference on first detection if it differs from API
          if (!this.hasRestoredPreferences) {
            const savedShuffle = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_shuffle') === 'true' : false;
            if (savedShuffle !== state.shuffle_state) {
              // Restore saved shuffle preference
              setTimeout(async () => {
                try {
                  if (!this.selectedDeviceId) {
                    await this.ensureMetroSpotifyDevice();
                  }
                  if (this.selectedDeviceId) {
                    console.log('🔄 Restoring saved shuffle preference:', savedShuffle);
                    await this.spotifyApi.setShuffle(savedShuffle, { device_id: this.selectedDeviceId });
                    this.shuffle.set(savedShuffle);
                    this.hasRestoredPreferences = true;
                  }
                } catch (error) {
                  console.error('Error restoring shuffle preference:', error);
                  // Fall back to API state if restore fails
                  this.shuffle.set(state.shuffle_state);
                  this.hasRestoredPreferences = true;
                }
              }, 500);
            } else {
              // API state matches saved preference, just update
              this.shuffle.set(state.shuffle_state);
              this.hasRestoredPreferences = true;
            }
          } else {
            // Already restored, just sync with API
            this.shuffle.set(state.shuffle_state);
          }
        }
        if (typeof state.repeat_state !== 'undefined' && !this.isCyclingRepeat && !this.justAppliedPreferences) {
          // Convert Spotify's repeat state to our format
          // 'off' -> 'off', 'context' -> 'all', 'track' -> 'one'
          const repeatState = state.repeat_state === 'track' ? 'one' : 
                             state.repeat_state === 'context' ? 'all' : 'off';
          
          // Restore saved repeat preference on first detection if it differs from API
          if (!this.hasRestoredPreferences) {
            const savedRepeat = typeof window !== 'undefined' ? localStorage.getItem('metro_spotify_repeat') : 'off';
            if (savedRepeat && ['off', 'all', 'one'].includes(savedRepeat) && savedRepeat !== repeatState) {
              // Restore saved repeat preference
              setTimeout(async () => {
                try {
                  if (!this.selectedDeviceId) {
                    await this.ensureMetroSpotifyDevice();
                  }
                  if (this.selectedDeviceId) {
                    console.log('🔄 Restoring saved repeat preference:', savedRepeat);
                    const spotifyRepeatState = savedRepeat === 'one' ? 'track' : savedRepeat === 'all' ? 'context' : 'off';
                    await this.spotifyApi.setRepeat(spotifyRepeatState, { device_id: this.selectedDeviceId });
                    this.repeat.set(savedRepeat);
                  }
                } catch (error) {
                  console.error('Error restoring repeat preference:', error);
                  // Fall back to API state if restore fails
                  this.repeat.set(repeatState);
                }
              }, 500);
            } else {
              // API state matches saved preference, just update
              this.repeat.set(repeatState);
            }
          } else {
            // Already restored, just sync with API
            this.repeat.set(repeatState);
          }
        }
        
        // Clear buffering state when we detect playback has started (progress > 0 or is_playing)
        if (this.getCurrentState().isBuffering && (state.progress_ms > 0 || state.is_playing)) {
          this.isBuffering.set(false);
        }
      }
    } catch (error) {
      // Handle rate limiting (429 errors)
      if (error.status === 429) {
        this.consecutiveErrors++;
        // Exponential backoff: 5s, 10s, 20s, 30s (max)
        const backoffTime = Math.min(30000, 5000 * Math.pow(2, this.consecutiveErrors - 1));
        this.rateLimitBackoff = backoffTime;
        console.warn(`⚠️ Rate limited (429). Backing off for ${backoffTime / 1000}s. Consecutive errors: ${this.consecutiveErrors}`);
        
        // Clear backoff after the delay
        setTimeout(() => {
          this.rateLimitBackoff = 0;
          console.log('✅ Rate limit backoff cleared, resuming polling');
        }, backoffTime);
      } else {
        // For other errors, just log but don't backoff as aggressively
        console.error('Error updating current track:', error);
        this.consecutiveErrors++;
        
        // If we have many consecutive errors, add a small backoff
        if (this.consecutiveErrors > 5) {
          this.rateLimitBackoff = 2000; // 2 second backoff
          setTimeout(() => {
            this.rateLimitBackoff = 0;
            this.consecutiveErrors = 0;
          }, 2000);
        }
      }
    }
  }

  startPolling() {
    if (this.pollingInterval) return;
    
    // Poll every 1 second for smooth seekbar updates
    const pollingInterval = 1000; // 1 second
    
    this.pollingInterval = setInterval(() => {
      if (this.spotifyApi && this.rateLimitBackoff === 0) {
        this.updateCurrentTrack();
      }
    }, pollingInterval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  startInterpolation() {
    if (this.interpolationInterval) return;
    
    // Smooth interpolation between API updates (every 100ms)
    this.interpolationInterval = setInterval(() => {
      const currentState = this.getCurrentState();
      
      // Only interpolate if playing and not buffering
      if (currentState.isPlaying && !currentState.isBuffering && this.lastApiTimestamp > 0) {
        const now = Date.now();
        const elapsed = (now - this.lastApiTimestamp) / 1000; // elapsed seconds since last API update
        const interpolatedTime = this.lastApiTime + elapsed;
        const duration = currentState.playbackProgress.duration;
        
        if (duration > 0) {
          const progress = {
            currentTime: Math.min(interpolatedTime, duration),
            duration: duration,
            seekValue: (Math.min(interpolatedTime, duration) / duration) * 100
          };
          this.playbackProgress.set(progress);
        }
      }
    }, 100); // Update every 100ms for smooth animation
  }

  stopInterpolation() {
    if (this.interpolationInterval) {
      clearInterval(this.interpolationInterval);
      this.interpolationInterval = null;
    }
  }

  clear() {
    this.userNavigatedAway = true; // Set flag to prevent polling from restoring track
    this.currentTrack.set(null);
    this.isPlaying.set(false);
    this.serviceType.set(null);
    this.currentIndex.set(-1);
    this.queue.set([]);
    this.hasRestoredPreferences = false; // Reset flag when clearing
    this.justAppliedPreferences = false; // Reset flag when clearing
    if (this.preferencesApplyTimeout) {
      clearTimeout(this.preferencesApplyTimeout);
      this.preferencesApplyTimeout = null;
    }
    
    // Stop media service
    mediaServiceBridge.stopService();
  }

  getCurrentState() {
    let state = {
      currentTrack: null,
      isPlaying: false,
      queue: [],
      currentIndex: -1,
      serviceType: null,
      isBuffering: false,
      playbackProgress: { currentTime: 0, duration: 0, seekValue: 0 },
      shuffle: false,
      repeat: 'off'
    };
    
    this.currentTrack.subscribe(value => state.currentTrack = value)();
    this.isPlaying.subscribe(value => state.isPlaying = value)();
    this.queue.subscribe(value => state.queue = value)();
    this.currentIndex.subscribe(value => state.currentIndex = value)();
    this.serviceType.subscribe(value => state.serviceType = value)();
    this.isBuffering.subscribe(value => state.isBuffering = value)();
    this.playbackProgress.subscribe(value => state.playbackProgress = value)();
    this.shuffle.subscribe(value => state.shuffle = value)();
    this.repeat.subscribe(value => state.repeat = value)();
    
    return state;
  }

  async toggleShuffle() {
    if (!this.spotifyApi) {
      console.error('Cannot toggle shuffle: API not initialized');
      return;
    }
    
    // Set flag to prevent polling from overriding state during toggle
    this.isTogglingShuffle = true;
    
    try {
      // Ensure device is set
      await this.ensureMetroSpotifyDevice();
      
      if (!this.selectedDeviceId) {
        console.error('Cannot toggle shuffle: No device selected');
        this.isTogglingShuffle = false;
        return;
      }
      
      const currentShuffle = this.getCurrentState().shuffle;
      const newShuffleState = !currentShuffle;
      
      console.log('🔄 Toggling shuffle:', { from: currentShuffle, to: newShuffleState, deviceId: this.selectedDeviceId });
      
      // Optimistically update UI immediately
      this.shuffle.set(newShuffleState);
      
      // Spotify API: setShuffle(state, options) where options can include device_id
      await this.spotifyApi.setShuffle(newShuffleState, { device_id: this.selectedDeviceId });
      
      console.log('✅ Shuffle toggled successfully');
      
      // Clear flag after a delay to allow API to catch up
      setTimeout(() => {
        this.isTogglingShuffle = false;
      }, 2000);
    } catch (error) {
      console.error('Error toggling shuffle:', error);
      // Revert on error
      const currentShuffle = this.getCurrentState().shuffle;
      this.shuffle.set(currentShuffle);
      this.isTogglingShuffle = false;
    }
  }

  async cycleRepeat() {
    if (!this.spotifyApi) {
      console.error('Cannot cycle repeat: API not initialized');
      return;
    }
    
    // Set flag to prevent polling from overriding state during cycle
    this.isCyclingRepeat = true;
    
    try {
      // Ensure device is set
      await this.ensureMetroSpotifyDevice();
      
      if (!this.selectedDeviceId) {
        console.error('Cannot cycle repeat: No device selected');
        this.isCyclingRepeat = false;
        return;
      }
      
      const currentRepeat = this.getCurrentState().repeat;
      // Cycle: off -> all -> one -> off
      let nextRepeat;
      let spotifyRepeatState;
      
      if (currentRepeat === 'off') {
        nextRepeat = 'all';
        spotifyRepeatState = 'context';
      } else if (currentRepeat === 'all') {
        nextRepeat = 'one';
        spotifyRepeatState = 'track';
      } else {
        nextRepeat = 'off';
        spotifyRepeatState = 'off';
      }
      
      console.log('🔄 Cycling repeat:', { from: currentRepeat, to: nextRepeat, spotifyState: spotifyRepeatState, deviceId: this.selectedDeviceId });
      
      // Optimistically update UI immediately
      this.repeat.set(nextRepeat);
      
      // Spotify API: setRepeat(state, options) where state is 'off', 'track', or 'context'
      await this.spotifyApi.setRepeat(spotifyRepeatState, { device_id: this.selectedDeviceId });
      
      console.log('✅ Repeat cycled successfully');
      
      // Clear flag after a delay to allow API to catch up
      setTimeout(() => {
        this.isCyclingRepeat = false;
      }, 2000);
    } catch (error) {
      console.error('Error cycling repeat:', error);
      // Revert on error
      const currentRepeat = this.getCurrentState().repeat;
      this.repeat.set(currentRepeat);
      this.isCyclingRepeat = false;
    }
  }
}

export const musicStore = new MusicStore();
export const currentTrack = musicStore.currentTrack;
export const isPlaying = musicStore.isPlaying;
export const playbackProgress = musicStore.playbackProgress;
export const queue = musicStore.queue;
export const currentIndex = musicStore.currentIndex;
export const isBuffering = musicStore.isBuffering;
export const shuffle = musicStore.shuffle;
export const repeat = musicStore.repeat;
