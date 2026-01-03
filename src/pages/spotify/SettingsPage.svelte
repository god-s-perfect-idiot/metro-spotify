<script>
  import { accentColorStore, textColorClassStore } from "../../utils/theme.js";

  export let isExiting = false;
  export let isLoading = false;

  $: accentColor = $accentColorStore;
  $: textClass = $textColorClassStore;
</script>

<div
  class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify</span>
  <span class="text-6xl font-[200] h-auto py-1 px-4">settings</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
   <div class="flex flex-col gap-1">
    <span class="text-lg font-[300] text-green-600">about app</span>
    <span class="text-sm font-[300] text-[#a1a1a1]">Metro Spotify v0.1.0</span>
   </div>
  </div>
</div>

