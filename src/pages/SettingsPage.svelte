<script>
	import { router } from '../lib/router.js';
	import { onMount } from 'svelte';
	import { browser } from '../lib/browser.js';
	import { accountsStore } from '../store/accounts.js';
	
	// Page components
	import SettingsPage from './spotify/SettingsPage.svelte';

	let isExiting = false;
	let isLoading = false;

	// Initialize on page load
	onMount(async () => {
		if (browser) {
			accountsStore.loadFromStorage();
		}
	});

	// Check if user is authenticated
	$: isAuthenticated = accountsStore.isAuthenticated('spotify');
</script>

<div class="page-holder">
	<SettingsPage
		{isExiting}
		{isLoading}
	/>
</div>

