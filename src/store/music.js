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

  async playTrack(track, index = -1) {
    if (!this.spotifyApi || !this.selectedDeviceId) {
      throw new Error('Spotify API or device not initialized');
    }

    try {
      await this.spotifyApi.play({
        device_id: this.selectedDeviceId,
        uris: [track.uri]
      });

      this.userNavigatedAway = false; // Reset flag when user plays a track
      this.currentTrack.set(track);
      this.serviceType.set(track.type || 'spotify');
      this.currentIndex.set(index >= 0 ? index : 0);
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
      await this.spotifyApi.skipToNext({ device_id: this.selectedDeviceId });
      await this.updateCurrentTrack();
    } catch (error) {
      console.error('Error playing next:', error);
    }
  }

  async playPrevious() {
    if (!this.spotifyApi) return;

    try {
      await this.spotifyApi.skipToPrevious({ device_id: this.selectedDeviceId });
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
