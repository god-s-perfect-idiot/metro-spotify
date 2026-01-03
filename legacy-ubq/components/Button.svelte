<script>
	import {
		accentColorStore,
		backgroundClassStore,
		textColorClassStore,
		borderColorClassStore
	} from '../utils/theme';

	export let onClick;
	export let text;
	export let className;
	export let style;

	$: accentColor = $accentColorStore;
	$: bgClass = $backgroundClassStore;
	$: textClass = $textColorClassStore;
	$: borderClass = $borderColorClassStore;
</script>

<button
	class={`${bgClass} ${textClass} text-base py-1 border-2 ${borderClass} w-fit px-4 ${className} font-[300]`}
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
