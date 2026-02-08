// Fullscreen helper for Android TV and browsers
function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

// Try to enter fullscreen on load
window.addEventListener('load', () => {
    // Small delay to ensure page is fully rendered
    setTimeout(() => {
        enterFullscreen();
    }, 1000);
});

// Also try on first user interaction (for browsers that require user gesture)
document.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        enterFullscreen();
    }
}, { once: true });

// Prevent accidental exit from fullscreen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        console.log('Exited fullscreen, trying to re-enter...');
        setTimeout(enterFullscreen, 500);
    }
});