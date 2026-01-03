# Migration Notes: SvelteKit to Capacitor Android

This document describes the changes made to port the SvelteKit web app to a Capacitor-based Android app.

## Key Changes

### 1. Framework Migration

**From:** SvelteKit (file-based routing with `+page.svelte`)
**To:** Standard Svelte + Custom Router

- Removed SvelteKit-specific features (`$app/navigation`, `$app/environment`)
- Created custom router in `src/lib/router.js`
- Created browser detection utility in `src/lib/browser.js`

### 2. Routing

**Before:** File-based routing (`/spotify/+page.svelte`)
**After:** Component-based routing with router store

- Main router in `src/App.svelte`
- Routes: `/spotify` and `/spotify/callback`
- Uses `window.history` API for navigation

### 3. Stores

All stores were recreated as they weren't present in the legacy codebase:

- `src/store/accounts.js` - Account management and token storage
- `src/store/music.js` - Music playback state management
- `src/store/toast.js` - Toast notifications

### 4. OAuth Flow

**Android Deep Links:**
- Uses custom URL scheme: `metrospotify://callback`
- Configured in `capacitor.config.ts`
- Handled by Capacitor's `App.addListener('appUrlOpen')`

**Note:** Token exchange is currently done client-side (not secure for production). For production, implement a backend endpoint.

### 5. Components

All components were copied from `legacy-ubq/components/` and adapted:
- Removed SvelteKit-specific imports
- Updated import paths to match new structure
- Maintained all functionality

### 6. Build System

**Before:** SvelteKit build system
**After:** Vite + Capacitor

- `vite.config.js` - Vite configuration
- `capacitor.config.ts` - Capacitor configuration
- Build output goes to `dist/` directory
- Android project in `android/` directory (generated)

### 7. Dependencies

New dependencies added:
- `@capacitor/core` - Core Capacitor functionality
- `@capacitor/android` - Android platform support
- `@capacitor/app` - App lifecycle and deep links
- `@capacitor/browser` - Browser plugin for OAuth
- `@capacitor/status-bar` - Status bar control
- `svelte` (standard, not SvelteKit)

Removed:
- `@sveltejs/kit` - No longer needed
- SvelteKit adapter packages

### 8. File Structure

```
Before (SvelteKit):
legacy-ubq/
  spotify/
    +page.svelte
    callback/
      +page.svelte
  components/
  ...

After (Capacitor):
src/
  pages/
    SpotifyPage.svelte
    SpotifyCallback.svelte
  components/
  store/
  lib/
  App.svelte
  main.js
```

## What Wasn't Ported

- **SpotifySetup.svelte** - Setup page was intentionally not ported (per user request)
- Server-side API routes - Would need separate backend implementation
- SvelteKit-specific features (server-side rendering, etc.)

## Android-Specific Features

1. **Deep Links** - OAuth callback handling via custom URL scheme
2. **Status Bar** - Status bar styling on Android
3. **Back Button** - Back button handling via Capacitor
4. **Browser Plugin** - Opens OAuth in system browser

## Next Steps for Production

1. **Backend for Token Exchange:**
   - Create a backend server endpoint for OAuth token exchange
   - Never expose Client Secret in client code
   - Consider using PKCE flow for better security

2. **Signing:**
   - Generate signing keystore
   - Configure release builds

3. **Testing:**
   - Test on multiple Android versions
   - Test OAuth flow thoroughly
   - Test playback functionality

4. **App Store:**
   - Prepare app metadata
   - Create app icons and splash screens
   - Submit to Google Play Store

## Known Limitations

1. **Client-side token exchange** - Not secure, needs backend
2. **Spotify Web Playback SDK** - Requires Premium account
3. **Device selection** - Currently uses first available device
4. **Error handling** - Basic error handling, could be improved

## Testing Checklist

- [ ] OAuth login flow works
- [ ] Deep link callback works
- [ ] Music playback works
- [ ] Library loads correctly
- [ ] Playback controls work
- [ ] Back button works
- [ ] App state persists correctly
- [ ] Works on different Android versions
- [ ] Works on different screen sizes
