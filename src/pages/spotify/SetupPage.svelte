<script>
	import Input from '../../components/Input.svelte';
	import Button from '../../components/Button.svelte';
	import { accentColorStore } from '../../utils/theme.js';
	
	export let isExiting = false;
	export let spotifyClientId = '';
	export let spotifyClientSecret = '';
	export let onConnect = () => {};
	
	$: accentColor = $accentColorStore;
</script>

<div class="page flex flex-col h-screen" class:page-exit={isExiting}>
	<span class="text-6xl font-[300] h-[10%] px-4">spotify</span>
	<div class="flex flex-col gap-6 mt-12 flex-1 overflow-y-auto pb-24 px-4">
		<!-- Developer Setup -->
		<div class="flex flex-col gap-4">
			<span class="text-xl font-[300]" style="color: {accentColor};">developer setup</span>
			<span class="text-sm font-[300] text-[#a1a1a1]">
				Get credentials from the
				<a
					href="https://developer.spotify.com/dashboard"
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-400 underline">Spotify Developer Dashboard</a
				>.
			</span>

			<div class="flex flex-col gap-4">
				<Input label="Client ID" bind:content={spotifyClientId} />
				<div class="flex flex-col gap-2 font-[400]">
					<label for="spotify-client-secret" class="text-[#767676] text-sm">Client Secret</label>
					<input
						id="spotify-client-secret"
						type="password"
						bind:value={spotifyClientSecret}
						class="bg-[#bebebe] w-full py-2 pl-2 outline-none text-[#121212] text-base"
					/>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-[300] text-[#a1a1a1]">Redirect URI:</span>
				<span class="text-base font-[300] text-[#767676] mt-1">metrospotify://callback</span>
			</div>
		</div>

		<!-- Connection Status -->
		<div class="flex flex-col gap-2">
			<span class="text-xl font-[300]">
				Enter your credentials above, then click connect to authorize the app.
			</span>
			<span class="text-sm font-[300] text-[#a1a1a1]">
				Your credentials are stored locally on your device and never shared with anyone.
			</span>
		</div>

		<!-- Connect Button -->
		<div class="mt-6">
			<Button text="connect" onClick={onConnect} className="w-auto" />
		</div>
	</div>
</div>

