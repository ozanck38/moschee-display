// ===========================
// KONFIGURATION & STATUS
// ===========================

let config = {};
let prayerTimes = {};
let nextPrayerInfo = null;

// Tagesdaten aus der Gebetszeiten-API (z.B. Hijri-Datum)
let dayInfo = null;

// Gebetsnamen (Anzeige TR / EN)
const PRAYER_NAMES = {
    imsak: { tr: 'İMSAK', en: 'FAJR' },
    gunes: { tr: 'GÜNEŞ', en: 'SUNRISE' },
    ogle: { tr: 'ÖĞLE', en: 'DHUHR' },
    ikindi: { tr: 'İKİNDİ', en: 'ASR' },
    aksam: { tr: 'AKŞAM', en: 'MAGHRIB' },
    yatsi: { tr: 'YATSI', en: 'ISHA' }
};

// Wochentage (TR / DE)
const DAY_NAMES = {
    tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
};

// ===========================
// FEHLERHINWEIS (TOAST)
// ===========================

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    // Meldung nach 5 Sekunden entfernen
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ===========================
// START / INITIALISIERUNG
// ===========================

async function init() {
    console.log('🕌 Mosque Display initializing...');

    try {
        await loadConfig();
        updateMosqueInfo();
        await loadPrayerTimes();
        await loadWeather();
        updateAnnouncements();
        startClocks();
        setupAutoRefresh();

        // 🌙 Ramadan-Modul initialisieren (nach Gebetszeiten)
        if (typeof RamadanModule !== 'undefined') {
            RamadanModule.init(config, prayerTimes, dayInfo);
        }

        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
}

// ===========================
// KONFIG LADEN
// ===========================

async function loadConfig() {
    try {
        // 1) Wenn vorhanden: config.js (window.MOSQUE_CONFIG)
        if (window.MOSQUE_CONFIG) {
            config = window.MOSQUE_CONFIG;
            console.log('✅ Config loaded from config.js:', config);
            return;
        }

        // 2) Fallback: config.json (mit Cache-Buster)
        const timestamp = new Date().getTime();
        const response = await fetch(`config.json?v=${timestamp}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            config = JSON.parse(text);
        } else {
            config = await response.json();
        }

        console.log('✅ Config loaded from config.json:', config);
    } catch (error) {
        console.error('❌ Config loading failed:', error);

        // Notfall-Konfig (damit das Display trotzdem startet)
        config = {
            mosque_name: 'Aksa Camii',
            city: 'Wedel',
            city_code: '10339',
            announcement_turkish: 'Camimize hoşgeldiniz',
            announcement_german: 'Herzlich willkommen in unserer Moschee',
            openweather_api_key: 'YOUR_API_KEY_HERE'
        };

        console.log('ℹ️ Using fallback config');
    }
}

// ===========================
// MOSCHEE-INFOS IN UI SETZEN
// ===========================

function updateMosqueInfo() {
    document.getElementById('mosque-name').textContent = config.mosque_name;
    document.getElementById('city-name').textContent = config.city;
    document.getElementById('city-name-sub').textContent = config.city;
}

// ===========================
// GEBETSZEITEN LADEN
// ===========================

async function loadPrayerTimes() {
    try {
        const today = new Date();
        const cityCode = config.city_code || '10339';
        const url = `https://ezanvakti.emushaf.net/vakitler/${cityCode}`;

        console.log('📡 Fetching prayer times from:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid prayer times data received');
        }

        // Tagesdatensatz auswählen (Format: "DD.MM.YYYY")
        const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
        const todayData = data.find(d => d.MiladiTarihKisaIso8601 === todayStr);

        if (!todayData) {
            console.warn('⚠️ Could not find prayer times for today:', todayStr);
            console.log('📅 Using first available date:', data[0].MiladiTarihKisaIso8601);
        }

        const selectedData = todayData || data[0];

        // Tagesinfos (z.B. Hijri-Datum) direkt aus der API nutzen
        dayInfo = {
            hijriLong: selectedData.HicriTarihUzun || '',
            hijriShort: selectedData.HicriTarihKisa || '',
            miladiShort: selectedData.MiladiTarihKisaIso8601 || ''
        };

        // Pflichtfelder prüfen
        const requiredFields = ['Imsak', 'Gunes', 'Ogle', 'Ikindi', 'Aksam', 'Yatsi'];
        const missingFields = requiredFields.filter(field => !selectedData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing prayer times: ${missingFields.join(', ')}`);
        }

        prayerTimes = {
            imsak: selectedData.Imsak,
            gunes: selectedData.Gunes,
            ogle: selectedData.Ogle,
            ikindi: selectedData.Ikindi,
            aksam: selectedData.Aksam,
            yatsi: selectedData.Yatsi
        };

        updatePrayerTimesDisplay();
        console.log('✅ Prayer times loaded:', prayerTimes);

    } catch (error) {
        console.error('❌ Prayer times loading failed:', error.message);

        // Passende Meldung anzeigen
        let errorMessage = '⚠️ Gebetszeiten konnten nicht geladen werden';

        if (error.message.includes('HTTP')) {
            errorMessage = '⚠️ Gebetszeiten-Server nicht erreichbar';
        } else if (error.message.includes('Invalid')) {
            errorMessage = '⚠️ Ungültige Gebetszeiten-Daten';
        }

        showError(errorMessage);

        // Platzhalter-Zeiten
        prayerTimes = {
            imsak: '05:30',
            gunes: '07:15',
            ogle: '12:30',
            ikindi: '15:00',
            aksam: '17:45',
            yatsi: '19:30'
        };

        dayInfo = null;
        updatePrayerTimesDisplay();
    }
}

function updatePrayerTimesDisplay() {
    Object.keys(prayerTimes).forEach(prayer => {
        const element = document.getElementById(`prayer-${prayer}`);
        if (element) {
            element.textContent = prayerTimes[prayer];
        }
    });

    // Hijri-Datum anzeigen (kommt aus der Gebetszeiten-API)
    updateIslamicDate();

    updateNextPrayer();
}

// ===========================
// NÄCHSTES GEBET BERECHNEN
// ===========================

function updateNextPrayer() {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Gebetszeiten -> Sekunden
    const prayerSeconds = {};
    Object.keys(prayerTimes).forEach(prayer => {
        const [hours, minutes] = prayerTimes[prayer].split(':').map(Number);
        prayerSeconds[prayer] = hours * 3600 + minutes * 60;
    });

    // Nächstes Gebet finden
    let nextPrayer = null;
    let minDiff = Infinity;

    Object.keys(prayerSeconds).forEach(prayer => {
        let diff = prayerSeconds[prayer] - currentSeconds;

        // Wenn schon vorbei: zählt für morgen
        if (diff < 0) diff += 24 * 3600;

        if (diff < minDiff) {
            minDiff = diff;
            nextPrayer = prayer;
        }
    });

    nextPrayerInfo = {
        name: nextPrayer,
        secondsUntil: minDiff
    };

    updateNextPrayerDisplay();
    highlightCurrentPrayer(nextPrayer);
}

function updateNextPrayerDisplay() {
    if (!nextPrayerInfo) return;

    const nameElement = document.getElementById('next-prayer-name');
    const prayerName = PRAYER_NAMES[nextPrayerInfo.name];
    nameElement.textContent = `${prayerName.tr} - ${prayerName.en}`;
}

function updateNextPrayerTimer() {
    if (!nextPrayerInfo) return;

    const timerElement = document.getElementById('next-prayer-timer');

    const hours = Math.floor(nextPrayerInfo.secondsUntil / 3600);
    const minutes = Math.floor((nextPrayerInfo.secondsUntil % 3600) / 60);
    const seconds = Math.floor(nextPrayerInfo.secondsUntil % 60);

    timerElement.textContent =
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Warn-Optik bei weniger als 5 Minuten
    if (nextPrayerInfo.secondsUntil < 300) {
        timerElement.classList.add('info__clock--urgent');
    } else {
        timerElement.classList.remove('info__clock--urgent');
    }

    // Countdown runterzählen
    nextPrayerInfo.secondsUntil -= 1;

    if (nextPrayerInfo.secondsUntil <= 0) {
        updateNextPrayer();
    }
}

function highlightCurrentPrayer(nextPrayer) {
    // Alle Hervorhebungen entfernen
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('card--active');
    });

    // Aktuell ist die Karte VOR dem nächsten Gebet
    const prayerOrder = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];
    const nextIndex = prayerOrder.indexOf(nextPrayer);
    const currentIndex = nextIndex > 0 ? nextIndex - 1 : prayerOrder.length - 1;
    const currentPrayer = prayerOrder[currentIndex];

    const currentCard = document.getElementById(`prayer-${currentPrayer}`)?.closest('.card');
    if (currentCard) currentCard.classList.add('card--active');

    // Info-Karte bleibt immer aktiv
    const infoCard = document.querySelector('.card--info');
    if (infoCard) infoCard.classList.add('card--active');
}

// ===========================
// WETTER LADEN
// ===========================

async function loadWeather() {
    const tempElement = document.getElementById('weather-temp');
    const iconElement = document.getElementById('weather-icon');

    try {
        // 1) Netlify Function (Production)
        const netlifyUrl = `/.netlify/functions/weather?city=${encodeURIComponent(config.city)}`;

        let response;
        let data;

        try {
            response = await fetch(netlifyUrl);
            if (response.ok) {
                data = await response.json();
                console.log('ℹ️ Using Netlify Function for weather');
            } else {
                throw new Error('Netlify function not available');
            }
        } catch (_) {
            console.log('ℹ️ Netlify Function not available, trying direct API');

            // 2) Fallback: Direkter API-Call (Development)
            const API_KEY = config.openweather_api_key;

            if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || API_KEY.trim() === '') {
                throw new Error('OpenWeather API key not configured');
            }

            const directUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.city)}&units=metric&appid=${API_KEY}&lang=de`;
            response = await fetch(directUrl);

            if (!response.ok) {
                if (response.status === 401) throw new Error('Invalid API key');
                if (response.status === 404) throw new Error('City not found');
                throw new Error(`HTTP ${response.status}`);
            }

            data = await response.json();
            console.log('ℹ️ Using direct API for weather');
        }

        // Daten prüfen
        if (!data || !data.main || !data.weather || !data.weather[0]) {
            throw new Error('Invalid weather data received');
        }

        const temp = Math.round(data.main.temp);
        const icon = data.weather[0].icon;

        tempElement.textContent = `${temp}°C`;
        iconElement.src = `images/weather/${icon}.png`;
        iconElement.style.display = 'block';

        console.log(`✅ Weather loaded: ${temp}°C`);

    } catch (error) {
        console.error('❌ Weather loading failed:', error.message);

        let errorMessage = '⚠️ Wetter konnte nicht geladen werden';

        if (error.message.includes('not configured')) {
            errorMessage = '⚠️ Wetter-API nicht konfiguriert';
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = '⚠️ Ungültiger Wetter-API-Schlüssel';
        } else if (error.message.includes('City not found')) {
            errorMessage = '⚠️ Stadt nicht gefunden';
        }

        showError(errorMessage);
        tempElement.textContent = 'NaN°C';
        iconElement.style.display = 'none';
    }
}

// ===========================
// UHRZEIT & DATUM
// ===========================

function updateCurrentTime() {
    const now = new Date();

    // Uhrzeit (HH:MM:SS)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}:${seconds}`;

    // Wochentag (TR / DE)
    const dayIndex = now.getDay();
    const dayTr = DAY_NAMES.tr[dayIndex];
    const dayDe = DAY_NAMES.de[dayIndex];
    document.getElementById('current-day').textContent = `${dayTr} / ${dayDe}`;

    // Datum (DD/MM/YYYY)
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    document.getElementById('current-date').textContent = `${day}/${month}/${year}`;

    // Hijri-Datum (aus der Gebetszeiten-API)
    updateIslamicDate();
}

function updateIslamicDate() {
    const el = document.getElementById('islamic-date');
    if (!el) return;

    if (dayInfo?.hijriLong && dayInfo.hijriLong.trim() !== '') {
        el.textContent = dayInfo.hijriLong;
        return;
    }

    el.textContent = '-- ----- ----';
}

// ===========================
// ANKÜNDIGUNGEN
// ===========================

function updateAnnouncements() {
    const trWrapper = document.getElementById('announcement-tr-wrapper');
    const deWrapper = document.getElementById('announcement-de-wrapper');
    const trText = document.getElementById('announcement-tr');
    const deText = document.getElementById('announcement-de');
    const announcementsCard = document.getElementById('announcements');

    let hasAnnouncements = false;

    // Türkisch
    if (config.announcement_turkish && config.announcement_turkish.trim() !== '') {
        trText.textContent = config.announcement_turkish;
        trWrapper.classList.remove('hidden');
        hasAnnouncements = true;
    } else {
        trWrapper.classList.add('hidden');
    }

    // Deutsch
    if (config.announcement_german && config.announcement_german.trim() !== '') {
        deText.textContent = config.announcement_german;
        deWrapper.classList.remove('hidden');
        hasAnnouncements = true;
    } else {
        deWrapper.classList.add('hidden');
    }

    // Karte ein-/ausblenden
    if (hasAnnouncements) {
        announcementsCard.classList.remove('hidden');
        announcementsCard.classList.add('show');
    } else {
        announcementsCard.classList.add('hidden');
        announcementsCard.classList.remove('show');
    }
}

// ===========================
// UHR-UPDATE & TIMER
// ===========================

function startClocks() {
    // Uhr & Datum (jede Sekunde)
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Countdown (jede Sekunde)
    updateNextPrayerTimer();
    setInterval(updateNextPrayerTimer, 1000);

    // Nächstes Gebet regelmäßig neu berechnen
    setInterval(updateNextPrayer, 60000);
}

// ===========================
// AUTO-REFRESH
// ===========================

function setupAutoRefresh() {
    // Seite bei :00, :10, :20, :30, :40, :50 neu laden
    setInterval(() => {
        const now = new Date();
        const minutes = now.getMinutes();

        if (minutes % 10 === 0) {
            console.log('🔄 Auto-refreshing page at', now.toLocaleTimeString('de-DE'));
            location.reload();
        }
    }, 60000);
}

// ===========================
// APP STARTEN
// ===========================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}