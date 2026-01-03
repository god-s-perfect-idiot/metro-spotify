<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { backgroundThemeStore, textColorClassStore } from '../utils/theme';

	export let children = [];
	export let expanded = false;
	export let unmounting = false;

	const dispatch = createEventDispatcher();
	
	let isMounted = false;
	
	$: backgroundTheme = $backgroundThemeStore;
	$: textClass = $textColorClassStore;
	// Invert: use #dedede in light mode, dark gray in dark mode
	$: bottomBarBg = backgroundTheme === 'light' ? '#dedede' : '#1f1f1f';

	onMount(() => {
		// Add a small delay to ensure the initial state is properly set
		setTimeout(() => {
			isMounted = true;
		}, 100);
	});

	function toggleExpanded() {
		// Dispatch event to parent instead of managing local state
		dispatch('toggle', { expanded: !expanded });
	}
</script>

<div class="fixed bottom-0 left-0 right-0 z-50" style="background-color: {bottomBarBg};">
	<!-- Toggle Button (Always visible) -->
	<div class="right-4 absolute top-0 z-10">
		<button
			on:click={toggleExpanded}
			class="{textClass} transition-colors duration-200 leading-none font-[600] cursor-pointer"
			aria-label="Toggle bottom controls"
		>
            <i class="fa-solid fa-ellipsis text-4xl"></i>
		</button>
	</div>
	<!-- Bottom Controls Bar -->
	<div
		class="bottom-bar-container overflow-hidden flex justify-center items-center"
		class:initial={!isMounted}
		class:mounted={isMounted && !expanded && !unmounting}
		class:expanded={isMounted && expanded && !unmounting}
		class:unmounting={unmounting}
		data-expanded={expanded}
		data-classes="collapsed:{!expanded} expanded:{expanded}"
	>
		<!-- Content Container -->
		<div class="px-4 py-2 w-full flex justify-center items-center">
			<!-- Children Content -->
			<div class="transition-opacity duration-300 w-full" class:opacity-0={!expanded} class:opacity-100={expanded}>
				<slot />
			</div>
		</div>
	</div>
</div>

<style>
    .bottom-bar-container {
        transition: height 0.3s ease-in-out;
        height: 0px;
        overflow: hidden;
    }
    
    .bottom-bar-container.initial {
        height: 0px !important;
    }
    
    .bottom-bar-container.mounted {
        height: 40px !important;
    }
    
    .bottom-bar-container.expanded {
        height: 80px !important;
    }

    .bottom-bar-container.unmounting {
        height: 0px !important;
    }
</style>
