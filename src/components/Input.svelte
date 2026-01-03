<script>
	export let content;
	export let label = '';
	export let type = 'text';
	
	function handleInput(event) {
		content = event.target.value;
	}
</script>

<div class="flex flex-col gap-2 font-[400]">
	<label for="content" class="text-[#767676] text-sm">{label}</label>
	<input
		type={type}
		value={content}
		on:input={handleInput}
		class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
	/>
</div>