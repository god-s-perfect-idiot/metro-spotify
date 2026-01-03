<script>
	import { accentColorStore, borderColorClassStore, backgroundThemeStore, textColorClassStore } from '../utils/theme';
	
	$: accentColor = $accentColorStore;
	$: borderClass = $borderColorClassStore;
	$: backgroundTheme = $backgroundThemeStore;
	$: textClass = $textColorClassStore;
	// Invert: use #dedede in light mode, accent color in dark mode
	$: bottomBarBg = backgroundTheme === 'light' ? '#dedede' : accentColor;
</script>

<div class="fixed bottom-0 h-12 w-full z-50 flex flex-row gap-20 justify-center items-center border-t-[0.0125rem] {borderClass}" style="background-color: {bottomBarBg};">
    <button 
        type="button"
        class="{textClass}"
        on:click={() => {
            window.history.back();
        }}
    ><i class="fa-solid fa-arrow-left text-2xl"></i></button>
    <button class="border-2 {borderClass} h-7 w-7 flex justify-center items-center font-[500] text-xl {textClass}" 
        on:click={() => {
            window.location.href = '/';
        }}
    ><p>U</p></button>
    <button class="{textClass}"><i class="fa-solid fa-magnifying-glass text-2xl"></i></button>
</div>