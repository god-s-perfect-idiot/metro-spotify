<script>
  import Icon from "@iconify/svelte";
  import Loader from "../../components/Loader.svelte";
  import { accentColorStore, textColorClassStore } from "../../utils/theme.js";

  export let isExiting = false;
  export let isLoading = false;
  export let currentUser = null;
  export let users = [];
  export let onUserClick = (user) => {};

  let tappedUserId = null;

  function handleUserTap(user) {
    // Create a unique ID for the user item
    const userId = `${user.id}-${user.display_name || user.id}`;
    tappedUserId = userId;

    // Reset after animation completes
    setTimeout(() => {
      tappedUserId = null;
    }, 200);
  }

  $: accentColor = $accentColorStore;
  $: textClass = $textColorClassStore;
</script>

<div
  class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
  class:page-exit={isExiting}
>
  <span class="text-base font-[500] h-fit px-4 uppercase mt-2">spotify people</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    {#if isLoading}
      <div class="flex flex-col gap-4 items-center justify-center my-24">
        <Loader />
      </div>
    {:else if !isLoading && (currentUser || users.length > 0)}
      {#if currentUser}
        {@const currentUserId = `${currentUser.id}-${currentUser.display_name || currentUser.id}`}
        <button
          class="flex flex-row gap-4 items-center w-full min-w-0 user-item"
          class:tapped={tappedUserId === currentUserId}
          on:click={() => {
            handleUserTap(currentUser);
            onUserClick(currentUser);
          }}
          on:touchstart={() => handleUserTap(currentUser)}
        >
          {#if currentUser.images && currentUser.images.length > 0}
            <img
              src={currentUser.images[0].url}
              alt={currentUser.display_name || currentUser.id}
              class="w-32 h-32 object-cover flex-shrink-0"
            />
          {:else}
            <div
              class="w-32 h-32 bg-gray-700 flex items-center justify-center flex-shrink-0"
            >
              <Icon
                icon="mdi:account"
                width="32"
                height="32"
                class="text-gray-400"
              />
            </div>
          {/if}

          <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
            <span
              class="text-2xl text-left font-[300] truncate w-full"
              title={currentUser.display_name || currentUser.id}
            >
              {currentUser.display_name || currentUser.id}
            </span>
          </div>
        </button>
      {/if}
      {#each users as user}
        {@const userId = `${user.id}-${user.display_name || user.id}`}
        <button
          class="flex flex-row gap-4 items-center w-full min-w-0 user-item"
          class:tapped={tappedUserId === userId}
          on:click={() => {
            handleUserTap(user);
            onUserClick(user);
          }}
          on:touchstart={() => handleUserTap(user)}
        >
          {#if user.images && user.images.length > 0}
            <img
              src={user.images[0].url}
              alt={user.display_name || user.id}
              class="w-12 h-12 object-cover flex-shrink-0"
            />
          {:else}
            <div
              class="w-12 h-12 bg-gray-700 flex items-center justify-center flex-shrink-0"
            >
              <Icon
                icon="mdi:account"
                width="32"
                height="32"
                class="text-gray-400"
              />
            </div>
          {/if}

          <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
            <span
              class="text-2xl text-left font-[300] truncate w-full"
              title={user.display_name || user.id}
            >
              {user.display_name || user.id}
            </span>
            <!-- <span
              class="text-gray-400 text-left text-base font-[300] truncate w-full"
              title={user.id}
            >
              {user.id}
            </span> -->
          </div>
        </button>
      {/each}
    {:else if !isLoading}
      <div class="text-center py-12 mx-4">
        <Icon
          icon="mdi:account-group"
          width="64"
          height="64"
          class="text-gray-500 mb-4"
        />
        <h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
          No People Found
        </h3>
        <p
          class="text-gray-400 font-[300] justify-start flex text-left text-lg"
        >
          Follow users on Spotify or follow playlists created by users to see them here.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .user-item {
    transition: transform 0.1s ease-out;
  }

  .user-item.tapped {
    transform: translate(2px, 2px);
  }
</style>

