// ===============================================
// VOLLbild-Helfer
// Sorgt dafür, dass das Display im Vollbild läuft
// (TV, Smartboard, Kiosk-Modus)
// ===============================================
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

// ===============================================
// TASTENSTEUERUNG
// Unterstützt Tastaturen & TV-Fernbedienungen
// ===============================================
document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'r':
        case 'f5':
            // Seite neu laden
            location.reload();
            break;

        case 'f':
        case 'f11':
            // In den Vollbildmodus wechseln
            e.preventDefault();
            enterFullscreen();
            break;

        case 'e':
        case 'escape':
            // Verhindert das Verlassen des Vollbildmodus
            e.preventDefault();
            enterFullscreen();
            break;
    }
});

// ===============================================
// AUTOMATISCHER VOLLbild-START
// Wird beim Laden der Seite ausgeführt
// ===============================================
window.addEventListener('load', () => {
    // Kurze Verzögerung, damit alles korrekt geladen ist
    setTimeout(() => {
        enterFullscreen();
    }, 1000);
});

// ===============================================
// BENUTZERINTERAKTION
// Einige Browser erlauben Vollbild erst nach Klick
// ===============================================
document.addEventListener(
    'click',
    () => {
        if (!document.fullscreenElement) {
            enterFullscreen();
        }
    },
    { once: true }
);

// ===============================================
// SCHUTZ VOR VOLLbild-VERLUST
// Versucht automatisch, wieder in den Vollbildmodus
// zu wechseln
// ===============================================
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        console.log('Vollbild beendet – versuche erneut zu wechseln');
        setTimeout(enterFullscreen, 500);
    }
});
