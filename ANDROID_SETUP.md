# Android Setup Guide

This guide will help you set up the Android development environment and build the Metro Spotify app.

## Initial Setup

### 1. Install Android Studio

Download and install [Android Studio](https://developer.android.com/studio) if you haven't already.

### 2. Install Android SDK

1. Open Android Studio
2. Go to **Tools > SDK Manager**
3. Install:
   - Android SDK Platform 33 or higher
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator (optional, for testing)

### 3. Set Environment Variables (macOS/Linux)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# or
export ANDROID_HOME=$HOME/Android/Sdk          # Linux

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 4. Install Capacitor CLI (if not already installed)

```bash
npm install -g @capacitor/cli
```

## Building the App

### First Time Setup

1. **Install npm dependencies:**
   ```bash
   npm install
   ```

2. **Build the web app:**
   ```bash
   npm run build
   ```

3. **Add Android platform (first time only):**
   ```bash
   npx cap add android
   ```

4. **Sync with Android:**
   ```bash
   npm run android:sync
   ```

5. **Open in Android Studio:**
   ```bash
   npm run android:open
   ```

### Subsequent Builds

For development, use:
```bash
npm run android:build
```

This will:
1. Build the web app
2. Sync files to Android
3. Open Android Studio (you can run it manually)

## Running the App

### On an Emulator

1. Open Android Studio
2. Click **Tools > Device Manager**
3. Create a new virtual device (or use an existing one)
4. Start the emulator
5. Click the **Run** button (green play icon) in Android Studio

### On a Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times
   
2. Enable **USB Debugging**:
   - Go to **Settings > Developer Options**
   - Enable **USB Debugging**

3. Connect your device via USB

4. In Android Studio, select your device from the device dropdown

5. Click the **Run** button

## Deep Link Configuration

The app is configured to handle OAuth callbacks via the custom URL scheme `metrospotify://callback`.

This is already configured in:
- `capacitor.config.ts` - Deep link scheme
- Android manifest (auto-generated) - Intent filters

### Testing Deep Links

You can test deep links using ADB:

```bash
adb shell am start -a android.intent.action.VIEW -d "metrospotify://callback?code=TEST_CODE" com.metrospotify.app
```

## Spotify Configuration for Android

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

2. Edit your app settings

3. Add redirect URI:
   - `metrospotify://callback`

4. Save your Client ID and Client Secret (you'll need to enter these in the app)

## Building Release APK/AAB

### 1. Generate a Keystore (first time only)

```bash
keytool -genkey -v -keystore metro-spotify-release.keystore -alias metro-spotify -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore file securely and remember the password!

### 2. Configure Signing in Android Studio

1. Open `android/app/build.gradle`
2. Add signing config (or use Android Studio's signing wizard)
3. Build > Generate Signed Bundle / APK
4. Follow the wizard to create your release build

### 3. Build Release APK

In Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. Select **APK** or **Android App Bundle (AAB)**
3. Choose your keystore
4. Select **release** build variant
5. Click **Finish**

The signed APK/AAB will be generated in `android/app/release/`

## Troubleshooting

### Gradle Sync Fails

- Update Android Studio to the latest version
- Update Gradle wrapper: `cd android && ./gradlew wrapper --gradle-version=8.0`
- Invalidate caches: **File > Invalidate Caches / Restart**

### Build Errors

- **"SDK not found"**: Install required SDK in SDK Manager
- **"JDK not found"**: Set JDK path in **File > Project Structure > SDK Location**
- **"Gradle daemon"**: Kill Gradle daemon: `cd android && ./gradlew --stop`

### App Crashes on Launch

- Check Logcat in Android Studio for error messages
- Verify all Capacitor plugins are installed: `npm install`
- Rebuild: `npm run build && npm run android:sync`

### OAuth Not Working

- Verify redirect URI matches exactly: `metrospotify://callback`
- Check Logcat for OAuth errors
- Test deep link manually with ADB (see above)

### Playback Not Working

- Ensure Spotify Premium account is connected
- Check that a Spotify device is available (open Spotify on another device)
- Verify network connectivity

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
