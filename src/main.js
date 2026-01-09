import './app.css';
import App from './App.svelte';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { cacheManager } from './lib/cache.js';
import { musicStore } from './store/music.js';

// Initialize Capacitor plugins
async function initCapacitor() {
  try {
    // Make status bar overlay the webview so custom status bar can render on top
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Set status bar background to black (will show behind custom status bar)
    await StatusBar.setBackgroundColor({ color: '#000000' });
    // Set status bar style to light (white icons, but we'll hide it)
    await StatusBar.setStyle({ style: Style.Light });
    // Hide system status bar icons (area remains with black background in overlay mode)
    await StatusBar.hide();
    
    // Handle app state changes
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      // Re-set status bar when app becomes active
      if (isActive) {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.hide().catch(() => {});
      } else {
        // App went to background - mark cache for clearing on next open
        cacheManager.markForClear();
      }
    });
    
    // Handle back button
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });
  } catch (error) {
    console.log('Capacitor not available (running in browser)', error);
  }
}

// Handle media commands from Android media controls
if (typeof window !== 'undefined') {
  window.handleMediaCommand = async (command) => {
    console.log('📱 Received media command:', command);
    try {
      switch (command) {
        case 'play':
          await musicStore.togglePlayPause();
          break;
        case 'pause':
          await musicStore.togglePlayPause();
          break;
        case 'skipNext':
          await musicStore.playNext();
          break;
        case 'skipPrevious':
          await musicStore.playPrevious();
          break;
        default:
          console.warn('Unknown media command:', command);
      }
    } catch (error) {
      console.error('Error handling media command:', error);
    }
  };
}

initCapacitor();

const app = new App({
  target: document.getElementById('app'),
});

export default app;
