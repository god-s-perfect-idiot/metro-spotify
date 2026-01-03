<script>
	import { onMount, onDestroy } from 'svelte';
	import { gridStore } from '../store/grid.js';
	import GridItem from './GridItem.svelte';
	import Icon from '@iconify/svelte';
	import { backgroundClassStore } from '../utils/theme';

	export let cols = 4;
	export let scrollContainer = null;

	// Calculate required rows based on items and their sizes
	let calculatedRows = 0;

	let gridContainer;
	let draggedItem = null;
	let dragOverPosition = null;
	let dragOverItemId = null;
	let editMode = false;
	let touchDragPosition = null;
	let isTouchDragging = false;
	let dropIndicatorPosition = null;
	let removingItemId = null;
	let autoScrollInterval = null;
	let autoScrollSpeed = 100; // pixels per frame
	
	// Get theme-aware background
	$: bgClass = $backgroundClassStore;

	// Subscribe to grid store
	$: gridState = $gridStore;
	$: editMode = gridState.editMode;
	$: selectedItemId = gridState.selectedItemId;
	$: items = gridState.items;

	// Debug edit mode changes
	$: console.log('GridContainer editMode changed:', editMode);

	// Calculate required rows based on items
	function calculateRequiredRows(items, cols) {
		if (!items || items.length === 0) return 0; // No rows if empty

		// Simulate CSS Grid auto-placement more accurately
		const grid = Array(cols).fill(0); // Track occupied cells per column
		let maxRow = 0;

		console.log('Calculating rows for', items.length, 'items with', cols, 'columns');

		for (const item of items) {
			const size = item.size || '1x1';
			const [width, height] = size.split('x').map(Number);

			console.log(`Placing item ${item.name} (${size}) - width: ${width}, height: ${height}`);

			// Find the first available position (CSS Grid auto-placement behavior)
			let bestRow = 0;
			let bestCol = 0;
			let found = false;

			// Try each row until we find a position that fits
			for (let row = 0; row <= maxRow + 2 && !found; row++) {
				for (let col = 0; col <= cols - width; col++) {
					// Check if this position is available
					let canPlace = true;
					for (let c = col; c < col + width; c++) {
						if (grid[c] > row) {
							canPlace = false;
							break;
						}
					}

					if (canPlace) {
						bestRow = row;
						bestCol = col;
						found = true;
						break;
					}
				}
			}

			// Place the item
			for (let col = bestCol; col < bestCol + width; col++) {
				grid[col] = bestRow + height;
			}

			maxRow = Math.max(maxRow, bestRow + height);
			console.log(`Placed at row ${bestRow}, col ${bestCol}. Max row now: ${maxRow}`);
		}

		// Return the actual maxRow needed (no minimum enforced)
		const result = maxRow;
		console.log('Final calculated rows:', result);
		return result;
	}

	// Reactive calculation of rows
	$: calculatedRows = calculateRequiredRows(items, cols);

	// Calculate row height to maintain square proportions
	// For 4 columns: ~90px per row, for 6 columns: proportionally smaller
	// Row height should scale inversely with column count to maintain square tiles
	$: rowHeight = Math.round(90 * (4 / cols));

	// Debug logging
	$: console.log(
		'Calculated rows:',
		calculatedRows,
		'Items:',
		items.length,
		'Item sizes:',
		items.map((i) => i.size),
		'Row height:',
		rowHeight,
		'Columns:',
		cols
	);

	// Update grid size when calculatedRows changes
	$: if (calculatedRows) {
		gridStore.setGridSize(cols, calculatedRows);
	}

	// Initialize grid size
	onMount(() => {
		// Load items from homescreen store (localStorage)
		gridStore.loadFromHomescreen();
	});

	// Handle long press to enter edit mode
	function handleLongPress(event) {
		const itemId = event.detail.itemId;
		gridStore.setSelectedItem(itemId);
		gridStore.setEditMode(true);
	}

	// Handle item click (select item in edit mode or exit edit mode)
	function handleItemClick(event) {
		if (editMode) {
			// If clicking on an item, select it
			const itemId = event.detail.itemId;
			if (itemId) {
				gridStore.setSelectedItem(itemId);
			} else {
				// If clicking outside items, exit edit mode
				gridStore.setEditMode(false);
			}
		}
	}

	// Handle item removal
	function handleItemRemove(event) {
		const itemId = event.detail.itemId;
		removingItemId = itemId;

		// Remove item after animation completes
		setTimeout(() => {
			gridStore.removeItem(itemId);
			removingItemId = null;
		}, 300); // Slightly longer to ensure animation completes
	}

	// Handle grid background click (exit edit mode)
	function handleGridClick(event) {
		if (editMode) {
			// Check if click was on a grid item or button
			const target = event.target.closest('.grid-item, button');
			if (!target) {
				gridStore.setEditMode(false);
			}
		}
	}

	// Handle drag start
	function handleDragStart(event) {
		draggedItem = event.detail.item;
		gridStore.setDraggedItem(draggedItem.id);

		// Check if this is a touch drag (will have touchPosition in subsequent events)
		isTouchDragging = false; // Will be set to true when touch move happens
		dropIndicatorPosition = null; // Clear any existing indicator
	}

	// Handle drag end
	function handleDragEnd(event) {
		// Handle touch drag end if we have touch position
		if (touchDragPosition) {
			handleTouchDragEnd();
		}

		// Stop auto-scrolling
		stopAutoScroll();

		gridStore.clearDragState();
		draggedItem = null;
		dragOverPosition = null;
		dragOverItemId = null;
		touchDragPosition = null;
		isTouchDragging = false;
		dropIndicatorPosition = null;
	}

	// Handle item drag over
	function handleItemDragOver(event) {
		if (!editMode || !draggedItem) return;

		const { item, touchPosition } = event.detail;
		dragOverItemId = item.id;

		// Store touch position for mobile drag
		if (touchPosition) {
			touchDragPosition = touchPosition;
			isTouchDragging = true;

			// Update drop indicator for touch drag
			updateDropIndicator(touchPosition);

			// Check for auto-scroll
			checkAutoScroll(touchPosition);
		}
	}

	// Handle auto-scroll check from touch drag
	function handleAutoScrollCheck(event) {
		if (!editMode || !draggedItem) return;

		const { touchPosition } = event.detail;
		if (touchPosition) {
			checkAutoScroll(touchPosition);
		}
	}

	// Handle drag over - simplified for flexbox
	function handleDragOver(event) {
		if (!editMode || !draggedItem) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';

		// Update drop indicator position
		updateDropIndicator({ x: event.clientX, y: event.clientY });

		// Check for auto-scroll
		checkAutoScroll({ x: event.clientX, y: event.clientY });
	}

	// Handle drop - simplified for flexbox
	function handleDrop(event) {
		if (!editMode || !draggedItem) return;
		event.preventDefault();

		// Check if dropping on an existing item or empty space
		const elementAtPoint = document.elementFromPoint(event.clientX, event.clientY);
		const targetGridItem = elementAtPoint?.closest('.grid-item');

		if (targetGridItem) {
			// Dropping on an existing item - handled by handleItemDrop
			return;
		} else {
			// Dropping in empty space
			const emptyPosition = findBestEmptyPosition({ x: event.clientX, y: event.clientY });
			if (emptyPosition !== -1) {
				gridStore.moveItemToPosition(draggedItem.id, emptyPosition);
			}
		}
	}

	// Handle item drop for reordering
	function handleItemDrop(event) {
		if (!editMode || !draggedItem) return;

		const { targetItem, draggedItemId } = event.detail;

		if (draggedItemId !== targetItem.id) {
			// Move the dragged item to the target position
			gridStore.moveItem(draggedItemId, targetItem.id);

			// Optional: Optimize layout after move to reduce gaps
			// gridStore.optimizeLayout();
		}
	}

	// Handle touch drag end - detect drop target
	function handleTouchDragEnd() {
		if (!editMode || !draggedItem || !touchDragPosition) return;

		// Find the item at the touch position
		const elementAtPoint = document.elementFromPoint(touchDragPosition.x, touchDragPosition.y);
		const targetGridItem = elementAtPoint?.closest('.grid-item');

		if (targetGridItem) {
			// Dropping on an existing item
			const targetItemId =
				targetGridItem.dataset.itemId ||
				targetGridItem.querySelector('[data-item-id]')?.dataset.itemId;

			if (targetItemId && targetItemId !== draggedItem.id) {
				// Move the dragged item to the target position
				gridStore.moveItem(draggedItem.id, targetItemId);
			}
		} else {
			// Dropping in empty space - find the best position
			const emptyPosition = findBestEmptyPosition(touchDragPosition);
			if (emptyPosition !== -1) {
				// Move the dragged item to the empty position
				gridStore.moveItemToPosition(draggedItem.id, emptyPosition);
			}
		}
	}

	// Find the best empty position based on actual DOM element positions
	function findBestEmptyPosition(touchPosition) {
		if (!gridContainer) return -1;

		// Get all grid items and their positions
		const gridItems = gridContainer.querySelectorAll('.grid-item');
		const itemPositions = Array.from(gridItems).map((item, index) => {
			const rect = item.getBoundingClientRect();
			const itemId = item.dataset.itemId;
			return {
				id: itemId,
				index: index,
				left: rect.left,
				right: rect.right,
				top: rect.top,
				bottom: rect.bottom,
				centerX: rect.left + rect.width / 2,
				centerY: rect.top + rect.height / 2
			};
		});

		// Sort items by their visual reading order (top to bottom, left to right)
		const sortedItems = itemPositions.sort((a, b) => {
			// First sort by row (top position) with some tolerance for flexbox
			const rowDiff = Math.abs(a.top - b.top);
			if (rowDiff > 30) {
				// Different rows
				return a.top - b.top;
			}
			// Then sort by column (left position)
			return a.left - b.left;
		});

		// Find the closest item to the touch position
		let closestItem = null;
		let minDistance = Infinity;

		for (const item of sortedItems) {
			const distance = Math.sqrt(
				Math.pow(touchPosition.x - item.centerX, 2) + Math.pow(touchPosition.y - item.centerY, 2)
			);

			if (distance < minDistance) {
				minDistance = distance;
				closestItem = item;
			}
		}

		if (!closestItem) {
			// No items found, place at the end
			return items.length;
		}

		// Find the visual position of the closest item in the sorted array
		const visualIndex = sortedItems.findIndex((item) => item.id === closestItem.id);

		// Determine if we should place before or after the closest item
		const isLeftOfCenter = touchPosition.x < closestItem.centerX;
		const isAboveCenter = touchPosition.y < closestItem.centerY;

		let targetVisualIndex;

		// Simplified positioning logic
		if (isLeftOfCenter || isAboveCenter) {
			// Left or above the item - place before it
			targetVisualIndex = visualIndex;
		} else {
			// Right or below the item - place after it
			targetVisualIndex = visualIndex + 1;
		}

		// Convert visual index back to DOM index for the indicator
		if (targetVisualIndex < sortedItems.length) {
			const targetItem = sortedItems[targetVisualIndex];
			return targetItem.index;
		} else {
			// Place at the end
			return items.length;
		}
	}

	// Update drop indicator position
	function updateDropIndicator(position) {
		if (!editMode || !draggedItem) return;

		// Find the best position for the drop indicator
		const bestPosition = findBestEmptyPosition(position);

		// Only show indicator if we're not hovering over the dragged item itself
		// and if the position is different from the dragged item's current position
		if (
			bestPosition !== -1 &&
			!isHoveringOverDraggedItem(position) &&
			bestPosition !== getCurrentDraggedItemIndex()
		) {
			dropIndicatorPosition = bestPosition;
		} else {
			dropIndicatorPosition = null;
		}
	}

	// Check if the position is over the currently dragged item
	function isHoveringOverDraggedItem(position) {
		if (!draggedItem) return false;

		const gridItems = gridContainer.querySelectorAll('.grid-item');
		for (const item of gridItems) {
			if (item.dataset.itemId === draggedItem.id) {
				const rect = item.getBoundingClientRect();
				return (
					position.x >= rect.left &&
					position.x <= rect.right &&
					position.y >= rect.top &&
					position.y <= rect.bottom
				);
			}
		}
		return false;
	}

	// Get the current index of the dragged item
	function getCurrentDraggedItemIndex() {
		if (!draggedItem) return -1;

		return items.findIndex((item) => item.id === draggedItem.id);
	}

	// Reactive statements for placeholder sizing
	$: placeholderGridColumn = draggedItem
		? (() => {
				const sizeMap = {
					'1x1': 'span 1',
					'2x2': 'span 2',
					'4x2': 'span 4'
				};
				return sizeMap[draggedItem.size] || sizeMap['1x1'];
			})()
		: 'span 1';

	$: placeholderGridRow = draggedItem
		? (() => {
				const sizeMap = {
					'1x1': 'span 1',
					'2x2': 'span 2',
					'4x2': 'span 2'
				};
				return sizeMap[draggedItem.size] || sizeMap['1x1'];
			})()
		: 'span 1';

	// Auto-scroll functionality
	function checkAutoScroll(position) {
		if (!scrollContainer || !draggedItem) return;

		const containerRect = scrollContainer.getBoundingClientRect();
		const maxScrollThreshold = 120; // pixels from edge to trigger auto-scroll

		// Calculate distance from edges
		const distanceFromTop = position.y - containerRect.top;
		const distanceFromBottom = containerRect.bottom - position.y;

		// Check if position is near edges
		const nearTop = distanceFromTop < maxScrollThreshold;
		const nearBottom = distanceFromBottom < maxScrollThreshold;

		// Stop existing auto-scroll
		stopAutoScroll();

		// Start auto-scroll if near edges with distance-based speed
		if (nearTop && scrollContainer.scrollTop > 0) {
			// Calculate speed based on how close to the edge (closer = faster)
			const speedMultiplier = Math.max(
				0.3,
				(maxScrollThreshold - distanceFromTop) / maxScrollThreshold
			);
			startAutoScroll('up', speedMultiplier);
		} else if (
			nearBottom &&
			scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight
		) {
			// Calculate speed based on how close to the edge (closer = faster)
			const speedMultiplier = Math.max(
				0.3,
				(maxScrollThreshold - distanceFromBottom) / maxScrollThreshold
			);
			startAutoScroll('down', speedMultiplier);
		}
	}

	function startAutoScroll(direction, speedMultiplier = 1) {
		if (autoScrollInterval) return;

		autoScrollInterval = setInterval(() => {
			if (!scrollContainer || !draggedItem) {
				stopAutoScroll();
				return;
			}

			// Apply speed multiplier for graceful acceleration
			const adjustedSpeed = autoScrollSpeed * speedMultiplier;
			const scrollAmount = direction === 'up' ? -adjustedSpeed : adjustedSpeed;
			scrollContainer.scrollTop += scrollAmount;

			// Stop if we've reached the limits
			if (
				(direction === 'up' && scrollContainer.scrollTop <= 0) ||
				(direction === 'down' &&
					scrollContainer.scrollTop >= scrollContainer.scrollHeight - scrollContainer.clientHeight)
			) {
				stopAutoScroll();
			}
		}, 8); // ~120fps for smoother, faster scrolling
	}

	function stopAutoScroll() {
		if (autoScrollInterval) {
			clearInterval(autoScrollInterval);
			autoScrollInterval = null;
		}
	}

	// Clean up on destroy
	onDestroy(() => {
		stopAutoScroll();
	});

	// No need for position-based functions with flexbox
