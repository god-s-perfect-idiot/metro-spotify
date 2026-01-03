<script>
  import { router } from "../lib/router.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";

  export let isExiting = false;

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;

  const menuItems = [
    {
      id: "now-playing",
      label: "now playing",
      route: "/now-playing",
      icon: "ic:sharp-headphones",
    },
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
    router.goto(route);
  }
</script>

<div class="page-holder">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
  >
  <img
    src="/logo.png"
    alt="Metro Spotify"
    class="h-32 w-32 object-contain absolute top-[-2rem] left-[-3rem]"
  />

  <div class="flex items-center gap-4 h-[10%] px-4">
    <span class="text-[6rem] font-[200] whitespace-nowrap pl-16">spotify</span>
  </div>

  <div
    class="flex flex-col gap-6 pb-16 mt-12 overflow-y-auto overflow-x-hidden px-4"
  >
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
