<script>
    import { onMount } from 'svelte';
    
    let container;
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    function handleTouchStart(event) {
      if (container.scrollTop === 0 || container.scrollTop + container.offsetHeight >= container.scrollHeight) {
        startY = event.touches[0].pageY;
        isDragging = true;
      }
    }
  
    function handleTouchMove(event) {
      if (!isDragging) return;
  
      currentY = event.touches[0].pageY;
      const deltaY = currentY - startY;
  
      if ((container.scrollTop === 0 && deltaY > 0) || 
          (container.scrollTop + container.offsetHeight >= container.scrollHeight && deltaY < 0)) {
        event.preventDefault();
        container.style.transform = `translateY(${deltaY / 3}px)`;
      }
    }
  
    function handleTouchEnd() {
      if (!isDragging) return;
  
      isDragging = false;
      container.style.transition = 'transform 0.3s ease-out';
      container.style.transform = 'translateY(0)';
  
      setTimeout(() => {
        container.style.transition = '';
      }, 300);
    }
  
    onMount(() => {
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchmove', handleTouchMove);
      container.addEventListener('touchend', handleTouchEnd);
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    });
    export let className='';
  </script>
  
  <style>
    .rubber-band-scroll {
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  </style>
  
  <div class={`rubber-band-scroll h-fit ${className}`} bind:this={container}>
    <slot></slot>
  </div>
  