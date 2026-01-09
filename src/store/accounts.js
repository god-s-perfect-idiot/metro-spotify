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

  async refreshAccessToken(service) {
    const account = this.accounts[service];
    if (!account || !account.refresh_token) {
      console.warn('Cannot refresh token: no account or refresh_token');
      return false;
    }

    try {
      console.log('🔄 Refreshing access token...');
      // Check localStorage first, then fall back to environment variables
      let clientId = localStorage.getItem('spotify_client_id') || '';
      let clientSecret = localStorage.getItem('spotify_client_secret') || '';
      
      // Fall back to environment variable for client ID if not in localStorage
      if (!clientId && typeof window !== 'undefined') {
        clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
      }
      
      // Fall back to environment variable for client secret if not in localStorage
      if (!clientSecret && typeof window !== 'undefined') {
        clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';
      }

      if (!clientId || !clientSecret) {
        console.error('Cannot refresh token: missing client credentials', {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasLocalClientId: !!localStorage.getItem('spotify_client_id'),
          hasLocalClientSecret: !!localStorage.getItem('spotify_client_secret')
        });
        return false;
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Token refresh failed:', errorData);
        return false;
      }

      const tokenData = await response.json();
      console.log('✅ Token refresh successful');

      // Update the account with new token data
      // Note: refresh_token may not be returned, so we preserve the existing one
      this.accounts[service] = {
        ...this.accounts[service],
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        // Preserve refresh_token if not returned (Spotify may or may not return it)
        refresh_token: tokenData.refresh_token || account.refresh_token
      };
      
      this.saveToStorage(service);
      console.log('💾 Refreshed token saved to storage');
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  async getAccessToken(service) {
    const account = this.accounts[service];
    if (!account) return null;
    
    const now = Date.now();
    const expiresAt = account.expires_at;
    
    // Check if token is expired or about to expire (refresh 5 minutes before expiration)
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    const needsRefresh = expiresAt && (now >= expiresAt - refreshThreshold);
    
    if (needsRefresh) {
      console.log('⏰ Token expired or expiring soon, refreshing...');
      const refreshed = await this.refreshAccessToken(service);
      if (!refreshed) {
        // Refresh failed, return null if token is actually expired
        if (now >= expiresAt) {
          console.warn('Token expired and refresh failed');
          return null;
        }
        // Token is still valid (within threshold), return it
        return account.access_token;
      }
      // Return the newly refreshed token
      return this.accounts[service].access_token;
    }
    
    return account.access_token;
  }

  async hasValidToken(service) {
    const token = await this.getAccessToken(service);
    return !!token;
  }

  // Sync version for reactive statements (checks current state without refresh)
  isAuthenticatedSync(service) {
    const account = this.accounts[service];
    if (!account || !account.access_token) return false;
    // Check if token exists (may be expired, but refresh will happen when token is used)
    const now = Date.now();
    const expiresAt = account.expires_at;
    // Return true if token exists and either no expiration or not yet expired
    return expiresAt ? now < expiresAt : !!account.access_token;
  }

  async isAuthenticated(service) {
    const result = await this.hasValidToken(service);
    console.log('🔍 isAuthenticated check:', { service, result, accountExists: !!this.accounts[service] });
    return result;
  }

  getAccount(service) {
    return this.accounts[service] || null;
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
