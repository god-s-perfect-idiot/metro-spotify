<script>
  import Input from "../../components/Input.svelte";
  import Button from "../../components/Button.svelte";
  import { accentColorStore } from "../../utils/theme.js";
  import { accountsStore } from "../../store/accounts.js";
  import { addToast } from "../../store/toast.js";
  import { router } from "../../lib/router.js";

  export let isExiting = false;
  export let spotifyClientId = "";
  export let spotifyClientSecret = "";
  export let onConnect = () => {};

  $: accentColor = $accentColorStore;

  let useDirectToken = false;
  let accessToken = "";
  let refreshToken = "";
  let expiresIn = "3600"; // Default to 1 hour

  async function submitDirectToken() {
    if (!accessToken) {
      addToast("Please enter an access token.");
      return;
    }

    try {
      // Save client ID and secret to localStorage for token refresh
      if (spotifyClientId) {
        localStorage.setItem("spotify_client_id", spotifyClientId);
      }
      if (spotifyClientSecret) {
        localStorage.setItem("spotify_client_secret", spotifyClientSecret);
      }

      // First, test the token by making an API call
      const { default: SpotifyWebApi } = await import("spotify-web-api-js");
      const spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(accessToken);
      
      // Test the token by fetching user info
      const userInfo = await spotifyApi.getMe();
      
      // If API call succeeds, token is valid - proceed with storing
      const username = userInfo.display_name || userInfo.id || "Spotify User";
      
      // Store authentication data
      accountsStore.setAuth("spotify", {
        access_token: accessToken,
        expires_in: parseInt(expiresIn) || 3600,
        refresh_token: refreshToken || undefined,
      });

      // Save to storage
      accountsStore.saveToStorage("spotify");
      
      // Save username
      localStorage.setItem("spotify_username", username);

      addToast("Spotify account connected successfully");

      // Redirect to home with full page reload to ensure auth state is refreshed
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("Error validating or setting auth token:", error);
      
      // Determine error message based on the error
      let errorMessage = "Failed to connect with token. Please check your token and try again.";
      if (error.status === 401) {
        errorMessage = "Invalid access token. The token may be expired or incorrect.";
      } else if (error.status === 403) {
        errorMessage = "Token does not have required permissions.";
      } else if (error.message) {
        errorMessage = `Token validation failed: ${error.message}`;
      }
      
      addToast(errorMessage);
    }
  }
</script>

<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
  <span class="text-base mt-2 font-[500] px-4 uppercase">spotify</span>

  <span class="text-6xl font-[300] px-4">connect app</span>
  <div class="flex flex-col gap-6 flex-1 overflow-y-auto pb-2 px-4">
    <!-- Developer Setup -->
    <div class="flex flex-col gap-4">
      <span class="text-lg font-[300] mt-4" style="color: {accentColor};"
        >oauth login</span
      >
      <span class="text-sm font-[300] text-[#a1a1a1]">
        Get credentials from the
        <a
          href="https://developer.spotify.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 underline">Spotify Developer Dashboard</a
        >.
      </span>

      <div class="flex flex-col gap-4">
        <Input label="Client ID" bind:content={spotifyClientId} />
        <div class="flex flex-col gap-2 font-[400]">
          <label for="spotify-client-secret" class="text-[#767676] text-sm"
            >Client Secret</label
          >
          <input
            id="spotify-client-secret"
            type="password"
            bind:value={spotifyClientSecret}
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-[300] text-[#a1a1a1]">Redirect URI:</span>
        <span class="text-base font-[300] text-[#767676] mt-1"
          >metrospotify://callback</span
        >
      </div>
    </div>

    <!-- Connection Status -->
    <div class="flex flex-col gap-2">
      <span class="text-lg font-[300]">
        Enter your credentials above, then click connect to authorize the app.
      </span>
      <span class="text-sm font-[300] text-[#a1a1a1]">
        Your credentials are stored locally on your device and never shared with
        anyone.
      </span>
    </div>
    <!-- Connect Button (OAuth) -->
    <Button text="connect" onClick={onConnect} className="w-auto" />

    <!-- Direct Token Input Section -->
    <div class="flex flex-col gap-4 mt-4 mb-12">
      <span class="text-lg font-[300]" style="color: {accentColor};"
        >direct token</span
      >
      <span class="text-sm font-[300] text-[#a1a1a1]">
        Paste your Spotify access token directly. You can get this from
        Spotify's developer tools or by inspecting network requests.
      </span>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2 font-[400]">
          <label for="access-token" class="text-[#767676] text-sm"
            >Access Token *</label
          >
          <input
            id="access-token"
            type="text"
            bind:value={accessToken}
            placeholder="Paste your access token here"
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
        <div class="flex flex-col gap-2 font-[400]">
          <label for="refresh-token" class="text-[#767676] text-sm"
            >Refresh Token (optional)</label
          >
          <input
            id="refresh-token"
            type="text"
            bind:value={refreshToken}
            placeholder="Paste your refresh token here (optional)"
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
        <div class="flex flex-col gap-2 font-[400]">
          <label for="expires-in" class="text-[#767676] text-sm"
            >Expires In (seconds)</label
          >
          <input
            id="expires-in"
            type="text"
            bind:value={expiresIn}
            placeholder="3600"
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
        <div class="flex flex-col gap-2 font-[400]">
          <label for="direct-client-id" class="text-[#767676] text-sm"
            >Client ID (for token refresh)</label
          >
          <input
            id="direct-client-id"
            type="text"
            bind:value={spotifyClientId}
            placeholder="Enter your client ID (optional)"
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
        <div class="flex flex-col gap-2 font-[400]">
          <label for="direct-client-secret" class="text-[#767676] text-sm"
            >Client Secret (for token refresh)</label
          >
          <input
            id="direct-client-secret"
            type="password"
            bind:value={spotifyClientSecret}
            placeholder="Enter your client secret (optional)"
            class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
          />
        </div>
      </div>

      <div class="mt-4">
        <Button
          text="submit token"
          onClick={submitDirectToken}
          className="w-auto"
        />
      </div>
    </div>
  </div>
</div>
