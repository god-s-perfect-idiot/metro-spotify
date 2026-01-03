<script>
	import { tick } from 'svelte';
	import { accentColorStore } from '../utils/theme.js';

	// Props
	export let items = []; // Array of items to check against for highlighting
	export let itemNameKey = 'name'; // Key to use for getting the name from items
	export let showGrid = false;
	export let isExiting = false;
	export let onLetterClick = null; // Callback function for letter clicks
	
	// Get accent color reactively
	$: accentColor = $accentColorStore;

	// Touch gesture detection variables
	let touchStartY = 0;
	let touchStartX = 0;
	let touchEndY = 0;
	let touchEndX = 0;
	const TOUCH_THRESHOLD = 10; // pixels - if movement exceeds this, it's a scroll, not a tap

	// Grid configuration
	const grid = [
		'#',
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'h',
		'i',
		'j',
		'k',
		'l',
		'm',
		'n',
		'o',
		'p',
		'q',
		'r',
		's',
		't',
		'u',
		'v',
		'w',
		'x',
		'y',
		'z'
	];

	// Check if a letter has associated items
	function hasItemsForLetter(char) {
		return items.some(item => {
			const name = typeof item === 'string' ? item : item[itemNameKey];
			return name && name.charAt(0).toLowerCase() === char;
		});
	}

	// Touch gesture handlers
	function handleTouchStart(event) {
		touchStartY = event.touches[0].clientY;
		touchStartX = event.touches[0].clientX;
	}

	function handleTouchEnd(event) {
		touchEndY = event.changedTouches[0].clientY;
		touchEndX = event.changedTouches[0].clientX;
	}

	function isTap() {
		const deltaY = Math.abs(touchEndY - touchStartY);
		const deltaX = Math.abs(touchEndX - touchStartX);
		return deltaY < TOUCH_THRESHOLD && deltaX < TOUCH_THRESHOLD;
	}

	// Handle letter click
	async function handleClick(char, event) {
		if (hasItemsForLetter(char)) {
			event.preventDefault(); // Prevent immediate navigation
			
			if (onLetterClick) {
				onLetterClick(char);
			}
		}
	}

	// Handle letter tap with gesture detection
	function handleLetterTap(char, event) {
		if (isTap() && hasItemsForLetter(char)) {
			event.preventDefault();
			
			if (onLetterClick) {
				onLetterClick(char);
			}
		}
	}
</script>

{#if showGrid}
	<div class="flex justify-center items-center my-6 w-full">
		<div class="grid grid-cols-4 gap-4 w-full max-w-md mx-4">
			{#each grid as char, index}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<a
					href={`#${char.toUpperCase()}`}
					class={`aspect-square text-4xl justify-start items-end flex ${
						isExiting ? 'flip-out' : 'flip-in'
					} ${hasItemsForLetter(char) ? '' : 'bg-[#121212]'}`}
					style="animation-delay: {isExiting ? (grid.length - index) * 10 : index * 10}ms; {hasItemsForLetter(char) ? `background-color: ${accentColor};` : ''}"
					on:click={(event) => handleClick(char, event)}
					on:touchstart={handleTouchStart}
					on:touchend={(event) => {
						handleTouchEnd(event);
						handleLetterTap(char, event);
					}}
				>
					<span class="pl-1 pb-1">{char}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	.flip-in {
		animation: flipIn 0.2s ease-out backwards;
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}

	.flip-out {
		animation: flipOut 0.2s ease-in forwards;
	}

	@keyframes flipIn {
		from {
			transform: rotateX(90deg);
			opacity: 0;
		}
		to {
			transform: rotateX(0);
			opacity: 1;
		}
	}

	@keyframes flipOut {
		from {
			transform: rotateX(0);
			opacity: 1;
		}
		to {
			transform: rotateX(90deg);
			opacity: 0;
		}
	}
</style>