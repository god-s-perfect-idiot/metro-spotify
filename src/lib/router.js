// Simple router for Svelte app (replaces SvelteKit routing)
import { writable } from 'svelte/store';

export const currentRoute = writable('/');
export const router = {
  navigate: (path) => {
    currentRoute.set(path);
    window.history.pushState({}, '', path);
  },
  goto: (path) => {
    currentRoute.set(path);
    window.history.pushState({}, '', path);
  },
  replace: (path) => {
    currentRoute.set(path);
    window.history.replaceState({}, '', path);
  }
};

// Handle browser back/forward
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const path = window.location.pathname;
    const search = window.location.search;
    currentRoute.set(path + search);
  });
}
