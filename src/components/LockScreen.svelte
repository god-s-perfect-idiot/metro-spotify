<script>
    import Icon from '@iconify/svelte';
	import Button from './Button.svelte';
	import Loader from './Loader.svelte';
	import { accentColorStore } from '../utils/theme';
	import { onMount, onDestroy } from 'svelte';
	import { settingsStore } from '../store/settings';
	import { browser } from '$app/environment';

	$: accentColor = $accentColorStore;
    let isDragging = false;
    
    // Password state
    let enteredPassword = '';
    let storedPassword = '';
    let requirePassword = false;
    let isUnlocked = false;
    let isLoading = true;
    let isUnlocking = false;
    let lockTranslateY = 0;
    let keypadTranslateY = 0;
    
    // Subscribe to settings store to ensure reactivity
    $: settings = $settingsStore;
    
    // Lock screen background settings
    let backgroundType = 'solid';
    let backgroundColor = '#dc143c';
    let backgroundImage = '';
    let selectedImageUrl = '';
    let bingWallpaperUrl = '';
    
    // Subscribe to settings store to reactively update background settings and password requirement
    $: {
        // Access settings through the reactive store subscription
        const lockScreenSettings = settings?.settings?.lockScreen;
        const securitySettings = settings?.settings?.security;
        
        // Check if password is required
        if (securitySettings?.requirePassword !== undefined) {
            requirePassword = securitySettings.requirePassword === true;
        }
        
        if (lockScreenSettings) {
            if (lockScreenSettings.backgroundType !== undefined && lockScreenSettings.backgroundType !== null && lockScreenSettings.backgroundType !== '') {
                backgroundType = lockScreenSettings.backgroundType;
            }
            
            if (lockScreenSettings.backgroundColor !== undefined && lockScreenSettings.backgroundColor !== null && lockScreenSettings.backgroundColor !== '') {
                backgroundColor = lockScreenSettings.backgroundColor;
            }
            
            if (lockScreenSettings.backgroundImage !== undefined && lockScreenSettings.backgroundImage !== null && lockScreenSettings.backgroundImage !== '') {
                backgroundImage = lockScreenSettings.backgroundImage;
            }
            
            if (lockScreenSettings.selectedImageUrl !== undefined && lockScreenSettings.selectedImageUrl !== null && lockScreenSettings.selectedImageUrl !== '') {
                selectedImageUrl = lockScreenSettings.selectedImageUrl;
            }
        }
    }
    
    // Fetch Bing wallpaper when background type changes to bing
    $: if (backgroundType === 'bing' && browser && !bingWallpaperUrl) {
        fetchBingWallpaper();
    }
    
    // Calculate background style based on type
    $: lockScreenBackgroundStyle = (() => {
        if (backgroundType === 'solid') {
            return `background-color: ${backgroundColor};`;
        } else if (backgroundType === 'image' && selectedImageUrl) {
            return `background-image: url(${selectedImageUrl}); background-size: cover; background-position: center; background-color: ${backgroundColor};`;
        } else if (backgroundType === 'custom' && backgroundImage) {
            return `background-image: url(${backgroundImage}); background-size: cover; background-position: center; background-color: ${backgroundColor};`;
        } else if (backgroundType === 'bing' && bingWallpaperUrl) {
            return `background-image: url(${bingWallpaperUrl}); background-size: cover; background-position: center; background-color: ${backgroundColor};`;
        } else {
            // Default fallback
            return `background-color: ${backgroundColor};`;
        }
    })();
    
    // Fetch Bing wallpaper function using bing.biturl.top API
    function fetchBingWallpaper() {
        if (!browser || backgroundType !== 'bing') return;
        
        // Determine resolution based on screen size
        const screenWidth = window.innerWidth || 1920;
        const resolution = screenWidth >= 3840 ? 'UHD' : screenWidth >= 1920 ? '1920' : '1366';
        
        // Fetch JSON to get the actual image URL
        fetch(`https://bing.biturl.top/?resolution=${resolution}&format=json&index=0&mkt=en-US`)
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    bingWallpaperUrl = data.url;
                }
            })
            .catch(() => {
                // Fallback: use format=image which redirects to the image
                bingWallpaperUrl = `https://bing.biturl.top/?resolution=${resolution}&format=image&index=0&mkt=en-US`;
            });
    }
    
    // Get stored password and check sessionStorage on mount
    onMount(() => {
        // Check sessionStorage for unlock state
        if (browser) {
            const sessionUnlocked = sessionStorage.getItem('isUnlocked');
            if (sessionUnlocked === 'true') {
                isUnlocked = true;
                isLoading = false;
                if (onUnlock) onUnlock();
                return;
            }
        }
        
        // Check if password is required
        const requirePasswordSetting = settingsStore.get('security.requirePassword');
        requirePassword = requirePasswordSetting === true;
        
        const password = settingsStore.get('security.password');
        if (password && requirePassword) {
            storedPassword = password;
        } else {
            // No password required, unlock immediately
            isUnlocked = true;
            if (browser) {
                sessionStorage.setItem('isUnlocked', 'true');
            }
            if (onUnlock) onUnlock();
        }
        
        // Fetch Bing wallpaper if needed
        if (backgroundType === 'bing') {
            fetchBingWallpaper();
        }
        
        // Update keypad height on window resize
        if (browser) {
            window.addEventListener('resize', updateKeypadHeight);
        }
        
        isLoading = false;
    });
    
    // Password display with bullets
    $: passwordDisplay = enteredPassword.length > 0 
        ? '•'.repeat(enteredPassword.length) 
        : 'enter your password';
    
    // Handle key press feedback
    function handleKeyPress(number) {
        if (isUnlocked) return;
        
        // Clear any existing timeout
        if (pressTimeout) {
            clearTimeout(pressTimeout);
        }
        
        // Set pressed key for visual feedback
        pressedKey = number;
        
        // Clear pressed state after 1 second
        pressTimeout = setTimeout(() => {
            pressedKey = null;
            pressTimeout = null;
        }, 200);
        
        // Handle the actual number press
        handleNumberPress(number);
    }
    
    // Handle number button press
    function handleNumberPress(number) {
        if (isUnlocked) return;
        enteredPassword += number;
        
        // Check if password matches
        if (enteredPassword === storedPassword) {
            // Start unlock animation
            isUnlocking = true;
            animateUnlock();
        } else if (storedPassword && enteredPassword.length >= storedPassword.length) {
            // Wrong password, clear and show error
            enteredPassword = '';
            // Could add shake animation here if needed
        }
    }
    
    // Handle backspace
    function handleBackspace() {
        if (isUnlocked) return;
        
        // Clear any existing timeout
        if (pressTimeout) {
            clearTimeout(pressTimeout);
        }
        
        // Set pressed key for visual feedback (use 'backspace' as identifier)
        pressedKey = 'backspace';
        
        // Clear pressed state after 1 second
        pressTimeout = setTimeout(() => {
            pressedKey = null;
            pressTimeout = null;
        }, 1000);
        
        enteredPassword = enteredPassword.slice(0, -1);
    }
    
    // Handle report issue button click
    function handleReportIssue() {
        if (browser) {
            window.open('https://github.com/god-s-perfect-idiot/ubiquity/issues', '_blank');
        }
    }
    
    export let onUnlock = () => {};
    
    // Play unlock sound
    function playUnlockSound() {
        if (browser) {
            try {
                const audio = new Audio('/Unlock.mp3');
                audio.volume = 1; // Set volume to 100%
                audio.play().catch(err => {
                    console.error('Failed to play unlock sound:', err);
                });
            } catch (error) {
                console.error('Error playing unlock sound:', error);
            }
        }
    }
    
    // Unlock animation function
    function animateUnlock() {
        // Play unlock sound
        playUnlockSound();
        const startTime = Date.now();
        const duration = 800; // 800ms animation
        const screenHeight = window.innerHeight;
        const actualKeypadHeight = keypadHeight > 0 ? keypadHeight : screenHeight / 2;
        
        // Current visual positions (container translateY + section position)
        const containerOffset = translateY; // Current container position
        const lockVisualStart = containerOffset; // Lock is at container position
        const keypadVisualStart = containerOffset + screenHeight; // Keypad is screenHeight below lock in container
        
        // Target visual positions: lock moves up, keypad moves down
        const lockVisualTarget = -screenHeight * 1.5; // Move lock way up and out of view
        const keypadVisualTarget = screenHeight * 1.5; // Move keypad way down and out of view
        
        // Calculate transforms needed (relative to each section's position in container)
        // Lock is at position 0 in container, so its transform = target visual - container offset
        // Keypad is at position screenHeight in container, so its transform = target visual - container offset - screenHeight
        const lockStartTransform = 0; // Lock starts with no additional transform
        const keypadStartTransform = 0; // Keypad starts with no additional transform
        const lockTargetTransform = lockVisualTarget - containerOffset;
        const keypadTargetTransform = keypadVisualTarget - containerOffset - screenHeight;
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out for smooth animation
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate transforms
            lockTranslateY = lockStartTransform + (lockTargetTransform - lockStartTransform) * eased;
            keypadTranslateY = keypadStartTransform + (keypadTargetTransform - keypadStartTransform) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete, unlock device
                isUnlocked = true;
                // Save to sessionStorage
                if (browser) {
                    sessionStorage.setItem('isUnlocked', 'true');
                }
                if (onUnlock) onUnlock();
                // Clear password
                enteredPassword = '';
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    let startY = 0;
    let startTranslateY = 0; // Track the translateY position when drag starts
    let currentY = 0;
    let translateY = 0;
    let isShowingKeypad = false;
    let isBouncing = false;
    const threshold = 0.2; // 20% threshold
    
    // Keypad height tracking
    let keypadElement;
    let keypadHeight = 0;
    
    // Keypad key press state for visual feedback
    let pressedKey = null;
    let pressTimeout = null;
    
    // Measure keypad height when it's rendered
    function updateKeypadHeight() {
        if (keypadElement && browser) {
            keypadHeight = keypadElement.offsetHeight;
        }
    }
    
    $: if (keypadElement && browser && requirePassword) {
        updateKeypadHeight();
    }
    
    // Time and date state
    let currentTime = '';
    let currentDay = '';
    let currentDate = '';
    let timeInterval;
    
    function updateTime() {
        const now = new Date();
        
        // Format time (HH:MM)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        currentTime = `${hours}:${minutes}`;
        
        // Format day of week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        currentDay = days[now.getDay()];
        
        // Format date (Month Day)
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        const day = now.getDate();
        currentDate = `${months[now.getMonth()]} ${day}`;
    }
    
    onMount(() => {
        updateTime();
        // Update every minute
        timeInterval = setInterval(updateTime, 60000);
    });
    
    onDestroy(() => {
        if (timeInterval) {
            clearInterval(timeInterval);
        }
        if (pressTimeout) {
            clearTimeout(pressTimeout);
        }
        if (browser) {
            window.removeEventListener('resize', updateKeypadHeight);
        }
    });

    // Calculate opacity based on drag position
    $: lockOpacity = (() => {
        if (typeof window === 'undefined') return 1;
        if (isUnlocking) return 0; // Hide during unlock animation
        // If password is not required, always show time/date (opacity = 1)
        if (!requirePassword) return 1;
        const maxTranslate = keypadHeight > 0 ? -keypadHeight : -window.innerHeight / 2;
        // Opacity goes from 1 (at translateY = 0) to 0 (at maxTranslate)
        // When keypad is shown, opacity should be 0
        // Formula: opacity = 1 - (|translateY| / |maxTranslate|)
        // Since both are negative, we use absolute values
        const opacity = Math.max(0, Math.min(1, 1 - (Math.abs(translateY) / Math.abs(maxTranslate))));
        return opacity;
    })();
    
    function bounceBack() {
        const startTime = Date.now();
        const bounceUpAmount = 80; // How far to bounce up (more negative translateY)
        const bounceBackAmount = 40; // How much to bounce back down from the peak
        const bounceUpDuration = 200; // Time to bounce up (ms)
        const bounceBackDuration = 300; // Time to bounce back and settle (ms)
        const totalDuration = bounceUpDuration + bounceBackDuration;
        const startY = translateY; // This is negative when dragged up
        const peakY = startY - bounceUpAmount; // Peak position (most negative)
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            if (progress < bounceUpDuration / totalDuration) {
                // Phase 1: Bounce up (move further up, more negative translateY)
                const bounceUpProgress = elapsed / bounceUpDuration;
                // Ease out for smooth bounce up
                const eased = 1 - Math.pow(1 - bounceUpProgress, 3);
                // Interpolate from startY to peakY (more negative)
                translateY = startY + (peakY - startY) * eased;
            } else {
                // Phase 2: Bounce back down once and settle
                const bounceBackStart = bounceUpDuration / totalDuration;
                const bounceBackProgress = (progress - bounceBackStart) / (1 - bounceBackStart);
                
                if (bounceBackProgress < 0.4) {
                    // Bounce back down (from peak toward a position partway back)
                    const bounceBackProgressNormalized = bounceBackProgress / 0.4;
                    const eased = 1 - Math.pow(1 - bounceBackProgressNormalized, 2);
                    const bounceBackY = peakY + bounceBackAmount;
                    translateY = peakY + (bounceBackY - peakY) * eased;
                } else {
                    // Settle at 0 (from bounce back position to 0)
                    const settleProgress = (bounceBackProgress - 0.4) / 0.6;
                    const eased = 1 - Math.pow(1 - settleProgress, 3);
                    const bounceBackY = peakY + bounceBackAmount;
                    translateY = bounceBackY - bounceBackY * eased;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                translateY = 0;
                isBouncing = false;
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    function handleTouchStart(e) {
        if (isUnlocked) return;
        isDragging = true;
        startY = e.touches[0].clientY;
        startTranslateY = translateY; // Capture current position
    }
    
    function handleTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentY = e.touches[0].clientY;
        const deltaY = startY - currentY; // Positive when dragging up
        const screenHeight = window.innerHeight;
        // If password not required, allow dragging all the way up. Otherwise, cap at keypad height
        const maxTranslate = requirePassword ? (keypadHeight > 0 ? -keypadHeight : -screenHeight / 2) : -screenHeight;
        
        // Calculate new position relative to starting position
        const newTranslateY = startTranslateY - deltaY;
        
        // Allow dragging in both directions, but cap at limits
        if (newTranslateY < 0) {
            translateY = Math.max(maxTranslate, newTranslateY);
        } else {
            translateY = 0;
        }
    }
    
    function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        const screenHeight = window.innerHeight;
        const actualKeypadHeight = keypadHeight > 0 ? keypadHeight : screenHeight / 2;
        const currentPosition = Math.abs(translateY) / actualKeypadHeight;
        
        // If password is not required, unlock directly when threshold is reached
        if (!requirePassword) {
            if (currentPosition >= threshold) {
                // Unlock directly
                isUnlocked = true;
                playUnlockSound();
                if (browser) {
                    sessionStorage.setItem('isUnlocked', 'true');
                }
                if (onUnlock) onUnlock();
            } else {
                // Bounce back to lock
                isBouncing = true;
                bounceBack();
            }
            return;
        }
        
        // Password required - show keypad logic
        const keypadPosition = 1.0; // Full keypad height
        
        // If we're at or past the keypad position, snap to keypad
        if (currentPosition >= keypadPosition - 0.05) { // Small threshold for snapping
            isShowingKeypad = true;
            translateY = -actualKeypadHeight;
        } else if (currentPosition >= threshold) {
            // If dragged past threshold but not at keypad, snap to keypad
            isShowingKeypad = true;
            translateY = -actualKeypadHeight;
        } else {
            // Bounce back to lock with more bounce
            isShowingKeypad = false;
            isBouncing = true;
            bounceBack();
        }
    }
    
    function handleMouseDown(e) {
        if (isUnlocked) return;
        isDragging = true;
        startY = e.clientY;
        startTranslateY = translateY; // Capture current position
    }
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        currentY = e.clientY;
        const deltaY = startY - currentY;
        const screenHeight = window.innerHeight;
        // If password not required, allow dragging all the way up. Otherwise, cap at keypad height
        const maxTranslate = requirePassword ? (keypadHeight > 0 ? -keypadHeight : -screenHeight / 2) : -screenHeight;
        
        // Calculate new position relative to starting position
        const newTranslateY = startTranslateY - deltaY;
        
        // Allow dragging in both directions, but cap at limits
        if (newTranslateY < 0) {
            translateY = Math.max(maxTranslate, newTranslateY);
        } else {
            translateY = 0;
        }
    }
    
    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        
        const screenHeight = window.innerHeight;
        const actualKeypadHeight = keypadHeight > 0 ? keypadHeight : screenHeight / 2;
        const currentPosition = Math.abs(translateY) / actualKeypadHeight;
        
        // If password is not required, unlock directly when threshold is reached
        if (!requirePassword) {
            if (currentPosition >= threshold) {
                // Unlock directly
                isUnlocked = true;
                playUnlockSound();
                if (browser) {
                    sessionStorage.setItem('isUnlocked', 'true');
                }
                if (onUnlock) onUnlock();
            } else {
                // Bounce back to lock
                isBouncing = true;
                bounceBack();
            }
            return;
        }
        
        // Password required - show keypad logic
        const keypadPosition = 1.0; // Full keypad height
        
        // If we're at or past the keypad position, snap to keypad
        if (currentPosition >= keypadPosition - 0.05) { // Small threshold for snapping
            isShowingKeypad = true;
            translateY = -actualKeypadHeight;
        } else if (currentPosition >= threshold) {
            // If dragged past threshold but not at keypad, snap to keypad
            isShowingKeypad = true;
            translateY = -actualKeypadHeight;
        } else {
            // Bounce back to lock with more bounce
            isShowingKeypad = false;
            isBouncing = true;
            bounceBack();
        }
    }
