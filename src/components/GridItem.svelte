<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { gridStore } from '../store/grid.js';
	import { appInfoStore } from '../store/appInfo.js';
	import { getFaviconUrl, getAppBackgroundColor } from '../kernel/favicon-utils.js';
	import { accentColorStore, getAccentColor, textColorClassStore, backgroundClassStore, borderColorClassStore, backgroundThemeStore } from '../utils/theme';
	import LiveClock from '../routes/clock/Live.svelte';
	import LiveWeather from '../routes/weather/Live.svelte';
	import LivePhotos from '../routes/photos/Live.svelte';
	import LiveMusic from '../routes/music/Live.svelte';
	import LiveSpotify from '../routes/spotify/Live.svelte';

	export let item;
	export let editMode = false;
	export let isSelected = false;
	export let isDragging = false;
	export let isDragOver = false;
	export let isRemoving = false;

	const dispatch = createEventDispatcher();

	let isPressed = false;
	let pressTimer = null;
	let dragStartPosition = null;
	let isDraggingTouch = false;
	let dragOffset = { x: 0, y: 0 };
	let currentPosition = { x: 0, y: 0 };
	let hasMoved = false;
	let dragThreshold = 10; // Minimum pixels to move before considering it a drag
	let draggingElement = null;
	let dragElementPosition = { x: 0, y: 0 };
	let wasSelected = false;
	let isDeselecting = false;
	let isSelecting = false;
	let previousEditMode = false;
	let animationPattern = 0;
	let animationDelay = 0;
	let animationDuration = 6;
	
	// Live tile flip animation state
	let isFlipping = false;
	let flipDirection = 'up'; // 'up' or 'down'
	let flipAnimationTimer = null;
	
	// Get accent color reactively
	$: accentColor = $accentColorStore;
	$: textColorClass = $textColorClassStore;
	$: bgClass = $backgroundClassStore;
	$: borderClass = $borderColorClassStore;
	$: backgroundTheme = $backgroundThemeStore;

	// Track selection state changes for smooth animations
	$: {
		// Handle selection animation
		if (editMode && isSelected && !wasSelected) {
			isSelecting = true;
			setTimeout(() => {
				isSelecting = false;
			}, 300);
		}

		// Handle deselection animation
		if (editMode && !isSelected && wasSelected) {
			isDeselecting = true;
			setTimeout(() => {
				isDeselecting = false;
			}, 300);
		}

		// Update previous states
		wasSelected = isSelected;
		previousEditMode = editMode;
	}

	// Debug: Log when editMode changes
	$: console.log(`Item ${item.id}: editMode = ${editMode}`);

	// Also subscribe directly to grid store for edit mode
	$: storeEditMode = $gridStore.editMode;
	$: console.log(`Item ${item.id}: storeEditMode = ${storeEditMode}`);

	// Reactive icon size based on edit mode
	$: iconSize = editMode ? 36 : 48;
	$: console.log('EditMode changed:', editMode, 'IconSize:', iconSize);

	// Function to get icon size
	function getIconSize() {
		return editMode ? 36 : 48;
	}

	// Handle mouse down for long press detection
	function handleMouseDown(event) {
		if (editMode) {
			// In edit mode, don't prevent default to allow drag to work
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		isPressed = true;
		dragStartPosition = { x: event.clientX, y: event.clientY };

		// Start long press timer
		pressTimer = setTimeout(() => {
			if (isPressed) {
				dispatch('longPress', { itemId: item.id });
			}
		}, 500); // 500ms for long press
	}

	// Handle mouse up
	function handleMouseUp(event) {
		if (editMode) {
			// In edit mode, don't interfere with drag operations
			isPressed = false;
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			}
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		isPressed = false;
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	}

	// Handle mouse leave
	function handleMouseLeave(event) {
		if (editMode) {
			// In edit mode, don't interfere with drag operations
			isPressed = false;
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			}
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		isPressed = false;
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	}

	// Handle touch start for mobile
	function handleTouchStart(event) {
		// Check if touch is on a button - if so, don't handle long press
		const target = event.target.closest('button');
		if (target) {
			return;
		}

		const touch = event.touches[0];
		dragStartPosition = { x: touch.clientX, y: touch.clientY };
		currentPosition = { x: touch.clientX, y: touch.clientY };
		hasMoved = false;
		isPressed = true;

		// Start long press timer
		pressTimer = setTimeout(() => {
			if (isPressed && !hasMoved) {
				// Only prevent default when we're actually doing a long press
				event.preventDefault();
				dispatch('longPress', { itemId: item.id });
			}
		}, 500); // 500ms for long press
	}

	// Handle touch move
	function handleTouchMove(event) {
		if (!isPressed) return;

		const touch = event.touches[0];
		currentPosition = { x: touch.clientX, y: touch.clientY };

		// Calculate distance moved from start position
		const deltaX = currentPosition.x - dragStartPosition.x;
		const deltaY = currentPosition.y - dragStartPosition.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Only handle dragging in edit mode
		if (editMode) {
			// In edit mode, prevent scrolling for any movement to avoid conflicts
			event.preventDefault();
			event.stopPropagation();

			// If moved enough, start dragging
			if (distance > dragThreshold && !isDraggingTouch) {
				hasMoved = true;
				isDraggingTouch = true;

				// Create dragging element
				createDraggingElement();

				// Dispatch drag start to show visual feedback
				dispatch('dragStart', { item });
			}

			if (isDraggingTouch) {
				// Update dragging element position
				updateDraggingElementPosition(currentPosition);

				// Dispatch drag over event for visual feedback
				dispatch('dragOver', { item, event, touchPosition: currentPosition });

				// Also dispatch a custom event for auto-scroll
				dispatch('autoScrollCheck', { touchPosition: currentPosition });
			}
		} else {
			// In non-edit mode, just track if we've moved enough to cancel long press
			if (distance > dragThreshold) {
				hasMoved = true;
			}
		}
	}

	// Handle touch end
	function handleTouchEnd(event) {
		// Check if touch is on a button - if so, don't handle touch end
		const target = event.target.closest('button');
		if (target) {
			return;
		}

		if (isDraggingTouch && editMode) {
			event.preventDefault();
			event.stopPropagation();
			cleanup();
			dispatch('dragEnd', { item });
			hasMoved = false;
			return;
		}

		if (editMode && isPressed && !hasMoved) {
			// This was a tap in edit mode - select the item
			event.preventDefault();
			event.stopPropagation();
			dispatch('click', { itemId: item.id });
			isPressed = false;
			return;
		}

		// Clean up state without preventing default for scrolling
		isPressed = false;
		hasMoved = false;
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	}

	// Handle click
	function handleClick(event) {
		// Check if click is on an edit control button - if so, don't handle selection
		const target = event.target.closest('button');
		if (target && editMode) {
			// Don't change selection when clicking edit controls
			return;
		}

		// Check if click is on a live tile with interactive controls (like music controls)
		// Don't navigate if clicking on interactive elements within the live tile
		if (shouldShowLiveTile && LiveComponent) {
			const liveTileButton = event.target.closest('button');
			if (liveTileButton) {
				// Click is on a button within the live tile (like play/pause), don't navigate
				return;
			}
		}

		if (editMode) {
			// In edit mode, clicking on the item selects it
			event.preventDefault();
			event.stopPropagation();
			dispatch('click', { itemId: item.id });
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		// If it was a long press, don't trigger click
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
			return;
		}

		// Only trigger click if it wasn't a long press
		if (!isPressed) {
			// Check if the URL is external (starts with http:// or https://)
			if (item.src && (item.src.startsWith('http://') || item.src.startsWith('https://'))) {
				// External URL - use window.location
				window.location.href = item.src;
			} else if (item.src) {
				// Internal route - use SvelteKit's goto for client-side navigation
				goto(item.src);
			}
		}
	}

	// Handle keyboard events
	function handleKeyDown(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick(event);
		}
	}

	// Handle resize button click
	function handleResize() {
		// Only allow resize if this item is selected
		if (isSelected) {
			console.log(`Resizing item ${item.id} from ${item.size} to next size`);
			gridStore.updateItemSize(item.id);
		}
	}

	// Handle remove button click
	function handleRemove() {
		// Dispatch remove event to parent
		dispatch('remove', { itemId: item.id });
	}

	// Handle drag start
	function handleDragStart(event) {
		if (!editMode) return;

		event.dataTransfer.setData('text/plain', item.id);
		event.dataTransfer.effectAllowed = 'move';

		dispatch('dragStart', { item });
	}

	// Create dragging element
	function createDraggingElement() {
		if (draggingElement) return;

		// Get the actual item dimensions
		const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
		const rect = itemElement ? itemElement.getBoundingClientRect() : { width: 80, height: 80 };

		// Create dragging element that matches the actual item
		draggingElement = document.createElement('div');
		// Use reactive bgColor, with fallback to accent color
		const dragBgColor = bgColor || $accentColorStore;
		draggingElement.className = 'grid-item-drag absolute pointer-events-none z-50 text-white';
		if (dragBgColor.startsWith('#')) {
			draggingElement.style.backgroundColor = dragBgColor;
		} else {
			draggingElement.className += ` ${dragBgColor}`;
		}
		draggingElement.style.width = `${rect.width}px`;
		draggingElement.style.height = `${rect.height}px`;
		draggingElement.style.transform = 'scale(0.9)';
		draggingElement.style.opacity = '0.8';
		draggingElement.style.display = 'flex';
		draggingElement.style.alignItems = 'center';
		draggingElement.style.justifyContent = 'center';
		draggingElement.style.flexDirection = 'column';
		draggingElement.style.padding = '8px';
		draggingElement.style.boxSizing = 'border-box';

		// Create the icon element - use same logic as main display
		const iconElement = document.createElement('div');
		iconElement.style.width = '48px';
		iconElement.style.height = '48px';
		iconElement.style.display = 'flex';
		iconElement.style.alignItems = 'center';
		iconElement.style.justifyContent = 'center';
		
		// Use icon URL if available (image icon), otherwise use Iconify
		if (iconSrc) {
			const img = document.createElement('img');
			img.src = iconSrc;
			img.alt = `${item.name} icon`;
			img.style.width = '48px';
			img.style.height = '48px';
			img.style.objectFit = 'contain';
			img.onerror = () => {
				// Fallback to Iconify if image fails - use Iconify CDN API with CSS filter for color
				img.style.display = 'none';
				const iconName = item.icon || 'mdi:application';
				const iconParts = iconName.split(':');
				if (iconParts.length === 2) {
					const [prefix, name] = iconParts;
					const isLightBg = (dragBgColor && dragBgColor.startsWith('#') && isWhiteOrLightColor(dragBgColor)) || (dragBgColor && (dragBgColor.includes('white') || dragBgColor === 'bg-white'));
					const iconifyUrl = `https://api.iconify.design/${prefix}/${name}.svg?width=48&height=48`;
					const iconifyImg = document.createElement('img');
					iconifyImg.src = iconifyUrl;
					iconifyImg.style.width = '48px';
					iconifyImg.style.height = '48px';
					iconifyImg.style.objectFit = 'contain';
					// Use CSS filter to make icon white or black based on background
					// brightness(0) makes it black, brightness(0) invert(1) makes it white
					iconifyImg.style.filter = isLightBg ? 'brightness(0)' : 'brightness(0) invert(1)';
					iconElement.appendChild(iconifyImg);
				}
			};
			iconElement.appendChild(img);
		} else {
			// Use Iconify icon - use Iconify CDN API with CSS filter for color
			const iconName = item.icon || 'mdi:application';
			const iconParts = iconName.split(':');
			if (iconParts.length === 2) {
				const [prefix, name] = iconParts;
				const isLightBg = (dragBgColor && dragBgColor.startsWith('#') && isWhiteOrLightColor(dragBgColor)) || (dragBgColor && (dragBgColor.includes('white') || dragBgColor === 'bg-white'));
				const iconifyUrl = `https://api.iconify.design/${prefix}/${name}.svg?width=48&height=48`;
				const iconifyImg = document.createElement('img');
				iconifyImg.src = iconifyUrl;
				iconifyImg.style.width = '48px';
				iconifyImg.style.height = '48px';
				iconifyImg.style.objectFit = 'contain';
				// Use CSS filter to make icon white or black based on background
				// brightness(0) makes it black, brightness(0) invert(1) makes it white
				iconifyImg.style.filter = isLightBg ? 'brightness(0)' : 'brightness(0) invert(1)';
				iconElement.appendChild(iconifyImg);
			}
		}
		
		draggingElement.appendChild(iconElement);

		// Add item name if it's not 1x1
		if (item.size !== '1x1') {
			const nameElement = document.createElement('div');
			nameElement.textContent = item.name;
			nameElement.style.fontSize = '16px';
			nameElement.style.fontWeight = '500';
			nameElement.style.textAlign = 'left';
			nameElement.style.position = 'absolute';
			nameElement.style.bottom = '8px';
			nameElement.style.left = '8px';
			nameElement.style.padding = '0';
			nameElement.style.margin = '0';
			draggingElement.appendChild(nameElement);
		}

		document.body.appendChild(draggingElement);

		// Set initial position (centered on cursor)
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		dragElementPosition = { x: currentPosition.x - centerX, y: currentPosition.y - centerY };
		draggingElement.style.left = `${dragElementPosition.x}px`;
		draggingElement.style.top = `${dragElementPosition.y}px`;
	}

	// Update dragging element position
	function updateDraggingElementPosition(position) {
		if (!draggingElement) return;

		// Get the current dimensions of the dragging element
		const rect = draggingElement.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		dragElementPosition = { x: position.x - centerX, y: position.y - centerY };
		draggingElement.style.left = `${dragElementPosition.x}px`;
		draggingElement.style.top = `${dragElementPosition.y}px`;
	}

	// Remove dragging element
	function removeDraggingElement() {
		if (draggingElement) {
			document.body.removeChild(draggingElement);
			draggingElement = null;
		}
	}

	// Handle drag end
	function handleDragEnd() {
		isDraggingTouch = false;
		removeDraggingElement();
		dispatch('dragEnd', { item });
	}

	// Cleanup function to ensure dragging element is removed
	function cleanup() {
		removeDraggingElement();
		isDraggingTouch = false;
		isPressed = false;
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	}

	// Ensure cleanup on component destroy
	onDestroy(() => {
		cleanup();
	});

	// Initialize random animation properties
	onMount(() => {
		// Generate random animation pattern (0-3)
		animationPattern = Math.floor(Math.random() * 4);
		// Generate random delay (0-0.3 seconds) - shorter delay for immediate start
		animationDelay = Math.random() * 0.3;
		// Generate random duration (4-8 seconds)
		animationDuration = 8 + Math.random() * 4;
	});

	// Handle drag over
	function handleDragOver(event) {
		if (!editMode) return;

		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';

		dispatch('dragOver', { item, event });
	}

	// Handle drop
	function handleDrop(event) {
		if (!editMode) return;

		event.preventDefault();
		const draggedItemId = event.dataTransfer.getData('text/plain');

		if (draggedItemId && draggedItemId !== item.id) {
			dispatch('drop', { targetItem: item, draggedItemId });
		}
	}

	// Get size display text
	function getSizeText(size) {
		const sizeMap = {
			'1x1': '1×1',
			'2x2': '2×2',
			'4x2': '4×2'
		};
		return sizeMap[size] || size;
	}

	// Get item dimensions for CSS Grid - make it reactive
	$: itemDimensions = (() => {
		const sizeMap = {
			'1x1': { gridColumn: 'span 1', gridRow: 'span 1' },
			'2x2': { gridColumn: 'span 2', gridRow: 'span 2' },
			'4x2': { gridColumn: 'span 4', gridRow: 'span 2' }
		};
		const dimensions = sizeMap[item.size] || sizeMap['1x1'];
		console.log(`Item ${item.id} dimensions updated: ${item.size} -> ${dimensions.gridColumn} x ${dimensions.gridRow}`);
		return dimensions;
	})();

	// Helper to extract color from Tailwind class
	function extractColorFromClass(bgColor) {
		if (!bgColor) return null;
		const match = bgColor.match(/bg-\[#([0-9a-fA-F]{6})\]/);
		return match ? `#${match[1]}` : null;
	}

	// Helper to check if color is black
	function isBlackColor(color) {
		if (!color || !color.startsWith('#')) return false;
		const hex = color.replace('#', '');
		if (hex.length !== 6) return false;
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		return r < 15 && g < 15 && b < 15;
	}

	// Helper to check if color is white or light (unreadable with white text)
	function isWhiteOrLightColor(color) {
		if (!color || !color.startsWith('#')) return false;
		const hex = color.replace('#', '');
		if (hex.length !== 6) return false;
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Calculate relative luminance (simplified)
		// If any RGB value is high enough, it's likely light
		// Using threshold of 200 for each channel (out of 255)
		// This catches white and very light colors
		return r > 200 && g > 200 && b > 200;
	}

	// Helper to check if color is white
	function isWhiteColor(color) {
		if (!color || !color.startsWith('#')) return false;
		const hex = color.replace('#', '');
		if (hex.length !== 6) return false;
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		// Check if it's white or very close to white (all channels > 240)
		return r > 240 && g > 240 && b > 240;
	}

	// Get icon (as URL) and bgColor from appInfo store (reactive)
	$: iconSrc = (() => {
		// Look up appInfo by name, src, or URL
		const appInfo = appInfoStore.getAppInfo(item.name) || 
			appInfoStore.getAppInfo(item.src) || 
			(item.src && item.src.startsWith('http') ? appInfoStore.getAppInfo(item.src) : null);
		
		// Get icon from appInfo (check if it's a URL)
		if (appInfo?.icon && (appInfo.icon.startsWith('http://') || appInfo.icon.startsWith('https://'))) {
			return appInfo.icon;
		} else if (item.src && item.src.startsWith('http')) {
			// Fallback to favicon for external URLs
			return getFaviconUrl(item.src);
		}
		return null;
	})();

	$: bgColor = (() => {
		// Look up appInfo by name, src, or URL
		const appInfo = appInfoStore.getAppInfo(item.name) || 
			appInfoStore.getAppInfo(item.src) || 
			(item.src && item.src.startsWith('http') ? appInfoStore.getAppInfo(item.src) : null);
		
		let finalBgColor = null;
		
		// Get bgColor from appInfo
		if (appInfo?.bgColor || appInfo?.backgroundColor) {
			const bgColorValue = appInfo.bgColor || appInfo.backgroundColor;
			// Extract color value if it's a Tailwind class
			const colorValue = extractColorFromClass(bgColorValue);
			if (colorValue) {
				if (!isBlackColor(colorValue)) {
					finalBgColor = colorValue;
				}
			} else if (bgColorValue.startsWith('#')) {
				if (!isBlackColor(bgColorValue)) {
					finalBgColor = bgColorValue;
				}
			} else {
				// It's a Tailwind class - check if it's white or black
				if (bgColorValue.includes('white') || bgColorValue === 'bg-white') {
					// In light mode, use gray instead of white
					finalBgColor = backgroundTheme === 'light' ? '#eeeeee' : '#ffffff';
				} else if (bgColorValue.includes('black') || bgColorValue === 'bg-black') {
					// In dark mode, use dark gray instead of black
					finalBgColor = backgroundTheme === 'dark' ? '#2a2a2a' : '#000000';
				} else {
					// Return the class as-is for other Tailwind classes
					finalBgColor = bgColorValue;
				}
			}
		}
		
		// Fallback to favicon background color for external URLs
		if (!finalBgColor && item.src && item.src.startsWith('http')) {
			const faviconBgColor = getAppBackgroundColor(item.src);
			const colorValue = extractColorFromClass(faviconBgColor);
			if (colorValue) {
				if (!isBlackColor(colorValue)) {
					finalBgColor = colorValue;
				}
			} else if (faviconBgColor.startsWith('#')) {
				if (!isBlackColor(faviconBgColor)) {
					finalBgColor = faviconBgColor;
				}
			} else {
				// It's a Tailwind class - check if it's white or black
				if (faviconBgColor.includes('white') || faviconBgColor === 'bg-white') {
					// In light mode, use gray instead of white
					finalBgColor = backgroundTheme === 'light' ? '#bebebe' : '#ffffff';
				} else if (faviconBgColor.includes('black') || faviconBgColor === 'bg-black') {
					// In dark mode, use dark gray instead of black
					finalBgColor = backgroundTheme === 'dark' ? '#2a2a2a' : '#000000';
				} else {
					finalBgColor = faviconBgColor;
				}
			}
		}
		
		// Default fallback - use accent color
		if (!finalBgColor) {
			finalBgColor = accentColor;
		}
		
		// Theme-aware adjustments: handle white/black backgrounds
		if (finalBgColor && finalBgColor.startsWith('#')) {
			// In light mode: if background is white, use gray shade
			if (backgroundTheme === 'light' && isWhiteColor(finalBgColor)) {
				return '#eeeeee'; // Light gray for visibility on white background
			}
			// In dark mode: if background is black, use a readable color
			if (backgroundTheme === 'dark' && isBlackColor(finalBgColor)) {
				return '#2a2a2a'; // Dark gray for visibility on black background
			}
		}
		
		return finalBgColor;
	})();

	// Load custom live tile config from localStorage (reactive)
	$: customLiveTileConfig = (() => {
		if (typeof window === 'undefined' || !item?.name) return null;
		
		try {
			const storageKey = `ubiquity-live-tile-${item.name}`;
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error('Error loading custom live tile config:', error);
		}
		return null;
	})();
	
	// Get custom live tile HTML for current size
	$: customLiveTileHTML = (() => {
		if (!customLiveTileConfig || !item?.size) return null;
		const sizeKey = item.size === '4x2' ? 'tile4x2' : 'tile2x2';
		const html = customLiveTileConfig[sizeKey];
		return html && html.trim() ? html.trim() : null;
	})();
	
	$: customAutoTileFlip = customLiveTileConfig?.autoTileFlip || false;
	
	// Check if this item should show a live tile
	$: shouldShowLiveTile = (() => {
		if (!item?.name) return false;
		if (item.size !== '2x2' && item.size !== '4x2') return false;
		if (editMode) return false; // Don't show live tiles in edit mode
		
		// Show live tile if custom HTML exists OR if it's a built-in live tile app
		if (customLiveTileHTML) return true;
		
		// Check if it's a Clock, Weather, Photos, or Music app (requires src)
		if (item.src) {
			return item.src === '/clock' || item.src === '/weather' || item.src === '/photos' || item.src === '/music' || item.src === '/spotify';
		}
		
		return false;
	})();
	
	// Get the Live component for this app (only if no custom tile)
	$: LiveComponent = (() => {
		if (!shouldShowLiveTile) return null;
		if (customLiveTileHTML) return null; // Don't use built-in component if custom HTML exists
		
		if (item.src === '/clock') {
			return LiveClock;
		} else if (item.src === '/weather') {
			return LiveWeather;
		} else if (item.src === '/photos') {
			return LivePhotos;
		} else if (item.src === '/music') {
			return LiveMusic;
		} else if (item.src === '/spotify') {
			return LiveSpotify;
		}
		return null;
	})();
	
	// Check if this live tile should show flip animation
	$: shouldShowFlipAnimation = (() => {
		if (!shouldShowLiveTile) return false;
		if (editMode) return false;
		
		// For custom tiles, use the autoTileFlip setting
		if (customLiveTileHTML) {
			return customAutoTileFlip;
		}
		
		// For built-in tiles, exclude music and photos
		if (LiveComponent) {
			return item.src !== '/music' && item.src !== '/photos';
		}
		
		return false;
	})();
	
	// Random flip animation for live tiles
	function startRandomFlipAnimation() {
		if (!shouldShowFlipAnimation) return;
		
		// Random delay between 4-11 seconds (less frequent)
		const delay = 3000 + Math.random() * 7000;
		
		flipAnimationTimer = setTimeout(() => {
			// Randomly choose flip direction
			flipDirection = Math.random() > 0.5 ? 'up' : 'down';
			isFlipping = true;
			
			// After 0.8s (flip animation), show back for 1.5s, then flip back
			setTimeout(() => {
				// Keep showing back for a moment
				setTimeout(() => {
					// Flip back to front
					isFlipping = false;
					// Schedule next animation
					startRandomFlipAnimation();
				}, 1000); // Show icon/name for 1.5 seconds
			}, 800); // Wait for flip animation to complete
		}, delay);
	}
	
	// Start random flip animations for live tiles (excluding music and photos)
	$: if (shouldShowFlipAnimation) {
		// Clear any existing timer
		if (flipAnimationTimer) {
			clearTimeout(flipAnimationTimer);
			flipAnimationTimer = null;
		}
		// Start the animation cycle
		startRandomFlipAnimation();
	}
	
	// Cleanup on destroy
	onDestroy(() => {
		if (flipAnimationTimer) {
			clearTimeout(flipAnimationTimer);
			flipAnimationTimer = null;
		}
	});
	
</script>

	<div
		class="grid-item relative group {((bgColor && bgColor.startsWith('#')) ? isWhiteOrLightColor(bgColor) : (bgColor && (bgColor.includes('white') || bgColor === 'bg-white'))) ? 'text-black' : 'text-white'} cursor-pointer {(bgColor && bgColor.startsWith('#')) ? '' : (bgColor || '')} {editMode && isSelected
			? 'selected'
			: ''} {isRemoving
			? 'animate-removal'
			: isDragging
				? 'opacity-50 scale-95'
				: editMode && isSelected && !isDragging && isSelecting
					? 'animate-selected'
					: editMode && isSelected && !isDragging && !isSelecting
						? 'selected-state'
						: editMode && !isSelected && !isDragging && isDeselecting
							? 'animate-deselected'
							: editMode && !isSelected && !isDragging && !isDeselecting
								? `animate-float-edit-${animationPattern + 1}`
								: !editMode && !isDragging
									? 'opacity-100'
									: ''} {isDragOver ? 'ring-2 ring-white ring-opacity-50' : ''} {editMode
			? 'edit-mode'
			: 'normal-mode'} size-{item.size}"
		data-item-id={item.id}
		style="grid-column: {itemDimensions.gridColumn}; grid-row: {itemDimensions.gridRow}; transform-origin: center; --icon-scale: {editMode ? '0.75' : '1'}; {(bgColor && bgColor.startsWith('#')) ? `background-color: ${bgColor} !important;` : (!bgColor || (!bgColor.startsWith('#') && !bgColor.includes('bg-'))) ? `background-color: ${accentColor} !important;` : ''} {editMode && !isSelected
			? `animation-delay: ${animationDelay}s; animation-duration: ${animationDuration}s;`
			: ''}"
	on:mousedown={handleMouseDown}
	on:mouseup={handleMouseUp}
	on:mouseleave={handleMouseLeave}
	on:touchstart={handleTouchStart}
	on:touchmove={handleTouchMove}
	on:touchend={handleTouchEnd}
	on:click={handleClick}
	on:keydown={handleKeyDown}
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover={handleDragOver}
	on:drop={handleDrop}
	draggable={editMode}
	role="button"
	tabindex="0"
