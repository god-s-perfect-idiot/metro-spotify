import { writable } from 'svelte/store';

// Account storage key prefix
const STORAGE_PREFIX = 'metro_spotify_account_';

class AccountsStore {
  constructor() {
    this.accounts = {};
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'spotify');
      console.log('📥 loadFromStorage called, stored data:', stored ? 'Found data' : 'No data');
      if (stored) {
        this.accounts.spotify = JSON.parse(stored);
        console.log('✅ Loaded account data:', { hasAccessToken: !!this.accounts.spotify.access_token });
      } else {
        console.log('❌ No stored data found in localStorage');
      }
    } catch (error) {
      console.error('Error loading accounts from storage:', error);
    }
  }

  saveToStorage(service) {
    if (typeof window === 'undefined') return;
    
    try {
      if (this.accounts[service]) {
        localStorage.setItem(STORAGE_PREFIX + service, JSON.stringify(this.accounts[service]));
      }
    } catch (error) {
      console.error('Error saving account to storage:', error);
    }
  }

  setAuth(service, authData) {
    console.log('🔐 setAuth called:', { service, hasAccessToken: !!authData.access_token, expiresIn: authData.expires_in });
    this.accounts[service] = {
      ...authData,
      expires_at: Date.now() + (authData.expires_in * 1000)
    };
    this.saveToStorage(service);
    console.log('💾 Auth saved to storage. Current account state:', this.accounts[service]);
  }

  getAccessToken(service) {
    const account = this.accounts[service];
    if (!account) return null;
    
    // Check if token is expired
    if (account.expires_at && Date.now() >= account.expires_at) {
      // Token expired, try to refresh if we have refresh_token
      if (account.refresh_token) {
        // In a real implementation, you'd refresh the token here
        console.warn('Token expired, refresh not implemented');
        return null;
      }
      return null;
    }
    
    return account.access_token;
  }

  hasValidToken(service) {
    const token = this.getAccessToken(service);
    return !!token;
  }

  isAuthenticated(service) {
    const result = this.hasValidToken(service);
    console.log('🔍 isAuthenticated check:', { service, result, accountExists: !!this.accounts[service] });
    return result;
  }

  logout(service) {
    delete this.accounts[service];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_PREFIX + service);
    }
  }

  cleanupStorage(service) {
    this.logout(service);
  }
}

export const accountsStore = new AccountsStore();
