# Quick Start Guide

Get the Metro Spotify Android app up and running in minutes.

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js (v18+) installed
- ✅ Android Studio installed
- ✅ Android SDK installed
- ✅ Java JDK 17+ installed

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Spotify (One-time)

1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Add redirect URI: `metrospotify://callback`
4. Copy your Client ID and Client Secret

**Note:** You'll enter these credentials in the app when you first run it.

### 3. Build and Run

```bash
# Build the web app
npm run build

# Add Android platform (first time only)
npx cap add android

# Sync with Android
npm run android:sync

# Open in Android Studio
npm run android:open
```

### 4. Run in Android Studio

1. Android Studio should open automatically
2. Wait for Gradle sync to complete
3. Connect an Android device or start an emulator
4. Click the green "Run" button ▶️

## First Run

1. **Enter Spotify Credentials:**
   - When the app opens, you'll need to enter your Spotify Client ID
   - You can find this in your Spotify Developer Dashboard
   - Client Secret is optional for basic functionality

2. **Connect Spotify Account:**
   - Tap "Connect with Spotify"
   - Authorize the app in the browser
   - You'll be redirected back to the app

3. **Start Playing:**
   - Your liked songs will load
   - Tap any song to play
   - Use playback controls at the bottom

## Development Workflow

### Making Changes

1. Edit files in `src/`
2. Rebuild: `npm run build`
3. Sync: `npm run android:sync`
4. Run in Android Studio

### Hot Reload (Web Development)

For faster iteration on UI:

```bash
npm run dev
```

Then open `http://localhost:5173` in a browser. Note: Spotify features may not work fully in browser due to OAuth restrictions.

## Common Commands

```bash
# Development server (web)
npm run dev

# Build web app
npm run build

# Sync with Android
npm run android:sync

# Open Android Studio
npm run android:open

# Build and sync (all-in-one)
npm run android:build
```

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Gradle sync fails
- Open Android Studio
- File > Invalidate Caches / Restart
- Let it rebuild

### OAuth not working
- Check that redirect URI is exactly: `metrospotify://callback`
- Verify Client ID is correct
- Check Logcat in Android Studio for errors

### App won't build
- Make sure Android SDK is installed
- Check that JDK 17+ is set in Android Studio
- Try: `cd android && ./gradlew clean`

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [ANDROID_SETUP.md](./ANDROID_SETUP.md) for Android-specific setup
- See [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) for migration details

## Need Help?

1. Check the troubleshooting sections in README.md
2. Review Android Studio's Logcat for error messages
3. Verify all prerequisites are installed correctly
