<script>
	import { goto } from '$app/navigation';
	
    export let isSystemApp = false;
    export let onRemove = () => {};
    export let onPinToHomescreen = () => {};

	const onAddNewFile = (event) => {
		event.stopPropagation();
		event.preventDefault();
		goto('/new/file');
	}

	const handlePinClick = (event) => {
		event.stopPropagation();
		event.preventDefault();
		// Close menu immediately before calling the callback
		onPinToHomescreen();
	}

	const handleRemoveClick = (event) => {
		event.stopPropagation();
		event.preventDefault();
		// Close menu immediately before calling the callback
		onRemove();
	}

	const handleBackdropClick = (event) => {
		// Stop propagation to prevent clicks from reaching items behind
		event.stopPropagation();
		// Don't prevent default - let the parent handle closing the menu
	}

</script>

<!-- Backdrop to prevent clicks from reaching items behind -->
<div
	class="fixed inset-0 z-[100] bg-transparent"
	on:click={handleBackdropClick}
	on:touchend={handleBackdropClick}
	on:mousedown={handleBackdropClick}
	role="presentation"
	aria-hidden="true"
	style="pointer-events: auto;"
></div>

<div
	class="app-menu-content animated-div bg-white w-full flex flex-col text-black font-[300] pl-4 pt-4 pb-16 gap-4 z-[101] absolute top-1 justify-start items-start"
	role="menu"
	aria-label="App context menu"
	style="pointer-events: auto;"
>
	<button 
		class="override-touch-controls" 
		on:click={onAddNewFile} 
		on:touchend={onAddNewFile}
		role="menuitem"
	>add new file</button>
	<button 
		class="override-touch-controls" 
		on:click={handlePinClick} 
		on:touchend={handlePinClick}
		role="menuitem"
	>pin to homescreen</button>
	{#if !isSystemApp}
        <button 
			class="override-touch-controls" 
			on:click={handleRemoveClick} 
			on:touchend={handleRemoveClick}
			role="menuitem"
		>remove</button>
    {/if}
</div>

<style>
	.animated-div {
		animation: expand 0.5s ease-in forwards;
		overflow: hidden;
		max-height: 0;
	}

	@keyframes expand {
		from {
			max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
		}
		to {
			max-height: 200px; /* Adjust this value based on your content */
            padding-top: 1rem;
            padding-bottom: 4rem;
		}
	}
</style>