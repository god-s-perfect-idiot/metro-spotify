# Spotify Integration Setup Guide

This guide will help you set up the Spotify integration for your Ubiquity application.

## Prerequisites

- A Spotify account (free or premium)
- Access to the Spotify Developer Dashboard

## Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - **App name**: Ubiquity (or any name you prefer)
   - **App description**: Music integration for Ubiquity OS
   - **Website**: Your app's URL (can be localhost for development)
   - **Redirect URI**: `http://localhost:5173/spotify/callback` (for development)
   - **API/SDKs**: Select "Web API"
5. Click "Save"

## Step 2: Get Your Client ID

1. After creating the app, you'll be taken to the app dashboard
2. Copy the **Client ID** (you'll need this in the next step)

## Step 3: Configure the Application

### Option 1: Environment Variables (Recommended)

1. Copy `env.example` to `.env` in your project root
2. Replace `your_spotify_client_id_here` with your actual Client ID:

```bash
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
```

### Option 2: Direct Code Edit

1. Open `src/lib/spotify-config.js`
2. Replace `YOUR_SPOTIFY_CLIENT_ID` with your actual Client ID:

```javascript
export const SPOTIFY_CONFIG = {
  CLIENT_ID: 'your_actual_client_id_here',
  // ... rest of config
};
```

**Note**: Using environment variables is recommended for security and easier deployment management.

## Step 4: Set Redirect URI for Production

When you deploy your application to production, you'll need to:

1. Go back to your Spotify app dashboard
2. Add your production redirect URI (e.g., `https://yourapp.com/spotify/callback`)
3. Update the `REDIRECT_URI` in `src/lib/spotify.js` if needed

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/spotify` in your application
3. Click "Connect with Spotify"
4. Authorize the application in Spotify
5. You should be redirected back and see your Spotify profile

## Features

Once connected, you'll have access to:

- **User Profile**: Display name, email, profile picture, follower count
- **Currently Playing**: Real-time track information with playback controls
- **Search**: Search for tracks and play them
- **Playlists**: View and browse your playlists
- **Top Tracks**: Your most listened to tracks
- **Top Artists**: Your most listened to artists
- **Library**: Your saved tracks
- **Playback Controls**: Play, pause, next, previous

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Make sure the redirect URI in your Spotify app matches exactly
   - Check for trailing slashes or protocol differences

2. **"Client ID not found" error**
   - Verify you've replaced `YOUR_SPOTIFY_CLIENT_ID` with your actual Client ID
   - Check that the Client ID is copied correctly

3. **Authentication fails**
   - Ensure your Spotify account is active
   - Check that you've granted the necessary permissions during authorization

4. **Playback controls don't work**
   - Make sure you have an active Spotify session (app open and playing music)
   - Premium accounts have access to more playback features

### Development vs Production

- **Development**: Use `http://localhost:5173/spotify/callback`
- **Production**: Use `https://yourdomain.com/spotify/callback`

Remember to add both URIs to your Spotify app dashboard if you plan to use both environments.

## Environment Variables

The application supports environment variables for configuration:

- `VITE_SPOTIFY_CLIENT_ID`: Your Spotify App Client ID (required)
- `VITE_SPOTIFY_REDIRECT_URI`: Custom redirect URI (optional)
- `VITE_API_BASE_URL`: API base URL (optional)
- `VITE_DEBUG`: Enable debug mode (optional)

Create a `.env` file in your project root based on `env.example`.

## Security Notes

- Never commit your Client ID to public repositories
- Use environment variables for production deployments
- The access token is stored in localStorage and automatically expires
- Users can revoke access through their Spotify account settings

## API Limits

Spotify has rate limits for API calls:
- 25 requests per second for authenticated users
- 100 requests per second for premium users

The application includes error handling and will gracefully handle rate limiting.

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Spotify app configuration
3. Ensure your Spotify account has the necessary permissions
4. Check that the redirect URI matches exactly
