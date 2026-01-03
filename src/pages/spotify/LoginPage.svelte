<script>
  import Icon from "@iconify/svelte";
  import { textColorClassStore } from "../../utils/theme.js";

  export let isExiting = false;
  export let onSetupClick = () => {};

  $: textClass = $textColorClassStore;
</script>

<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
  <img
    src="/logo.png"
    alt="Metro Spotify"
    class="h-32 w-32 object-contain absolute top-[-1rem] left-[-3rem]"
  />

  <div class="flex items-center gap-4 h-[10%] px-4">
    <span class="text-[6rem] font-[200] whitespace-nowrap pl-16 mt-6">spotify</span>
  </div>
  <div class="flex-1 flex flex-col items-start justify-center px-4">
    <div class="max-w-md">
      <Icon
        icon="mdi:music"
        width="150"
        height="150"
        class="text-green-600 mb-6"
      />
      <h2 class="text-3xl font-[300] mb-4">Connect Your Spotify Account</h2>
      <p class="text-gray-400 mb-8 font-[300] text-xl">
        Connect your Spotify account to access your liked songs and music
        library.
      </p>
      <button
        on:click={onSetupClick}
        class="px-4 py-2 bg-green-600 hover:bg-green-600 {textClass} font-medium text-lg transition-colors"
      >
        Connect with Spotify
      </button>
    </div>
  </div>
</div>
