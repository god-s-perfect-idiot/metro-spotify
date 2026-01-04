<script>
  import { accountsStore } from "../store/accounts.js";
  import PlayQueuePageComponent from "./spotify/PlayQueuePage.svelte";

  export let isExiting = false;

  // Note: Authentication check is handled by App.svelte
</script>

<div class="page-holder">
  <PlayQueuePageComponent {isExiting} />
</div>

