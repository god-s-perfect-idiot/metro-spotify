# Android Manifest Configuration for Fullscreen

When Capacitor generates the Android project, you may need to update the AndroidManifest.xml to ensure fullscreen mode works correctly.

## Automatic Configuration

Capacitor should handle most of this automatically, but if you need to manually configure:

### Location
`android/app/src/main/AndroidManifest.xml`

### Add/Update the Activity Configuration

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    android:theme="@style/AppTheme"
    android:windowSoftInputMode="adjustResize"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
    
    <!-- Existing intent filters -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>
    
    <!-- Deep link intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="metrospotify"/>
    </intent-filter>
</activity>
```

### Update styles.xml for Fullscreen

Location: `android/app/src/main/res/values/styles.xml`

```xml
<resources>
    <!-- Base application theme -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowNoTitle">true</item>
    </style>
</resources>
```

### Alternative: Use Immersive Mode (Recommended)

For better user experience, you can use immersive mode which hides system bars but allows users to swipe to reveal them.

This is handled via the Capacitor StatusBar plugin (StatusBar.hide()), which we've already configured in `src/main.js`.

## Notes

- The StatusBar.hide() call in main.js handles the system status bar hiding
- The custom StatusBar component renders the custom status bar UI
- The 24px padding-top on the main content area provides space for the custom status bar
- Fullscreen mode will be active when the app launches

## Testing

After building and running the app:
1. System status bar should be hidden
2. Custom status bar should appear at the top
3. Content should start below the custom status bar (24px padding)
