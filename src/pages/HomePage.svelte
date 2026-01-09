<script>
  import { router } from "../lib/router.js";
  import { addToast } from "../store/toast.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";

  export let isExiting = false;
  export let onBeforeNavigate = () => {}; // Callback to notify parent before navigation

  let internalIsExiting = false;
  let searchQuery = "";

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;

  // Use internal exit state if we have it, otherwise use the prop
  // But if onBeforeNavigate is provided, don't use internal exit (parent will handle it)
  $: shouldShowExit = onBeforeNavigate
    ? isExiting
    : internalIsExiting || isExiting;

  function handleSearch() {
    if (!searchQuery.trim()) return;

    const searchRoute = `/search?q=${encodeURIComponent(searchQuery.trim())}`;

    if (onBeforeNavigate) {
      onBeforeNavigate(() => {
        router.goto(searchRoute);
      });
    } else {
      internalIsExiting = true;
      setTimeout(() => {
        router.goto(searchRoute);
        internalIsExiting = false;
      }, 200);
    }
  }

  function handleSearchKeydown(event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  const menuItems = [
    // {
    //   id: "now-playing",
    //   label: "now playing",
    //   route: "/now-playing",
    //   icon: "ic:sharp-headphones",
    // },
    { id: "songs", label: "songs", route: "/spotify", icon: "mdi:music" },
    {
      id: "playlists",
      label: "playlists",
      route: "/playlists",
      icon: "dashicons:playlist-audio",
    },
    {
      id: "artists",
      label: "artists",
      route: "/artists",
      icon: "material-symbols:artist",
    },
    {
      id: "albums",
      label: "albums",
      route: "/albums",
      icon: "mdi:album",
    },
    {
      id: "play queue",
      label: "play queue",
      route: "/play-queue",
      icon: "ic:sharp-queue-music",
    },
    {
      id: "people",
      label: "people",
      route: "/people",
      icon: "mdi:account-group",
    },
    {
      id: "settings",
      label: "settings",
      route: "/settings",
      icon: "subway:settong",
    },
  ];

  function handleItemClick(route) {
    // No special handling needed for play-queue anymore

    // If parent provides onBeforeNavigate callback, use it (carousel will handle exit)
    if (onBeforeNavigate) {
      onBeforeNavigate(() => {
        router.goto(route);
      });
    } else {
      // Otherwise, handle exit internally (standalone HomePage)
      internalIsExiting = true;
      setTimeout(() => {
        router.goto(route);
        internalIsExiting = false;
      }, 200); // Match the animation duration
    }
  }
</script>

<div class="page-holder !w-[90%] mt-4">
  <div
    class="flex flex-col w-full font-[400] h-full page overflow-x-hidden"
    class:page-exit={shouldShowExit}
  >
    <div
      class="flex flex-col gap-6 pb-16 mt-12 overflow-y-auto overflow-x-hidden px-4"
    >
      <!-- Search Input -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1 relative">
          <input
            type="text"
            bind:value={searchQuery}
            on:keydown={handleSearchKeydown}
            placeholder="Search Spotify..."
            class="{textClass} bg-green-600 w-full py-2 px-4 text-xl font-[300] outline-none transition-colors placeholder:text-white"
          />
        </div>
        <button
          class="{textClass} p-2 border-2 rounded-full border-2 border-green-600 bg-black transition-opacity flex items-center justify-center text-green-600"
          on:click={handleSearch}
        >
          <Icon icon="subway:search" width="20" height="20" class="text-green-600" />
        </button>
      </div>

      {#each menuItems as item}
        <button
          class="{textClass} text-4xl font-[200] text-left transition-opacity flex items-center gap-4 h-full"
          on:click={() => handleItemClick(item.route)}
        >
          <Icon icon={item.icon} width="40" height="40" />
          {item.label}
        </button>
      {/each}
    </div>
  </div>
</div>
