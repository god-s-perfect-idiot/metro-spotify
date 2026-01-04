<script>
  import { onMount, onDestroy } from 'svelte';
  import { musicStore, currentTrack, isPlaying, playbackProgress } from '../store/music.js';
  import { accountsStore } from '../store/accounts.js';
  import { router } from '../lib/router.js';
  import HomePage from './HomePage.svelte';
  import CarouselNowPlaying from '../components/CarouselNowPlaying.svelte';
  
  export let isExiting = false;
  
  // Local exit state for when navigation is triggered from within
  let localIsExiting = false;
  
  // Combined exit state - use local if set, otherwise use prop
  $: shouldExit = localIsExiting || isExiting;
  
  // Check authentication status - if not authenticated, redirect to login
  $: isAuthenticated = accountsStore.isAuthenticatedSync('spotify');
  
  $: {
    // Safety check: if we somehow render this page when not authenticated, redirect
    if (typeof window !== 'undefined' && !isAuthenticated) {
      // Use a small timeout to avoid race conditions with App.svelte's reactive check
      setTimeout(async () => {
        const isAuth = await accountsStore.isAuthenticated('spotify');
        if (!isAuth) {
          router.replace('/');
        }
      }, 50);
    }
  }
  
  // Animation state
  let hasAnimated = false;
  let titleHasAnimated = false;
  let carouselHasAnimated = false;
  let entryAnimationComplete = false; // Track when entry animation is fully done
  
  // Carousel state
  let carouselContainer;
  let currentPosition = 0; // 0 = home, 1 = now playing
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startOffsetX = 0; // Track offset when drag starts
  let currentX = 0;
  let currentY = 0;
  let offsetX = 0;
  let containerWidth = 0;
  let isHorizontalSwipe = false;
  
  // Music store subscriptions
  let currentTrackData = null;
  let isPlayingState = false;
  let progress = { currentTime: 0, duration: 0, seekValue: 0 };
  
  $: currentTrackData = $currentTrack;
  $: isPlayingState = $isPlaying;
  $: progress = $playbackProgress;
  
  // Derived values for NowPlayingPage
  $: nowPlayingTrack = currentTrackData && currentTrackData.type === 'spotify' ? currentTrackData : null;
  $: currentTime = progress.currentTime;
  $: duration = progress.duration;
  $: seekValue = progress.seekValue;
  
  // Peek amount (percentage of screen width)
  const PEEK_AMOUNT = 0.15; // 15% of screen width
  
  // Calculate initial offset to show peek
  $: initialOffset = containerWidth > 0 ? containerWidth * PEEK_AMOUNT : 0;
  
  // translateX represents how far left the container has moved
  // When translateX = 0, home page is fully visible (90% width), now playing peeks 10% from right
  // When translateX = -containerWidth * 0.9, container fully moved left, showing now playing fully
  // Swiping right increases offsetX, making translateX more negative, moving container left, revealing now playing on right
  // The container is 190% wide (90% homepage + 100% now playing)
  // At translateX = 0: homepage at 0-90%, now playing at 90-190% (showing 10% peek at 90-100%)
  // At translateX = -90%: homepage at -90% to 0% (off screen), now playing at 0-100% (fully visible)
  $: translateX = -offsetX;
  
  // Clamp translateX to valid range (max negative is 90% of containerWidth to fully reveal now playing)
  $: maxTranslateX = containerWidth > 0 ? -containerWidth * 0.9 : 0;
  $: clampedTranslateX = containerWidth > 0 
    ? Math.max(maxTranslateX, Math.min(0, translateX))
    : 0;
  
  // Calculate initial animation offset (80% of screen width)
  $: initialAnimationOffset = containerWidth > 0 ? containerWidth * 0.8 : 0;
  
  // Calculate the X translation for animation
  $: animationTranslateX = carouselHasAnimated 
    ? clampedTranslateX
    : initialAnimationOffset + clampedTranslateX;
  
  // Combined transform for carousel with initial animation
  // Start with perspective flip (rotateY) and slide in, then animate to final position
  // Rotate around left axis: positive rotation flips in from the right
  // When exiting, don't apply carousel transform so the parent flip animation works
  $: carouselTransform = shouldExit 
    ? 'none'
    : (carouselHasAnimated 
      ? `translateX(${clampedTranslateX}px) rotateY(0deg)`
      : `translateX(${animationTranslateX}px) rotateY(30deg)`);
  
  // Keep everything in carousel - no external navigation needed
  
  function handleTouchStart(e) {
    isDragging = true;
    isHorizontalSwipe = false;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startOffsetX = offsetX; // Store current offset when drag starts
  }
  
  function handleTouchMove(e) {
    if (!isDragging || containerWidth === 0) return;
    
    currentX = e.touches ? e.touches[0].clientX : e.clientX;
    currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    // Determine if this is a horizontal swipe (only after some movement)
    if (!isHorizontalSwipe && Math.abs(deltaX) > 10) {
      isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only prevent default and update carousel if it's a horizontal swipe
    if (isHorizontalSwipe) {
      e.preventDefault();
      
      // Calculate new offset based on starting offset and swipe delta
      // Fix inverted swipe: swiping left was pushing right, we want it to pull left (reveal now playing)
      // Swiping right (deltaX > 0) should reveal now playing → container moves left → offsetX increases
      // Swiping left (deltaX < 0) should hide now playing → container moves right → offsetX decreases  
      // Invert: when you swipe left (deltaX < 0), we want to decrease offsetX (move container right)
      // When you swipe right (deltaX > 0), we want to increase offsetX (move container left)
      const newOffsetX = startOffsetX - deltaX;
      offsetX = Math.max(0, Math.min(containerWidth * 0.9, newOffsetX));
    }
  }
  
  function handleTouchEnd(e) {
    if (!isDragging || containerWidth === 0) return;
    
    isDragging = false;
    const deltaX = currentX - startX;
    const maxOffset = containerWidth * 0.9; // Max offset to fully show now playing
    const threshold = maxOffset * 0.3; // 30% threshold relative to max offset (symmetric)
    
    // Only process swipe if it was horizontal
    if (isHorizontalSwipe) {
      // Determine final position based on current offsetX with symmetric threshold
      // If offsetX is within 30% of maxOffset, snap to now playing
      // If offsetX is within 30% of 0, snap to home
      // Otherwise, snap to whichever is closer
      if (offsetX > maxOffset - threshold) {
        // Transition to now playing (stay in carousel, no navigation)
        currentPosition = 1;
        offsetX = maxOffset;
      } else if (offsetX < threshold) {
        // Stay/go to home (position 0, showing 10% peek of now playing)
        currentPosition = 0;
        offsetX = 0;
      } else {
        // Snap to whichever is closer (midpoint between threshold zones)
        const midPoint = maxOffset * 0.5;
        if (offsetX > midPoint) {
          currentPosition = 1;
          offsetX = maxOffset;
        } else {
          currentPosition = 0;
          offsetX = 0;
        }
      }
    }
    
    isHorizontalSwipe = false;
  }
  
  function handleMouseDown(e) {
    handleTouchStart(e);
  }
  
  function handleMouseMove(e) {
    handleTouchMove(e);
  }
  
  function handleMouseUp(e) {
    handleTouchEnd(e);
  }
  
  function updateContainerWidth() {
    if (carouselContainer) {
      const newWidth = carouselContainer.offsetWidth;
      if (newWidth !== containerWidth) {
        const oldWidth = containerWidth;
        containerWidth = newWidth;
        
        // Adjust offset proportionally if width changed
        if (oldWidth > 0 && containerWidth > 0) {
          const ratio = offsetX / oldWidth;
          if (currentPosition === 0) {
            // Maintain relative position
            offsetX = containerWidth * ratio;
        } else {
          offsetX = Math.min(containerWidth * 0.9, containerWidth * ratio);
        }
        } else if (currentPosition === 0) {
          offsetX = 0; // Start at position 0
        } else {
          offsetX = containerWidth;
        }
      } else if (containerWidth > 0 && offsetX === 0 && currentPosition === 0) {
        offsetX = 0; // Start at position 0, no peek initially
      }
    }
  }
  
  onMount(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      updateContainerWidth();
      
      // Start at position 0 (homepage fully visible)
      if (currentPosition === 0 && containerWidth > 0) {
        offsetX = 0;
      }
      
      // Trigger carousel animation first (starts immediately)
      setTimeout(() => {
        carouselHasAnimated = true;
        hasAnimated = true;
        // Mark entry animation as complete after the full 0.8s duration
        setTimeout(() => {
          entryAnimationComplete = true;
        }, 800);
      }, 50);
      
      // Trigger title animation with slight delay so it arrives before carousel finishes
      setTimeout(() => {
        titleHasAnimated = true;
      }, 200);
    });
    
    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
    });
    
    if (carouselContainer) {
      resizeObserver.observe(carouselContainer);
      
      // Add mouse event listeners for desktop
      carouselContainer.addEventListener('mousedown', handleMouseDown);
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });
  
  // Music store functions
  async function playNext() {
    await musicStore.playNext();
  }
  
  async function playPrevious() {
    await musicStore.playPrevious();
  }
  
  async function togglePlayPause() {
    await musicStore.togglePlayPause();
  }
  
  // Handle navigation from HomePage - trigger exit animation first
  function handleBeforeNavigate(navigateCallback) {
    // Set local exiting state to trigger the carousel exit animation
    localIsExiting = true;
    
    // Wait for exit animation to complete, then navigate
    setTimeout(() => {
      navigateCallback();
      // Reset after navigation (component will unmount anyway)
      setTimeout(() => {
        localIsExiting = false;
      }, 50);
    }, 200); // Match flipOut animation duration
  }