</script>

{#if isLoading}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]">
        <Loader />
    </div>
{:else if !isUnlocked}
<div 
    class="fixed inset-0 z-50 overflow-hidden"
    role="button"
    tabindex="0"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
>
    <div 
        class="flex flex-col"
        class:transition-transform={!isUnlocking && !isBouncing && !isDragging}
        class:duration-300={!isUnlocking && !isBouncing && !isDragging}
        class:ease-out={!isUnlocking && !isBouncing && !isDragging}
        style="transform: translateY({translateY}px);"
        class:transition-none={isDragging || isBouncing || isUnlocking}
    >
        <div 
            class="flex w-full h-screen items-center justify-center"
            class:transition-transform={isUnlocking}
            class:duration-700={isUnlocking}
            class:ease-out={isUnlocking}
            style="transform: translateY({isUnlocking ? lockTranslateY : 0}px); {lockScreenBackgroundStyle}"
        >
            <div 
                class="flex flex-col h-full w-full items-start justify-end mb-24 ml-8"
                style="opacity: {lockOpacity}; transition: opacity 200ms ease-out;"
            >
                <span class="text-8xl font-[300]">{currentTime}</span>
                <span class="text-3xl font-[300]">{currentDay}</span>
                <span class="text-3xl font-[300]">{currentDate}</span>
            </div>
        </div>
        {#if requirePassword}
        <div 
            bind:this={keypadElement}
            class="flex flex-col w-full min-h-[50vh] bg-[#1f1f1f] items-center justify-end"
            class:transition-transform={isUnlocking}
            class:duration-700={isUnlocking}
            class:ease-out={isUnlocking}
            style="transform: translateY({isUnlocking ? keypadTranslateY : 0}px);"
        >
            <span class="text-2xl font-[400] py-4">{passwordDisplay}</span>
            <div class="grid grid-cols-3 gap-1 w-full px-1 mb-4">
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '1' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('1')}
                >1</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '2' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('2')}
                >2</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '3' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('3')}
                >3</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '4' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('4')}
                >4</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '5' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('5')}
                >5</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '6' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('6')}
                >6</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '7' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('7')}
                >7</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '8' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('8')}
                >8</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '9' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('9')}
                >9</button>
                <button class="aspect-square flex items-center justify-center text-3xl font-[400] bg-[#414141] h-[4.5rem] w-full"></button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === '0' ? '#8fceff' : '#414141'};"
                    on:click={() => handleKeyPress('0')}
                >0</button>
                <button 
                    class="aspect-square flex items-center justify-center text-3xl font-[400] h-[4.5rem] w-full transition-colors duration-150"
                    style="background-color: {pressedKey === 'backspace' ? '#8fceff' : '#414141'};"
                    on:click={handleBackspace}
                >
                    <Icon icon="material-symbols:backspace-outline-sharp" width="40" height="40" />
                </button>
            </div>
            <Button text="report issue" className="w-fit mb-4 self-start ml-4 !bg-[#1f1f1f]" onClick={handleReportIssue} />
        </div>
        {/if}
    </div>
</div>
{/if}
