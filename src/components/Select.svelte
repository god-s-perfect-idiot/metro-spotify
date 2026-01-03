<script>
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { accentColorStore, backgroundClassStore, borderColorClassStore } from '../utils/theme';

	export let selection;
	export let data = [];
	let open = false;
	export let label = '';
	export let className = '';
	export let onSelectionChange = null;
	
	$: accentColor = $accentColorStore;
	$: bgClass = $backgroundClassStore;
	$: borderClass = $borderColorClassStore;

	// Set default selection only if none provided
	$: if (selection === undefined && data.length > 0) {
		selection = data[0];
	}

</script>

<div class="flex flex-col gap-2 font-[400] {className}">
    <span class="text-[#767676] text-sm">{label}</span>
    <div>
        {#if open}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                transition:slide={{ duration: 300, easing: cubicOut }}
                class="bg-white text-black pl-2 py-2 text-base border-2 flex flex-col gap-4"
                style="border-color: {accentColor};"
                on:click={() => (open = false)}
            >
                {#each data as item}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        on:click={() => {
                            selection = item;
                            open = false;
                            if (onSelectionChange) {
                                onSelectionChange(item);
                            }
                        }}
                        style={selection === item ? `color: ${accentColor};` : ''}
                    >
                        {item}
                    </div>
                {/each}
            </div>
        {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="{bgClass} border-2 {borderClass} text-base p-1 pl-2" on:click={() => (open = true)}>
                {selection}
            </div>
        {/if}
    </div>
</div>