>
	<!-- Main content -->
	{#if shouldShowLiveTile && (LiveComponent || customLiveTileHTML)}
		<!-- Live Tile Content -->
		<div class="relative w-full h-full overflow-hidden live-tile-wrapper" style="background: #000000;">
			<div class="live-tile-container w-full h-full" class:flip-up={isFlipping && flipDirection === 'up'} class:flip-down={isFlipping && flipDirection === 'down'}>
				<!-- Live tile content (front) -->
				<div class="live-tile-front absolute inset-0 w-full h-full">
					{#if customLiveTileHTML}
						<!-- Custom live tile HTML -->
						<div class="w-full h-full custom-live-tile">
							{@html customLiveTileHTML}
						</div>
					{:else if LiveComponent}
						<!-- Built-in live tile component -->
						<svelte:component this={LiveComponent} gridSize={item.size} />
					{/if}
				</div>
				
				<!-- App icon and name (back) - shown during flip -->
				<div class="live-tile-back absolute inset-0 w-full h-full flex flex-col items-center justify-center" style="background: {((bgColor && bgColor.startsWith('#')) ? bgColor : (bgColor || accentColor))};">
					<div class="flex flex-col items-center justify-center gap-2">
						<div class="icon-container">
							{#if iconSrc}
								<img
									src={iconSrc}
									alt={`${item.name} icon`}
									class="w-12 h-12 object-contain"
									on:error={(e) => {
										e.target.style.display = 'none';
										const iconElement = e.target.nextElementSibling;
										if (iconElement) iconElement.style.display = 'block';
									}}
								/>
								<Icon icon={item.icon} width="48" height="48" style="display: none;" />
							{:else}
								<Icon icon={item.icon} width="48" height="48" class={item.isSystemApp ? 'text-white' : ((bgColor && bgColor.startsWith('#') && isWhiteOrLightColor(bgColor)) || (bgColor && (bgColor.includes('white') || bgColor === 'bg-white')) ? 'text-black' : 'text-white')} />
							{/if}
						</div>
						<span class="absolute bottom-2 left-2 text-base font-medium {((bgColor && bgColor.startsWith('#')) ? isWhiteOrLightColor(bgColor) : (bgColor && (bgColor.includes('white') || bgColor === 'bg-white'))) ? 'text-black' : 'text-white'}">
							{item.name}
						</span>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Regular Tile Content -->
		<div class="relative flex flex-col items-center justify-center w-full h-full p-2">
			<div class="flex flex-col items-center justify-center h-full w-full">
				<div class="icon-container" style="transform: scale({storeEditMode ? '0.75' : '1'}) !important; transition: transform 200ms ease-in-out !important;">
					{#if iconSrc}
						<!-- Use image icon from appInfo if available -->
						<img
							src={iconSrc}
							alt={`${item.name} icon`}
							class="w-12 h-12 object-contain"
							on:error={(e) => {
								// Fallback to iconify icon if image fails to load
								e.target.style.display = 'none';
								const iconElement = e.target.nextElementSibling;
								if (iconElement) iconElement.style.display = 'block';
							}}
						/>
						<Icon icon={item.icon} width="48" height="48" style="display: none;" />
					{:else}
						<!-- Use iconify icon as fallback -->
						<!-- System apps always use white icons, regardless of theme -->
						<Icon icon={item.icon} width="48" height="48" class={item.isSystemApp ? 'text-white' : ((bgColor && bgColor.startsWith('#') && isWhiteOrLightColor(bgColor)) || (bgColor && (bgColor.includes('white') || bgColor === 'bg-white')) ? 'text-black' : 'text-white')} />
					{/if}
				</div>
				{#if item.size !== '1x1'}
					<span class="absolute bottom-2 left-2 text-sm mt-2 font-medium" style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; -webkit-touch-callout: none;"
						>{item.name}</span
					>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Edit mode controls - only show for selected item -->
	{#if editMode}
		<!-- Remove button (top right) - only for selected item -->
		{#if !isDragging}
			{#if isSelected}
				<button
					class="absolute -top-2 -right-2 w-8 h-8 {bgClass} border-2 {borderClass} rounded-full flex items-center justify-center {textColorClass} text-xs font-bold transition-all duration-300 ease-in-out opacity-100 scale-100 z-20"
					on:click={handleRemove}
				>
					<Icon icon="ri:unpin-fill" width="18" height="18" />
				</button>
			{/if}
		{/if}

		<!-- Resize button (bottom right) - only for selected item -->
		{#if isSelected}
			{#if !isDragging}
				<button
					class="absolute -bottom-2 -right-2 w-8 h-8 {bgClass} border-2 {borderClass} rounded-full flex items-center justify-center {textColorClass} text-xs font-bold transition-all duration-300 ease-in-out opacity-100 scale-100 z-20"
					on:click={handleResize}
				>
					<Icon
						icon="subway:left-arrow"
						width="18"
						height="18"
						style="transform: {item.size === '1x1' || item.size === '2x2'
							? 'rotate(225deg)'
							: 'rotate(0deg)'}"
					/>
				</button>
			{/if}
		{/if}
	{/if}

	<!-- Drag indicator (when dragging) -->
	{#if isDragging}
		<div
			class="absolute inset-0 border-opacity-50 flex items-center justify-center {bgClass} h-1 w-1"
		>
			<!-- <Icon icon={item.icon} width="24" height="24" class="text-white opacity-50" /> -->
		</div>
	{/if}
</div>

<style>
	.grid-item {
		min-height: 60px;
		min-width: 60px;
		transition:
			transform 300ms ease-in-out,
			opacity 300ms ease-in-out;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		overflow: visible;
		/* Windows Phone 8.1 style - solid colored backgrounds, no rounded corners */
		background-image: none !important;
		border-radius: 0 !important;
		/* Disable text selection on long press */
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		-webkit-touch-callout: none;
	}

	/* Size classes for different tile sizes - now handled by CSS Grid */
	/* Grid positioning is handled by grid-row and grid-column properties */

	/* Icon transition for edit mode */
	.grid-item :global(svg) {
		transition: width 200ms ease-in-out, height 200ms ease-in-out;
	}

	/* Removed conflicting CSS - using inline styles instead */

	.grid-item:hover {
		transform: scale(1.02);
	}

	.grid-item:active {
		transform: scale(0.98);
	}

	/* Original float animation for non-edit mode */
	@keyframes float {
		0%,
		100% {
			transform: translateY(0px) translateX(0px);
		}
		25% {
			transform: translateY(-10px) translateX(6px);
		}
		50% {
			transform: translateY(-4px) translateX(-8px);
		}
		75% {
			transform: translateY(-7px) translateX(4px);
		}
	}

	.animate-float {
		animation: float 8s ease-in-out infinite;
	}

	/* Edit mode float animation patterns - for non-selected items */
	@keyframes float-edit-1 {
		0%, 100% { transform: translateY(0px) translateX(0px) scale(0.9); }
		25% { transform: translateY(-8px) translateX(5px) scale(0.9); }
		50% { transform: translateY(-3px) translateX(-6px) scale(0.9); }
		75% { transform: translateY(-6px) translateX(3px) scale(0.9); }
	}

	@keyframes float-edit-2 {
		0%, 100% { transform: translateY(0px) translateX(0px) scale(0.9); }
		20% { transform: translateY(-6px) translateX(-4px) scale(0.9); }
		40% { transform: translateY(-2px) translateX(7px) scale(0.9); }
		60% { transform: translateY(-9px) translateX(-2px) scale(0.9); }
		80% { transform: translateY(-4px) translateX(5px) scale(0.9); }
	}

	@keyframes float-edit-3 {
		0%, 100% { transform: translateY(0px) translateX(0px) scale(0.9); }
		30% { transform: translateY(-5px) translateX(8px) scale(0.9); }
		60% { transform: translateY(-7px) translateX(-3px) scale(0.9); }
		90% { transform: translateY(-2px) translateX(6px) scale(0.9); }
	}

	@keyframes float-edit-4 {
		0%, 100% { transform: translateY(0px) translateX(0px) scale(0.9); }
		15% { transform: translateY(-4px) translateX(-7px) scale(0.9); }
		35% { transform: translateY(-8px) translateX(4px) scale(0.9); }
		55% { transform: translateY(-1px) translateX(-5px) scale(0.9); }
		75% { transform: translateY(-6px) translateX(2px) scale(0.9); }
		95% { transform: translateY(-3px) translateX(-8px) scale(0.9); }
	}

	.animate-float-edit-1 {
		animation: float-edit-1 ease-in-out infinite;
		opacity: 0.6;
		transform: scale(0.9);
		transition: transform 200ms ease-out;
	}

	.animate-float-edit-2 {
		animation: float-edit-2 ease-in-out infinite;
		opacity: 0.6;
		transform: scale(0.9);
		transition: transform 200ms ease-out;
	}

	.animate-float-edit-3 {
		animation: float-edit-3 ease-in-out infinite;
		opacity: 0.6;
		transform: scale(0.9);
		transition: transform 200ms ease-out;
	}

	.animate-float-edit-4 {
		animation: float-edit-4 ease-in-out infinite;
		opacity: 0.6;
		transform: scale(0.9);
		transition: transform 200ms ease-out;
	}

	/* Selected item animation - smooth scale and opacity */
	@keyframes selected {
		from {
			transform: scale(0.9);
			opacity: 0.6;
		}
		to {
			transform: scale(1.05);
			opacity: 1;
		}
	}

	/* Deselected item animation - smooth transition back to float state */
	@keyframes deselected {
		from {
			transform: scale(1.05);
			opacity: 1;
		}
		to {
			transform: scale(0.9);
			opacity: 0.6;
		}
	}

	.animate-selected {
		animation: selected 300ms ease-out forwards !important;
		transition: none !important;
	}

	.animate-deselected {
		animation: deselected 300ms ease-out forwards !important;
		transition: none !important;
	}

	/* Selected state - final state after animation */
	.selected-state {
		opacity: 1 !important;
		transform: scale(1.05) !important;
		animation: none !important;
	}

	/* Removal animation - scale to 0 */
	@keyframes removal {
		from {
			transform: scale(1);
			opacity: 1;
		}
		to {
			transform: scale(0);
			opacity: 0;
		}
	}

	.animate-removal {
		animation: removal 250ms ease-in forwards !important;
		pointer-events: none !important;
		transition: none !important;
	}

	/* Ensure selected items don't have float animation */
	.grid-item.selected {
		animation: none !important;
	}

	/* Ensure dragging items don't have other animations */
	.grid-item.opacity-50.scale-95 {
		animation: none !important;
	}

	/* Live tile flip animations */
	.live-tile-wrapper {
		perspective: 1000px;
		-webkit-perspective: 1000px;
		transform-style: preserve-3d;
		-webkit-transform-style: preserve-3d;
	}
	
	.live-tile-container {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		-webkit-transform-style: preserve-3d;
		transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
		transform-origin: center center;
	}
	
	.live-tile-front,
	.live-tile-back {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		transform-style: preserve-3d;
		-webkit-transform-style: preserve-3d;
	}
	
	.live-tile-front {
		transform: rotateX(0deg) translateZ(0);
		-webkit-transform: rotateX(0deg) translateZ(0);
	}
	
	.live-tile-back {
		transform: rotateX(180deg) translateZ(0);
		-webkit-transform: rotateX(180deg) translateZ(0);
	}
	
	/* Flip up animation - tile flips up (pivots on center horizontal axis) */
	.live-tile-container.flip-up {
		transform: rotateX(-180deg);
		-webkit-transform: rotateX(-180deg);
	}
	
	/* Flip down animation - tile flips down (pivots on center horizontal axis) */
	.live-tile-container.flip-down {
		transform: rotateX(180deg);
		-webkit-transform: rotateX(180deg);
	}

	/* Ensure deselection animation doesn't interfere with other states */
	.animate-deselected {
		animation: deselected 300ms ease-out forwards !important;
	}

	/* Ensure deselection animation has proper priority */
	.grid-item.animate-deselected {
		animation: deselected 300ms ease-out forwards !important;
		transition: none !important;
	}

	/* Ensure removal animation has highest priority */
	.grid-item.animate-removal {
		animation: removal 250ms ease-in forwards !important;
		pointer-events: none !important;
		transition: none !important;
	}

	/* Additional specificity for removal animation */
	div.animate-removal {
		animation: removal 250ms ease-in forwards !important;
		pointer-events: none !important;
		transition: none !important;
	}

	/* Highest priority for removal animation */
	.grid-item.animate-removal.animate-removal {
		animation: removal 250ms ease-in forwards !important;
		pointer-events: none !important;
		transition: none !important;
	}

	/* Ensure selection animation has proper priority */
	.grid-item.animate-selected {
		animation: selected 300ms ease-out forwards !important;
		transition: none !important;
	}

	/* Ensure float animation works properly */
	.grid-item.animate-float-edit {
		animation: float-edit 6s ease-in-out infinite !important;
		opacity: 0.6 !important;
	}

	/* Vary animation timing for different items */
	.animate-float-edit:nth-child(odd) {
		animation-duration: 5.5s;
	}

	.animate-float-edit:nth-child(even) {
		animation-duration: 6.5s;
	}

	.animate-float:nth-child(odd) {
		animation-duration: 7.5s;
	}

	.animate-float:nth-child(even) {
		animation-duration: 8.5s;
	}

	/* Windows Phone 8.1 solid colors - ensure Tailwind bg classes work */
	/* Colors are applied via Tailwind classes */

	/* Dragging element styles - Windows Phone 8.1 style */
	.grid-item-drag {
		border-radius: 0 !important;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		/* Background color will be set dynamically based on item */
	}
</style>
