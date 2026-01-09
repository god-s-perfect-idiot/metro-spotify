<script>
	import { accentColorStore } from '../utils/theme.js';
	
	export let hideText = false;
	
	$: accentColor = $accentColorStore;
</script>

<div class="flex items-center justify-center" class:py-12={!hideText}>
	<div class="flex flex-col items-center gap-4">
		<!-- Windows Phone 8 Style Loading Dots -->
		<div class="ellipsis-loader" role="alert" aria-label="Loading. Please wait">
			<div class="ellipsis-loader__dot" style="background: {accentColor};"></div>
			<div class="ellipsis-loader__dot" style="background: {accentColor};"></div>
			<div class="ellipsis-loader__dot" style="background: {accentColor};"></div>
			<div class="ellipsis-loader__dot" style="background: {accentColor};"></div>
		</div>

		<!-- Loading Text -->
		{#if !hideText}
			<span class="text-lg text-gray-300 font-light">Loading...</span>
		{/if}
	</div>
</div>

<style>
	.ellipsis-loader {
		-webkit-animation: 1.8s infinite ellipsis-loader;
		animation: 1.8s infinite ellipsis-loader;
		display: inline-block;
		height: 3px;
		overflow: hidden;
		position: relative;
		width: 140px;
	}

	.ellipsis-loader__dot {
		-webkit-animation: 1.8s infinite ellipsis-loader__dot;
		animation: 1.8s infinite ellipsis-loader__dot;
		float: left;
		height: 3px;
		position: absolute;
		width: 3px;
	}
	.ellipsis-loader__dot:nth-child(1) {
		-webkit-animation-delay: 0.15s;
		animation-delay: 0.15s;
		left: -13px;
	}
	.ellipsis-loader__dot:nth-child(2) {
		-webkit-animation-delay: 0.3s;
		animation-delay: 0.3s;
		left: -26px;
	}
	.ellipsis-loader__dot:nth-child(3) {
		-webkit-animation-delay: 0.45s;
		animation-delay: 0.45s;
		left: -39px;
	}
	.ellipsis-loader__dot:nth-child(4) {
		-webkit-animation-delay: 0.6s;
		animation-delay: 0.6s;
		left: -52px;
	}

	@-webkit-keyframes ellipsis-loader {
		0%,
		25% {
			transform: translateX(0);
		}
		100% {
			transform: translate(20px);
		}
	}

	@keyframes ellipsis-loader {
		0%,
		25% {
			transform: translateX(0);
		}
		100% {
			transform: translate(20px);
		}
	}
	@-webkit-keyframes ellipsis-loader__dot {
		0% {
			-webkit-animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
			animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
			transform: translateX(0);
		}
		55% {
			-webkit-animation-timing-function: cubic-bezier(0.785, 0.135, 0.15, 0.86);
			animation-timing-function: cubic-bezier(0.785, 0.135, 0.15, 0.86);
			opacity: 1;
			transform: translateX(98px);
		}
		75%,
		100% {
			transform: translateX(212px);
		}
		90% {
			opacity: 0.2;
		}
	}
	@keyframes ellipsis-loader__dot {
		0% {
			-webkit-animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
			animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
			transform: translateX(0);
		}
		55% {
			-webkit-animation-timing-function: cubic-bezier(0.785, 0.135, 0.15, 0.86);
			animation-timing-function: cubic-bezier(0.785, 0.135, 0.15, 0.86);
			opacity: 1;
			transform: translateX(98px);
		}
		75%,
		100% {
			transform: translateX(212px);
		}
		90% {
			opacity: 0.2;
		}
	}
</style>