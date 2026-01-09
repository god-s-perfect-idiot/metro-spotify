<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { backgroundThemeStore, textColorClassStore } from '../utils/theme.js';
	import { currentRoute } from '../lib/router.js';
	import Icon from '@iconify/svelte';

	// Store subscriptions must be at top level
	$: backgroundTheme = $backgroundThemeStore;
	$: textColorClass = $textColorClassStore;
	$: currentRouteValue = $currentRoute;

	let currentTime = '';
	let batteryLevel = null;
	let isCharging = false;
	let timeInterval;
	let clockAnimated = false;
	let batteryAnimated = false;
	let previousRoute = '';
	
	// Trigger animation only when transitioning from page without status bar to one with status bar
	$: if (currentRouteValue) {
		const currentRouteStr = currentRouteValue || '';
		const hasStatusBar = currentRouteStr !== '/' && currentRouteStr !== '';
		const previousHadStatusBar = previousRoute !== '/' && previousRoute !== '' && previousRoute !== '';
		
		// Only animate if: current page has status bar AND previous page didn't have status bar
		if (hasStatusBar && !previousHadStatusBar && previousRoute !== currentRouteStr) {
			triggerClockAnimation();
		}
		
		// Update previous route
		if (previousRoute !== currentRouteStr) {
			previousRoute = currentRouteStr;
		}
	}

	// Format time
	function updateTime() {
		if (!browser) return;
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
		const displayMinutes = minutes.toString().padStart(2, '0');
		currentTime = `${displayHours}:${displayMinutes}`;
	}

	// Get battery information
	async function updateBattery() {
		if (!browser || !('getBattery' in navigator)) {
			batteryLevel = null;
			return;
		}

		try {
			const battery = await navigator.getBattery();
			batteryLevel = Math.round(battery.level * 100);
			isCharging = battery.charging;

			// Listen for battery changes
			battery.addEventListener('chargingchange', () => {
				isCharging = battery.charging;
			});

			battery.addEventListener('levelchange', () => {
				batteryLevel = Math.round(battery.level * 100);
			});
		} catch (error) {
			console.error('Error getting battery info:', error);
			batteryLevel = null;
		}
	}


	// Status bar background color
	$: statusBarBg = backgroundTheme === 'light' ? '#ffffff' : '#000000';
	$: statusBarTextColor = backgroundTheme === 'light' ? '#000000' : '#ffffff';

	onMount(() => {
		if (!browser) return;

		// Update time immediately and set interval
		updateTime();
		timeInterval = setInterval(updateTime, 1000);

		// Get battery info
		updateBattery();

		// Trigger all animations on initial mount
		setTimeout(() => {
			batteryAnimated = true;
		}, 200);
		setTimeout(() => {
			clockAnimated = true;
		}, 350);
	});

	onDestroy(() => {
		if (timeInterval) {
			clearInterval(timeInterval);
		}
	});

	// Trigger all status bar animations with staggered delays
	async function triggerClockAnimation() {
		// Reset all animations
		batteryAnimated = false;
		clockAnimated = false;
		await tick();
		
		// Battery drops first (150ms delay)
		setTimeout(() => {
			batteryAnimated = true;
		}, 400);
		
		// Clock drops last (300ms delay)
		setTimeout(() => {
			clockAnimated = true;
		}, 750);
	}
</script>

<div class="status-bar {textColorClass}">
	<div class="status-left">
	</div>

	<div class="status-right">
		<!-- Battery Status -->
		{#if batteryLevel !== null}
			<div class="flex flex-row items-center battery-container {batteryAnimated ? 'battery-animated' : ''}">
				<div
					class="status-item battery"
					title="Battery: {batteryLevel}%{isCharging ? ' (Charging)' : ''}"
				>
					<div class="battery-box">
						<div
							class="battery-fill border-[1px] border-[#000000] {isCharging
								? 'charging'
								: ''} {batteryLevel < 20 && !isCharging ? 'low' : ''}"
							style="width: {batteryLevel}%"
						>
						</div>
					</div>
				</div>
				<div class="w-[3.5px] h-[6px] bg-white !border-l-[1px] !border-[#000000]" />
			</div>
		{/if}
		<span class="font-[200] text-sm clock {clockAnimated ? 'clock-animated' : ''}">{currentTime}</span>
	</div>
</div>

<style>
	.status-bar {
		position: fixed;
		top: 0.25rem;
		left: 0;
		right: 0;
		z-index: 99999;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11px;
		font-weight: 500;
		padding: 0.5rem 0;
		user-select: none;
		-webkit-user-select: none;
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		height: 2rem; /* Standard Android status bar height */
		background-color: #000000;
	}

	.status-left {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 1rem;
	}

	.status-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-right: 1rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
	}


	.battery {
		position: relative;
	}

	.battery-box {
		width: 25px;
		height: 11px;
		border: 1.5px solid currentColor;
		position: relative;
		overflow: hidden;
		background-color: rgba(0, 0, 0, 0.1);
	}

	.battery-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background-color: currentColor;
		transition:
			width 0.3s ease,
			background-color 0.3s ease;
	}

	.battery-fill.low {
		background-color: #e32f17;
	}

	.battery-container {
		opacity: 0;
		transform: translateY(-20px);
		transition: none;
	}

	.battery-animated {
		animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
	}

	.clock {
		opacity: 0;
		transform: translateY(-20px);
		transition: none;
	}

	.clock-animated {
		animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
	}

	@keyframes bounceIn {
		0% {
			opacity: 0;
			transform: translateY(-20px);
		}
		60% {
			opacity: 1;
			transform: translateY(2px);
		}
		80% {
			transform: translateY(-2px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>