import { writable } from 'svelte/store';

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
    
    this.pollingInterval = null;
    this.startPolling();
  }

  setSpotifyApi(api) {
    this.spotifyApi = api;
  }

  setSelectedDeviceId(deviceId) {
    this.selectedDeviceId = deviceId;
  }

  setQueue(tracks) {
    this.queue.set(tracks);
  }

  async playTrack(track, index = -1, allTracks = []) {
    if (!this.spotifyApi || !this.selectedDeviceId) {
      throw new Error('Spotify API or device not initialized');
    }

    try {
      // If we have a list of tracks, play the selected one and queue the rest
      if (allTracks.length > 0) {
        // Find the index of the track to play
        const playIndex = index >= 0 ? index : allTracks.findIndex(t => t.uri === track.uri);
        const actualIndex = playIndex >= 0 ? playIndex : 0;
        
        // Get all URIs starting from the selected track
        const urisToPlay = allTracks.slice(actualIndex).map(t => t.uri);
        
        // Play the selected track and queue the rest
        await this.spotifyApi.play({
          device_id: this.selectedDeviceId,
          uris: urisToPlay
        });
        
        // Store the full queue
        this.queue.set(allTracks);
        this.currentIndex.set(actualIndex);
      } else {
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
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }

  async togglePlayPause() {
    if (!this.spotifyApi) return;

    try {
      const currentState = await this.spotifyApi.getMyCurrentPlaybackState();
      
      if (currentState.is_playing) {
        await this.spotifyApi.pause({ device_id: this.selectedDeviceId });
        this.isPlaying.set(false);
      } else {
        await this.spotifyApi.play({ device_id: this.selectedDeviceId });
        this.isPlaying.set(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }

  async playNext() {
    if (!this.spotifyApi) return;

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
      
      await this.updateCurrentTrack();
    } catch (error) {
      console.error('Error playing next:', error);
    }
  }

  async playPrevious() {
    if (!this.spotifyApi) return;

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
      
      await this.updateCurrentTrack();
    } catch (error) {
      console.error('Error playing previous:', error);
    }
  }

  async updateCurrentTrack() {
    if (!this.spotifyApi) return;
    
    // Don't update if user explicitly navigated away
    if (this.userNavigatedAway) return;

    try {
      const state = await this.spotifyApi.getMyCurrentPlaybackState();
      if (state.item) {
        const track = {
          ...state.item,
          type: 'spotify'
        };
        this.currentTrack.set(track);
        this.serviceType.set('spotify');
        this.isPlaying.set(state.is_playing);
        
        // Update current index if we have a queue
        const queue = this.getCurrentState().queue;
        if (queue.length > 0) {
          const trackIndex = queue.findIndex(t => t.uri === track.uri);
          if (trackIndex >= 0) {
            this.currentIndex.set(trackIndex);
          }
        }
        
        const progress = {
          currentTime: state.progress_ms / 1000,
          duration: state.item.duration_ms / 1000,
          seekValue: state.progress_ms / state.item.duration_ms * 100
        };
        this.playbackProgress.set(progress);
      }
    } catch (error) {
      console.error('Error updating current track:', error);
    }
  }

  startPolling() {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(() => {
      if (this.spotifyApi) {
        this.updateCurrentTrack();
      }
    }, 1000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  clear() {
    this.userNavigatedAway = true; // Set flag to prevent polling from restoring track
    this.currentTrack.set(null);
    this.isPlaying.set(false);
    this.serviceType.set(null);
    this.currentIndex.set(-1);
    this.queue.set([]);
  }

  getCurrentState() {
    let state = {
      currentTrack: null,
      isPlaying: false,
      queue: [],
      currentIndex: -1,
      serviceType: null
    };
    
    this.currentTrack.subscribe(value => state.currentTrack = value)();
    this.isPlaying.subscribe(value => state.isPlaying = value)();
    this.queue.subscribe(value => state.queue = value)();
    this.currentIndex.subscribe(value => state.currentIndex = value)();
    this.serviceType.subscribe(value => state.serviceType = value)();
    
    return state;
  }
}

export const musicStore = new MusicStore();
export const currentTrack = musicStore.currentTrack;
export const isPlaying = musicStore.isPlaying;
export const playbackProgress = musicStore.playbackProgress;
export const queue = musicStore.queue;
export const currentIndex = musicStore.currentIndex;
