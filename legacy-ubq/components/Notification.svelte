<!-- Toast.svelte -->
<script>
    import { accentColorStore } from '../utils/theme';
    
    export let content = "";
    export let duration = 2000;
    let visible = true;
    
    $: accentColor = $accentColorStore;

    setTimeout(() => {
        visible = false;
    }, duration);
</script>

{#if visible}
    <div class="fixed z-10 top-0 w-full px-2 py-4 text-xl toast font-[300]" style="background-color: {accentColor};">
        {content}
    </div>
{/if}

<style>
    .toast {
        animation: fadeInOut 2s ease-in-out forwards;
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
</style>