<script>
	import { accentColorStore, textColorClassStore } from '../utils/theme.js';

	export let onClick;
	export let text;
	export let className = '';
	export let style = '';

	$: accentColor = $accentColorStore;
	$: textClass = $textColorClassStore;
</script>

<button
	class={`${textClass} text-base py-1 border-2 border-white w-fit px-4 ${className} font-[300] bg-transparent`}
	on:click={onClick}
	style="--accent-color: {accentColor}; {style}"
>
	{text}
</button>

<style>
	button:focus,
	button:active,
	button:hover {
		background-color: var(--accent-color);
	}
</style>