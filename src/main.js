import './app.css';
import App from './App.svelte';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// Initialize Capacitor plugins
async function initCapacitor() {
  try {
    // Hide system status bar for fullscreen mode
    await StatusBar.hide();
    
    // Handle app state changes
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      // Re-hide status bar when app becomes active
      if (isActive) {
        StatusBar.hide().catch(() => {});
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

initCapacitor();

const app = new App({
  target: document.getElementById('app'),
});

export default app;
