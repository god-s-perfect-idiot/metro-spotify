# Spotify Quick Setup

## 1. Get Your Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app or use an existing one
3. Copy your **Client ID** and **Client Secret**

## 2. Configure Environment Variables

1. Copy `env.example` to `.env` in your project root
2. Update the values in `.env`:

```bash
# Spotify Configuration
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
VITE_SPOTIFY_REDIRECT_URI=https://your-ngrok-url.ngrok-free.app/spotify/callback
```

## 3. Set Redirect URI in Spotify Dashboard

In your Spotify app dashboard, add this redirect URI:
- **Development**: `https://your-ngrok-url.ngrok-free.app/spotify/callback`
- **Production**: `https://yourdomain.com/spotify/callback`

## 4. Test

1. Run `npm run dev`
2. Navigate to `/spotify`
3. Click "Connect with Spotify"
4. Authorize the app

## That's it! 🎵

Your Spotify integration is now ready to use with secure environment variable configuration.

## Security Benefits

✅ **No hardcoded credentials** in source code  
✅ **Environment-specific configuration**  
✅ **Easy to update** without code changes  
✅ **Production-ready** deployment  

## Troubleshooting

- **"Invalid redirect URI"**: Make sure the URI in Spotify dashboard matches exactly
- **"Client ID not found"**: Verify your `.env` file has the correct values
- **Build errors**: Run `npm run build` to check for syntax issues
- **Missing .env**: Copy `env.example` to `.env` and fill in your values
