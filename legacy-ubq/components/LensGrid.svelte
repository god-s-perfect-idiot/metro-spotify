<script>
	import { lensStore } from '../store/lenses';
	import { addToast } from '../store/toast';
	import { backgroundClassStore, textColorClassStore, accentColorStore } from '../utils/theme';
	import Icon from '@iconify/svelte';

	export let open = false;
	export let onClose = () => {};
	export let onSelect = (lens) => {};
	export let onHide = () => {};

	let isVisible = false;
	let isSlidingOut = false;

	$: bgClass = $backgroundClassStore;
	$: textClass = $textColorClassStore;
	$: accentColor = $accentColorStore;

	// Reactive subscription to lens store
	$: lensState = $lensStore;
	$: lenses = lensState.lenses || [];
	$: selectedLensId = lensState.selectedLensId || 'default';

	$: if (open) {
		isVisible = true;
		isSlidingOut = false;
	}

	function handleClose() {
		// Just close immediately - no animation needed here
		isVisible = false;
		isSlidingOut = false;
	}

	function slideOutAndClose() {
		// First slide out individual tiles to the right
		isSlidingOut = true;

		// Immediately notify parent to start bringing viewport back in
		// This prevents the stuck/paused look
		onClose();

		// After slide out animation completes (including staggered delays), actually hide the grid
		const maxDelay = (lenses.length - 1) * 30;
		setTimeout(() => {
			onHide();
			handleClose();
		}, 300 + maxDelay); // Animation duration + max delay
	}

	function handleLensSelect(lens) {
		lensStore.selectLens(lens.id);
		onSelect(lens);
		slideOutAndClose();
	}

	function handleAddLens() {
		// Placeholder for marketplace integration
		addToast('coming soon');
	}

	function handleBackButton() {
		slideOutAndClose();
	}
</script>

{#if isVisible}
	<div class="fixed inset-0 z-[200]">
		<div
			class="flex flex-col h-full w-full bg-black"
			role="dialog"
			aria-modal="true"
			aria-label="Select lens"
		>
			<!-- Back button in top right -->
			<button
				on:click={handleBackButton}
				class="ml-4 mt-4 z-10 w-10 h-10 rounded-full border boder-white border-2 p-2 flex items-center justify-center hover:bg-opacity-70 transition-all"
				aria-label="Close lens selector"
			>
				<Icon icon="subway:left-arrow" width="24" height="24" class="text-white" />
			</button>

			<!-- Main content area with grid -->
			<div class="flex-1 flex flex-col h-full items-center justify-start px-6 py-8 relative">
				<div class="grid grid-cols-2 gap-3 w-full lens-grid">
					{#each lenses as lens, i (lens.id)}
						{@const tileBgColor = lens.bgColor || accentColor}
						{@const hasBgImage = lens.bgImage}
						<div class="flex flex-col items-center">
							<button
								class="lens-tile aspect-square flex items-center justify-center w-full lens-item-slide"
								class:slide-out={isSlidingOut}
								class:has-bg-image={hasBgImage}
								class:selected={selectedLensId === lens.id}
								style="animation-delay: {isSlidingOut
									? (lenses.length - i - 1) * 30
									: i * 30}ms; {hasBgImage
									? `background-image: url(${lens.bgImage}); background-size: cover; background-position: center;`
									: `background-color: ${tileBgColor};`}"
								on:click={() => handleLensSelect(lens)}
								aria-label="Select {lens.name} lens"
							>
								{#if !hasBgImage}
									<Icon
										icon={lens.icon || 'iconoir:lens'}
										width="48"
										height="48"
										class="text-white"
									/>
								{:else}
									<div class="bg-black bg-opacity-40 absolute inset-0 w-full h-full" />
								{/if}
								<span
									class="absolute left-2 bottom-2 text-white text-base font-medium mt-1 text-center lens-label-slide"
									class:slide-out={isSlidingOut}
									style="animation-delay: {isSlidingOut ? (lenses.length - i - 1) * 30 : i * 30}ms;"
									>{lens.name}</span
								>
							</button>
						</div>
					{/each}

					<!-- Empty slots to fill 3x3 grid (9 total) -->
					{#each Array(Math.max(0, 9 - lenses.length)) as _, i}
						<div class="flex flex-col items-center">
							<div class="lens-tile aspect-square lens-tile-blue lens-tile-empty"></div>
						</div>
					{/each}
				</div>
			</div>

			<!-- "find more lenses" text at bottom -->
			<div class="px-6 pb-6 text-left">
				<button
					on:click={handleAddLens}
					class="text-white text-2xl font-[300] hover:opacity-70 transition-opacity"
				>
					find more lenses
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.lens-grid {
		perspective: 1000px;
		perspective-origin: center center;
	}

	.lens-item-slide {
		animation: slideInFromRight 0.3s ease-out forwards;
		transform: translateX(100%);
		opacity: 0;
	}

	.lens-item-slide.slide-out {
		animation: slideOutToRight 0.3s ease-in forwards;
	}

	.lens-label-slide {
		animation: slideInFromRight 0.3s ease-out forwards;
		transform: translateX(100%);
		opacity: 0;
	}

	.lens-label-slide.slide-out {
		animation: slideOutToRight 0.3s ease-in forwards;
	}

	@keyframes slideInFromRight {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@keyframes slideOutToRight {
		from {
			transform: translateX(0);
			opacity: 1;
		}
		to {
			transform: translateX(100%);
			opacity: 0;
		}
	}

	.lens-tile {
		border-radius: 0;
		position: relative;
		overflow: hidden;
	}

	.lens-tile.has-bg-image {
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.lens-tile-blue {
		background-color: #0078d4;
	}

	.lens-tile-empty {
		opacity: 0.6;
	}

	.lens-tile:hover {
		opacity: 0.9;
		transform: scale(0.95);
	}

	.lens-tile:active {
		transform: scale(0.9);
	}

	.lens-tile.selected {
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
		opacity: 1;
	}
</style>
