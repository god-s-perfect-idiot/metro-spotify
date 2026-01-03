<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { backgroundThemeStore, textColorClassStore } from '../utils/theme';
	import Icon from '@iconify/svelte';

	$: backgroundTheme = $backgroundThemeStore;
	$: textColorClass = $textColorClassStore;

	let currentTime = '';
	let batteryLevel = null;
	let isCharging = false;
	let isOnline = true;
	let connectionType = 'unknown';
	let wifiStrength = 0; // 0-4 bars
	let timeInterval;

	// Format time
	function updateTime() {
		if (!browser) return;
		const now = new Date();
        // add 0 before the number if it is less than 10
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

	// Get network information
	function updateNetwork() {
		if (!browser) return;

		isOnline = navigator.onLine;

		if ('connection' in navigator) {
			const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
			if (conn) {
				connectionType = conn.effectiveType || 'unknown';
			}
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

		// Get network info
		updateNetwork();

		// Listen for online/offline events
		window.addEventListener('online', updateNetwork);
		window.addEventListener('offline', updateNetwork);

		// Listen for connection changes
		if ('connection' in navigator) {
			const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
			if (conn) {
				conn.addEventListener('change', updateNetwork);
			}
		}
	});

	onDestroy(() => {
		if (timeInterval) {
			clearInterval(timeInterval);
		}
		if (browser) {
			window.removeEventListener('online', updateNetwork);
			window.removeEventListener('offline', updateNetwork);
		}
	});

	// Get network icon
	function getNetworkIcon() {
		if (!isOnline) return 'material-symbols:wifi-off';
		if (connectionType === '4g' || connectionType === 'slow-2g') return 'material-symbols:signal-cellular-2-bar';
		return 'material-symbols:android-wifi-3-bar';
	}

    console.log(getNetworkIcon());
</script>

<div class="status-bar {textColorClass}" style="background-color: transparent;">
	<div class="status-left">
		<div class="status-item wifi-icon" title="Network: {isOnline ? connectionType : 'Offline'}">
			<Icon icon='{getNetworkIcon()}' width="22" height="22" />
		</div>
	</div>

	<div class="status-right">
		<!-- Network Status -->

		<!-- Battery Status -->
		{#if batteryLevel !== null}
			<div class="flex flex-row items-center">
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
						{#if isCharging}
							<!-- <Icon icon="streamline-ultimate:charger-1-bold" class="stroke-black stroke-2 z-20 absolute top-0 left-0" width="12" height="12" /> -->
						{/if}
					</div>
					</div>
				</div>
				<div class="w-[3.5px] h-[6px] bg-white !border-l-[1px] !border-[#000000]" />
			</div>
		{/if}
		<span class="font-[400] text-[15px]">{currentTime}</span>
	</div>
</div>

<style>

    .wifi-icon {
        transform: rotate(-45deg);
    }

	.status-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 9999;
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
		gap: 0.5rem;
        padding-right: 1rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
	}

	.status-item i {
		font-size: 12px;
	}

	.battery {
		position: relative;
	}

	.battery-box {
		width: 26px;
		height: 12px;
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

</style>
