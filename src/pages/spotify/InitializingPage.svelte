<script>
	import Loader from '../../components/Loader.svelte';
	
	export let isExiting = false;
</script>

<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
	<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
	<div class="flex-1 flex flex-col items-center justify-center my-24">
		<Loader />
	</div>
</div>

