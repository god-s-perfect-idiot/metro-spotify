<script>
  import { router } from "../lib/router.js";
  import { addToast } from "../store/toast.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";

  export let isExiting = false;
  export let onBeforeNavigate = () => {}; // Callback to notify parent before navigation
  
  let internalIsExiting = false;

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;
  
  // Use internal exit state if we have it, otherwise use the prop
  // But if onBeforeNavigate is provided, don't use internal exit (parent will handle it)
  $: shouldShowExit = onBeforeNavigate ? isExiting : (internalIsExiting || isExiting);

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
    if (route === "/play-queue") {
        addToast("coming soon");
        return;
    }
    
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