</script>

<div 
  bind:this={carouselContainer}
  class="w-full h-full relative overflow-hidden flex flex-col page-holder carousel-container"
  class:page-exit={shouldExit}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  style="touch-action: pan-x pan-y;"
>
  <!-- Shared Title -->
  <div class="title-container flex items-center gap-4 h-[10%] px-4 flex-shrink-0 z-20 bg-[var(--body-bg-color,#000)] relative" class:animated={titleHasAnimated}>
    <img
      src="/logo.png"
      alt="Metro Spotify"
      class="h-32 w-32 object-contain absolute top-[-1rem] left-[-3rem]"
    />
    <span class="text-[6rem] font-[200] whitespace-nowrap pl-16 mt-6">spotify</span>
  </div>
  
  <!-- Carousel Content Wrapper with Perspective -->
  <div class="carousel-perspective-wrapper">
    <!-- Carousel Content -->
    <div 
      class="carousel-content flex h-[90%] relative"
      style="transform: {carouselTransform}; width: {containerWidth > 0 ? containerWidth * 1.9 : '190%'}; min-width: {containerWidth > 0 ? containerWidth * 1.9 : '190%'}; transform-style: preserve-3d; --final-translate-x: {clampedTranslateX}px;"
      class:transition-none={isDragging}
      class:animated={carouselHasAnimated}
      class:entry-complete={entryAnimationComplete}
    >
    <!-- Home Page (Page 1 - Left, 90% of viewport width) -->
    <div class="h-full flex-shrink-0 flex flex-col" style="width: {containerWidth > 0 ? containerWidth * 0.9 : '90vw'}; min-width: {containerWidth > 0 ? containerWidth * 0.9 : '90vw'}; background-color: var(--body-bg-color, #000);">
      <div class="flex-1 overflow-y-hidden">
        <HomePage isExiting={false} onBeforeNavigate={handleBeforeNavigate} />
      </div>
    </div>
    
    <!-- Now Playing Page (Page 2 - Right, 100% of viewport width, positioned right after homepage) -->
    <div class="h-full flex-shrink-0 flex flex-col" style="width: {containerWidth > 0 ? containerWidth : '100vw'}; min-width: {containerWidth > 0 ? containerWidth : '100vw'}; background-color: var(--body-bg-color, #000);">
      <div class="flex-1 overflow-y-auto">
        <CarouselNowPlaying 
          {nowPlayingTrack}
          {currentTime}
          {duration}
          {seekValue}
          {isPlayingState}
          onPlayPrevious={playPrevious}
          onPlayNext={playNext}
          onTogglePlayPause={togglePlayPause}
        />
      </div>
    </div>
    
    <!-- Placeholder for Page 3 (future) -->
    <!-- <div class="h-full flex-shrink-0 flex flex-col" style="width: {containerWidth}px; min-width: {containerWidth}px; background-color: var(--body-bg-color, #000);">
      <div class="flex-1 overflow-y-auto">
        Page 3 content
      </div>
    </div> -->
    
    <!-- Placeholder for Page 4 (future) -->
    <!-- <div class="h-full flex-shrink-0 flex flex-col" style="width: {containerWidth}px; min-width: {containerWidth}px; background-color: var(--body-bg-color, #000);">
      <div class="flex-1 overflow-y-auto">
        Page 4 content
      </div>
    </div> -->
    </div>
  </div>
