import { writable } from 'svelte/store';

export const toasts = writable([]);

export function addToast(message, duration = 3000) {
  const id = Date.now();
  toasts.update(current => [...current, { id, message, duration }]);
  
  setTimeout(() => {
    toasts.update(current => current.filter(t => t.id !== id));
  }, duration);
}
