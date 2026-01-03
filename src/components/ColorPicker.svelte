<script>
	export let colors = []; // Array of color objects with { name, hex }
	export let open = false; // Control open/close state from parent

	// Emit event when color is selected
	import { createEventDispatcher } from 'svelte';
	import { backgroundClassStore, textColorClassStore } from '../utils/theme';
	const dispatch = createEventDispatcher();

	let isExiting = false;
	let isVisible = false;
	export let className = '';
	
	// Get theme-aware classes reactively
	$: bgClass = $backgroundClassStore;
	$: textClass = $textColorClassStore;

	// Track visibility to keep component mounted during exit animation
	$: if (open && !isExiting) {
		isVisible = true;
	}

	// Handle parent closing the picker
	$: if (!open && isVisible && !isExiting) {
		isExiting = true;
		const maxDelay = (colors.length - 1) * 10;
		setTimeout(() => {
			isExiting = false;
			isVisible = false; // Allow component to be removed
		}, 300 + maxDelay);
	}

	function handleColorSelect(color) {
		dispatch('colorSelected', color);
		isExiting = true;
		// Close after exit animation completes (0.3s duration + max delay)
		const maxDelay = (colors.length - 1) * 10;
		setTimeout(() => {
			open = false;
			isExiting = false;
			isVisible = false; // Allow component to be removed
		}, 300 + maxDelay);
	}
</script>

{#if open || isVisible}
	<div
		class="fixed inset-0 z-[200] {bgClass} flex flex-col {className}"
		style="background-color: {bgClass === 'bg-white' ? '#ffffff' : '#000000'};"
		role="dialog"
		aria-modal="true"
		aria-label="Color picker"
	>
		<div class="flex justify-between items-center">
			<span class="{textClass} text-xl font-[500]">ACCENTS</span>
		</div>
		<div class="flex-1 flex items-start mt-12 mb-6 justify-center">
			<div class="grid grid-cols-4 gap-3 w-full max-w-md color-grid">
				{#each colors as color, i (color.hex)}
					<button
						class="aspect-square transition-opacity {isExiting ? 'flip-out' : 'flip-in'}"
						style="background-color: {color.hex}; animation-delay: {isExiting ? (colors.length - i - 1) * 10 : i * 5}ms;"
						on:click={() => handleColorSelect(color)}
						aria-label="Select {color.name} color"
					>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.color-grid {
		perspective: 1000px;
		perspective-origin: center center;
	}

	.flip-in {
		animation: flipIn 0.3s ease-out backwards;
		backface-visibility: hidden;
		transform-style: preserve-3d;
		transform-origin: center center;
		will-change: transform, opacity;
	}

	.flip-out {
		animation: flipOut 0.3s ease-out forwards;
		backface-visibility: hidden;
		transform-style: preserve-3d;
		transform-origin: center center;
		will-change: transform, opacity;
	}

	@keyframes flipIn {
		from {
			transform: rotateX(90deg) scaleY(0.3);
			opacity: 0;
		}
		to {
			transform: rotateX(0deg) scaleY(1);
			opacity: 1;
		}
	}

	@keyframes flipOut {
		from {
			transform: rotateX(0deg) scaleY(1);
			opacity: 1;
		}
		to {
			transform: rotateX(-90deg) scaleY(0.3);
			opacity: 0;
		}
	}
</style>
