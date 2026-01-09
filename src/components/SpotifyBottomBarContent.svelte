<script>
  import Icon from "@iconify/svelte";
  import { musicStore } from "../store/music.js";
  import { router, currentRoute } from "../lib/router.js";
  import { App as CapacitorApp } from "@capacitor/app";
  import { bottomBarExpanded } from "../store/bottomBar.js";

  export let isExpanded = false;
  export let showSetup = false;
  export let isAuthenticated = false;
  export let nowPlayingTrack = null;

  export let viewState = "library"; // 'setup', 'login', 'library', 'now-playing', 'playlists', 'artists', 'albums', 'people', 'settings'
  export let onHideSetup = () => {};
  export let onConnect = () => {};

  function collapseBar() {
    bottomBarExpanded.set(false);
  }

  function closePage() {
    collapseBar();
    // Close the app if on native platform, otherwise navigate to home
    if (
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform()
    ) {
      CapacitorApp.exitApp();
    } else {
      setTimeout(() => {
        router.goto("/");
      }, 200);
    }
  }

  function goToLibrary() {
    collapseBar();
    musicStore.clear();
    router.goto("/spotify");
  }

  function goToHome() {
    collapseBar();
    const route = $currentRoute;
    // Check if we're on a search results type page (not the main search results page)
    const routePath = route.split('?')[0];
    if (routePath && (routePath === "/search/tracks" || 
                      routePath === "/search/albums" || 
                      routePath === "/search/artists" || 
                      routePath === "/search/playlists")) {
      // Extract search query from current route
      const urlParams = new URLSearchParams(route.split('?')[1] || '');
      const searchQuery = urlParams.get("q") || "";
      // Navigate back to search results page
      router.goto(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // For main search results page or other pages, go home
      router.goto("/");
    }
  }

  function goToNowPlaying() {
    collapseBar();
    // Navigate to now playing page
    router.goto("/now-playing");
  }

  function goBackFromPlaylists() {
    collapseBar();
    const route = $currentRoute;
    if (route && route.startsWith("/playlist/")) {
      // If on a playlist detail page, go back to playlists list
      router.goto("/playlists");
    } else {
      // If on playlists list, go back to home
      router.goto("/");
    }
  }

  function goBackFromArtists() {
    collapseBar();
    const route = $currentRoute;
    if (route && route.startsWith("/artist/")) {
      // If on an artist detail page, go back to artists list
      router.goto("/artists");
    } else {
      // If on artists list, go back to home
      router.goto("/");
    }
  }

  function goBackFromAlbums() {
    collapseBar();
    const route = $currentRoute;
    if (route && route.startsWith("/album/")) {
      // If on an album detail page, go back to albums list
      router.goto("/albums");
    } else {
      // If on albums list, go back to home
      router.goto("/");
    }
  }

  function goBackFromPeople() {
    collapseBar();
    const route = $currentRoute;
    if (route && route.startsWith("/user/")) {
      // If on a user detail page, go back to people list
      router.goto("/people");
    } else {
      // If on people list, go back to home
      router.goto("/");
    }
  }

  function goBackFromSettings() {
    collapseBar();
    router.goto("/");
  }

  function goToSongs() {
    collapseBar();
    router.goto("/spotify");
  }

  function goBackFromNowPlaying() {
    collapseBar();
    // Go back to the page
    router.goto("/");
  }

  function goBackFromPlayQueue() {
    collapseBar();
    router.goto("/");
  }

  function handleHideSetup() {
    collapseBar();
    onHideSetup();
  }

  function handleConnect() {
    collapseBar();
    onConnect();
  }
</script>

<div class="flex flex-row gap-12 justify-center items-center">
  {#if showSetup && !isAuthenticated}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={handleHideSetup}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={handleConnect}
      >
        <Icon icon="mdi:check" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">connect</span>
    </div>
  {:else if isAuthenticated && viewState === "library"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToHome}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <!-- {#if nowPlayingTrack} -->
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
    <!-- {/if} -->
  {:else if isAuthenticated && viewState === "playlists"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromPlaylists}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
  {:else if isAuthenticated && viewState === "artists"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromArtists}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
  {:else if isAuthenticated && viewState === "albums"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromAlbums}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
  {:else if isAuthenticated && viewState === "people"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromPeople}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
  {:else if isAuthenticated && viewState === "settings"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromSettings}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
  {:else if isAuthenticated && viewState === "now-playing"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToHome}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
	<div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToSongs}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">songs</span>
    </div>
  {:else if isAuthenticated && viewState === "play-queue"}
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goBackFromPlayQueue}
      >
        <Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">back</span>
    </div>
    <div
      class="btn-animate flex flex-col gap-2 justify-center items-center"
      class:animate={isExpanded}
    >
      <button
        class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
        on:click={goToNowPlaying}
      >
        <Icon icon="mdi:music" width="18" height="18" strokeWidth="2" />
      </button>
      <span class="text-xs font-[400]">player</span>
    </div>
  {/if}
  <div
    class="btn-animate flex flex-col gap-2 justify-center items-center"
    class:animate={isExpanded}
  >
    <button
      on:click={closePage}
      class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
    >
      <Icon icon="rivet-icons:close" width="18" height="18" strokeWidth="2" />
    </button>
    <span class="text-xs font-[400]">close</span>
  </div>
</div>

<style>
  .btn-animate {
    transform: translateY(120%);
    opacity: 0;
  }

  .btn-animate.animate {
    animation: button-overshoot 0.5s ease-out forwards;
    opacity: 1;
  }

  @keyframes button-overshoot {
    0% {
      transform: translateY(120%);
    }
    70% {
      transform: translateY(-20%);
    }
    100% {
      transform: translateY(0);
    }
  }
</style>