</script>

<div class="grid-container w-full relative flex-1" bind:this={gridContainer}>
	<!-- Grid with Windows Phone 8.1 style -->
	<div
		class="grid w-full transition-all duration-300 ease-in-out p-4 relative z-10 {bgClass}"
		style="grid-template-columns: repeat({cols}, 1fr); grid-template-rows: repeat({calculatedRows}, minmax({rowHeight}px, auto)); gap: 12px;"
		on:click={handleGridClick}
		on:dragover={handleDragOver}
		role="grid"
		tabindex="0"
		on:keydown={(e) => e.preventDefault()}
	>
		<!-- Grid items -->
		{#each items as item, index (item.id)}
			<!-- Drop placeholder before this item -->
			{#if dropIndicatorPosition === index && editMode && draggedItem}
				<div
					class="drop-placeholder {draggedItem.bgColor} {bgClass} opacity-0 flex items-center justify-center"
					style="grid-column: {placeholderGridColumn}; grid-row: {placeholderGridRow};"
				>
					<Icon icon={draggedItem.icon} width="24" height="24" class="text-white opacity-50" />
				</div>
			{/if}

			<GridItem
				{item}
				{editMode}
				isSelected={selectedItemId === item.id}
				isDragging={draggedItem?.id === item.id}
				isDragOver={dragOverItemId === item.id && draggedItem?.id !== item.id}
				isRemoving={removingItemId === item.id}
				on:longPress={handleLongPress}
				on:click={handleItemClick}
				on:remove={handleItemRemove}
				on:dragStart={handleDragStart}
				on:dragEnd={handleDragEnd}
				on:dragOver={handleItemDragOver}
				on:autoScrollCheck={handleAutoScrollCheck}
				on:drop={handleItemDrop}
			/>
		{/each}

		<!-- Drop placeholder at the end -->
		{#if dropIndicatorPosition === items.length && editMode && draggedItem}
			<div
				class="drop-placeholder {draggedItem.bgColor} {bgClass} opacity-0 flex items-center justify-center"
				style="grid-column: {placeholderGridColumn}; grid-row: {placeholderGridRow};"
			>
				<Icon icon={draggedItem.icon} width="24" height="24" class="text-white opacity-50" />
			</div>
		{/if}
	</div>
</div>

<style>
	.grid-container {
		overflow: hidden;
	}

	.drop-placeholder {
		transition: all 200ms ease-in-out;
		pointer-events: none;
		user-select: none;
		min-height: 60px;
		min-width: 60px;
		border-radius: 0;
	}
	
</style>