</div>

<style>
  :global(.transition-none) {
    transition: none !important;
  }

  .title-container {
    transform: translateX(100vw);
    opacity: 0;
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .title-container.animated {
    transform: translateX(0);
    opacity: 1;
  }

  .carousel-perspective-wrapper {
    perspective: 1000px;
    perspective-origin: center center;
    height: 90%;
    width: 100%;
    overflow: hidden;
    position: relative;
  }

  /* Ensure the carousel container has proper transform-origin for exit animation */
  .carousel-container {
    transform-origin: left;
  }
  
  /* Apply exit animation when page-exit class is present - this flips the entire page */
  .carousel-container.page-exit {
    animation: flipOut 0.2s ease-out forwards !important;
    /* Ensure the entire container flips, including all children */
    transform-style: preserve-3d;
  }
  
  /* When exiting, preserve child transforms but they'll follow the parent's flip */
  .carousel-container.page-exit .carousel-content {
    /* Keep the transform but it will be relative to the parent's rotation */
    transition: none !important;
  }
  
  /* When exiting, ensure title follows the parent flip */
  .carousel-container.page-exit .title-container {
    transition: none !important;
  }

  .carousel-content {
    opacity: 0;
    transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: left center;
    transform-style: preserve-3d;
    backface-visibility: hidden;
  }

  .carousel-content.animated {
    opacity: 1;
    transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* Fast transition for swipe interactions after entry animation completes */
  .carousel-content.animated.entry-complete:not(.transition-none) {
    transition: transform 0.15s ease-out,
                opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
</style>

