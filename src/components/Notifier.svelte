<!-- ToastContainer.svelte -->
<script>
    import { toasts } from '../store/toast.js';
    import Notification from './Notification.svelte';
</script>

<div class="toast-container">
    {#each $toasts as toast (toast.id)}
        <Notification content={toast.message} duration={toast.duration} />
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        display: flex;
        z-index: 100000;
        width: 100%;
    }
</style>