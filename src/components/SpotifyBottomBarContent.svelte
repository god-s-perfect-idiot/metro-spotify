<script>
	import Icon from '@iconify/svelte';
	import { musicStore } from '../store/music.js';
	import { router } from '../lib/router.js';
	
	export let isExpanded = false;
	export let showSetup = false;
	export let isAuthenticated = false;
	export let nowPlayingTrack = null;
	export let onHideSetup = () => {};
	export let onConnect = () => {};
	
	function closePage() {
		router.goto('/');
	}
	
	function goToLibrary() {
		musicStore.clear();
	}
</script>

<div class="flex flex-row gap-12 justify-center items-center">
	{#if showSetup && !isAuthenticated}
		<div
			class="btn-animate flex flex-col gap-2 justify-center items-center"
			class:animate={isExpanded}
		>
			<button
				class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
				on:click={onHideSetup}
			>
				<Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
			</button>
			<span class="text-xs font-[400]">back</span>
		</div>
		<div
			class="btn-animate flex flex-col gap-2 justify-center items-center"
			class:animate={isExpanded}
		>
			<button
				class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
				on:click={onConnect}
			>
				<Icon icon="mdi:check" width="18" height="18" strokeWidth="2" />
			</button>
			<span class="text-xs font-[400]">connect</span>
		</div>
	{/if}
	{#if isAuthenticated && nowPlayingTrack}
		<div
			class="btn-animate flex flex-col gap-2 justify-center items-center"
			class:animate={isExpanded}
		>
			<button
				class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
				on:click={goToLibrary}
			>
				<Icon icon="subway:left-arrow" width="18" height="18" strokeWidth="2" />
			</button>
			<span class="text-xs font-[400]">library</span>
		</div>
	{/if}
	<div
		class="btn-animate flex flex-col gap-2 justify-center items-center"
		class:animate={isExpanded}
	>
		<button
			on:click={closePage}
			class="flex flex-col border border-white rounded-full !border-2 p-2 font-bold"
		>
			<Icon icon="rivet-icons:close" width="18" height="18" strokeWidth="2" />
		</button>
		<span class="text-xs font-[400]">close</span>
	</div>
</div>

<style>
	.btn-animate {
		transform: translateY(120%);
		opacity: 0;
	}

	.btn-animate.animate {
		animation: button-overshoot 0.5s ease-out forwards;
		opacity: 1;
	}

	@keyframes button-overshoot {
		0% {
			transform: translateY(120%);
		}
		70% {
			transform: translateY(-20%);
		}
		100% {
			transform: translateY(0);
		}
	}
</style>

