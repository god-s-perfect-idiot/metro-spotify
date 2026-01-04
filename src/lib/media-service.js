import { Capacitor } from '@capacitor/core';

/**
 * Media Service Bridge
 * Communicates with the native Android MediaService to keep playback alive
 */
class MediaServiceBridge {
  constructor() {
    this.isAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Start the media service with initial metadata
   */
  async startService(track, artist, isPlaying = false) {
    if (!this.isAvailable) {
      return;
    }

    try {
      if (window.MediaServiceNative) {
        window.MediaServiceNative.startService(
          track || '',
          artist || '',
          isPlaying
        );
      }
    } catch (error) {
      console.error('[MediaService] Error starting service:', error);
    }
  }

  /**
   * Update metadata in the service
   */
  async updateMetadata(track, artist, isPlaying = false) {
    if (!this.isAvailable) {
      return;
    }

    try {
      if (window.MediaServiceNative) {
        window.MediaServiceNative.updateMetadata(
          track || '',
          artist || '',
          isPlaying
        );
      }
    } catch (error) {
      console.error('[MediaService] Error updating metadata:', error);
    }
  }

  /**
   * Update playback state
   */
  async updatePlaybackState(isPlaying) {
    if (!this.isAvailable) {
      return;
    }

    try {
      if (window.MediaServiceNative) {
        window.MediaServiceNative.updatePlaybackState(isPlaying);
      }
    } catch (error) {
      console.error('[MediaService] Error updating playback state:', error);
    }
  }

  /**
   * Stop the media service
   */
  async stopService() {
    if (!this.isAvailable) {
      return;
    }

    try {
      if (window.MediaServiceNative) {
        window.MediaServiceNative.stopService();
      }
    } catch (error) {
      console.error('[MediaService] Error stopping service:', error);
    }
  }
}

export const mediaServiceBridge = new MediaServiceBridge();
