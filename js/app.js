// ===========================
// Configuration & State
// ===========================

let config = {};
let prayerTimes = {};
let nextPrayerInfo = null;

// Prayer names mapping
const PRAYER_NAMES = {
    imsak: { tr: 'İmsak', en: 'Fajr' },
    gunes: { tr: 'Güneş', en: 'Sunrise' },
    ogle: { tr: 'Öğle', en: 'Dhuhr' },
    ikindi: { tr: 'İkindi', en: 'Asr' },
    aksam: { tr: 'Akşam', en: 'Maghrib' },
    yatsi: { tr: 'Yatsı', en: 'Isha' }
};

// Turkish/German day names
const DAY_NAMES = {
    tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
};

// Islamic months
const ISLAMIC_MONTHS = {
    1: 'Muharrem', 2: 'Safer', 3: 'Rebiülevvel', 4: 'Rebiülahir',
    5: 'Cemaziyelevvel', 6: 'Cemaziyelahir', 7: 'Recep', 8: 'Şaban',
    9: 'Ramazan', 10: 'Şevval', 11: 'Zilkade', 12: 'Zilhicce'
};

// ===========================
// Error Notification
// ===========================

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ===========================
// Initialization
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
        
        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
}

// ===========================
// Config Loading
// ===========================

async function loadConfig() {
    try {
        // Check if config is loaded from config.js
        if (window.MOSQUE_CONFIG) {
            config = window.MOSQUE_CONFIG;
            console.log('✅ Config loaded from config.js:', config);
            return;
        }
        
        // Fallback: try to fetch config.json
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
        // Fallback config
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
// Mosque Info Update
// ===========================

function updateMosqueInfo() {
    document.getElementById('mosque-name').textContent = config.mosque_name;
    document.getElementById('city-name').textContent = config.city;
    document.getElementById('city-name-sub').textContent = config.city;
}

// ===========================
// Prayer Times
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
        
        // Find today's prayer times using MiladiTarihKisaIso8601 format
        const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
        
        const todayData = data.find(d => d.MiladiTarihKisaIso8601 === todayStr);
        
        if (!todayData) {
            console.warn('⚠️ Could not find prayer times for today:', todayStr);
            console.log('📅 Using first available date:', data[0].MiladiTarihKisaIso8601);
        }
        
        const selectedData = todayData || data[0];
        
        // Validate prayer time data
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
        
        // Show specific error message
        let errorMessage = '⚠️ Gebetszeiten konnten nicht geladen werden';
        
        if (error.message.includes('HTTP')) {
            errorMessage = '⚠️ Gebetszeiten-Server nicht erreichbar';
        } else if (error.message.includes('Invalid')) {
            errorMessage = '⚠️ Ungültige Gebetszeiten-Daten';
        }
        
        showError(errorMessage);
        
        // Set placeholder times
        prayerTimes = {
            imsak: '05:30',
            gunes: '07:15',
            ogle: '12:30',
            ikindi: '15:00',
            aksam: '17:45',
            yatsi: '19:30'
        };
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
    
    updateNextPrayer();
}

// ===========================
// Next Prayer Calculation
// ===========================

function updateNextPrayer() {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    // Convert prayer times to seconds
    const prayerSeconds = {};
    Object.keys(prayerTimes).forEach(prayer => {
        const [hours, minutes] = prayerTimes[prayer].split(':').map(Number);
        prayerSeconds[prayer] = hours * 3600 + minutes * 60;
    });
    
    // Find next prayer
    let nextPrayer = null;
    let minDiff = Infinity;
    
    Object.keys(prayerSeconds).forEach(prayer => {
        let diff = prayerSeconds[prayer] - currentSeconds;
        
        // If prayer time has passed today, it's tomorrow
        if (diff < 0) {
            diff += 24 * 3600;
        }
        
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
    
    // Add urgent state if less than 5 minutes remaining
    if (nextPrayerInfo.secondsUntil < 300) {
        timerElement.classList.add('info__clock--urgent');
    } else {
        timerElement.classList.remove('info__clock--urgent');
    }
    
    // Decrease time by one second
    nextPrayerInfo.secondsUntil -= 1;
    
    if (nextPrayerInfo.secondsUntil <= 0) {
        updateNextPrayer();
    }
}

function highlightCurrentPrayer(nextPrayer) {
    // Remove all active states
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('card--active');
    });
    
    // Find the prayer BEFORE the next one (current prayer period)
    const prayerOrder = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];
    const nextIndex = prayerOrder.indexOf(nextPrayer);
    const currentIndex = nextIndex > 0 ? nextIndex - 1 : prayerOrder.length - 1;
    const currentPrayer = prayerOrder[currentIndex];
    
    // Highlight current prayer card
    const currentCard = document.getElementById(`prayer-${currentPrayer}`)?.closest('.card');
    if (currentCard) {
        currentCard.classList.add('card--active');
    }
    
    // Info card is always active
    const infoCard = document.querySelector('.card--info');
    if (infoCard) {
        infoCard.classList.add('card--active');
    }
}

// ===========================
// Weather
// ===========================

async function loadWeather() {
    const tempElement = document.getElementById('weather-temp');
    const iconElement = document.getElementById('weather-icon');
    
    try {
        // Try Netlify Function first (for production)
        const netlifyUrl = `/.netlify/functions/weather?city=${encodeURIComponent(config.city)}`;
        
        let response;
        let data;
        let isNetlifyFunction = false;
        
        try {
            response = await fetch(netlifyUrl);
            if (response.ok) {
                data = await response.json();
                isNetlifyFunction = true;
                console.log('ℹ️ Using Netlify Function for weather');
            } else {
                throw new Error('Netlify function not available');
            }
        } catch (netlifyError) {
            console.log('ℹ️ Netlify Function not available, trying direct API');
            
            // Fallback: Direct API call (for local development)
            const API_KEY = config.openweather_api_key;
            
            if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || API_KEY.trim() === '') {
                throw new Error('OpenWeather API key not configured');
            }
            
            const directUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.city)}&units=metric&appid=${API_KEY}&lang=de`;
            
            response = await fetch(directUrl);
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API key');
                } else if (response.status === 404) {
                    throw new Error('City not found');
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            }
            
            data = await response.json();
            console.log('ℹ️ Using direct API for weather');
        }
        
        // Process weather data
        if (!data || !data.main || !data.weather || !data.weather[0]) {
            throw new Error('Invalid weather data received');
        }
        
        const temp = Math.round(data.main.temp);
        const icon = data.weather[0].icon;
        
        tempElement.textContent = `${temp}°C`;
        iconElement.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        iconElement.style.display = 'block';
        
        console.log(`✅ Weather loaded: ${temp}°C`);
        
    } catch (error) {
        console.error('❌ Weather loading failed:', error.message);
        
        // Show specific error message
        let errorMessage = '⚠️ Wetter konnte nicht geladen werden';
        
        if (error.message.includes('not configured')) {
            errorMessage = '⚠️ Wetter-API nicht konfiguriert';
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = '⚠️ Ungültiger Wetter-API-Schlüssel';
        } else if (error.message.includes('City not found')) {
            errorMessage = '⚠️ Stadt nicht gefunden';
        }
        
        showError(errorMessage);
        tempElement.textContent = '--°C';
        iconElement.style.display = 'none';
    }
}

// ===========================
// Current Time & Date
// ===========================

function updateCurrentTime() {
    const now = new Date();
    
    // Current time (HH:MM:SS)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}:${seconds}`;
    
    // Day name (Turkish / German)
    const dayIndex = now.getDay();
    const dayTr = DAY_NAMES.tr[dayIndex];
    const dayDe = DAY_NAMES.de[dayIndex];
    document.getElementById('current-day').textContent = `${dayTr} / ${dayDe}`;
    
    // Date (DD/MM/YYYY)
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    document.getElementById('current-date').textContent = `${day}/${month}/${year}`;
    
    // Islamic date
    updateIslamicDate(now);
}

function updateIslamicDate(date) {
    const islamicDate = gregorianToHijri(date);
    const monthName = ISLAMIC_MONTHS[islamicDate.month];
    document.getElementById('islamic-date').textContent = 
        `${islamicDate.day} ${monthName} ${islamicDate.year}`;
}

// Simplified Gregorian to Hijri conversion
function gregorianToHijri(date) {
    const julianDay = Math.floor((date.getTime() / 86400000) + 2440587.5);
    const l = julianDay - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + 
              Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - 
               Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    
    return {
        day: Math.floor(day),
        month: Math.floor(month),
        year: Math.floor(year)
    };
}

// ===========================
// Announcements
// ===========================

function updateAnnouncements() {
    const trWrapper = document.getElementById('announcement-tr-wrapper');
    const deWrapper = document.getElementById('announcement-de-wrapper');
    const trText = document.getElementById('announcement-tr');
    const deText = document.getElementById('announcement-de');
    const announcementsCard = document.getElementById('announcements');
    
    let hasAnnouncements = false;
    
    // Turkish announcement
    if (config.announcement_turkish && config.announcement_turkish.trim() !== '') {
        trText.textContent = config.announcement_turkish;
        trWrapper.classList.remove('hidden');
        hasAnnouncements = true;
    } else {
        trWrapper.classList.add('hidden');
    }
    
    // German announcement
    if (config.announcement_german && config.announcement_german.trim() !== '') {
        deText.textContent = config.announcement_german;
        deWrapper.classList.remove('hidden');
        hasAnnouncements = true;
    } else {
        deWrapper.classList.add('hidden');
    }
    
    // Show/hide announcements card
    if (hasAnnouncements) {
        announcementsCard.classList.remove('hidden');
        announcementsCard.classList.add('show');
    } else {
        announcementsCard.classList.add('hidden');
        announcementsCard.classList.remove('show');
    }
}

// ===========================
// Clock Updates
// ===========================

function startClocks() {
    // Update current time every second
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Update next prayer timer every second
    updateNextPrayerTimer();
    setInterval(updateNextPrayerTimer, 1000);
    
    // Recalculate next prayer every minute
    setInterval(updateNextPrayer, 60000);
}

// ===========================
// Auto Refresh
// ===========================

function setupAutoRefresh() {
    // Reload page at :00, :10, :20, :30, :40, :50 of every hour
    setInterval(() => {
        const now = new Date();
        const minutes = now.getMinutes();
        
        // Check if current minute is a multiple of 10
        if (minutes % 10 === 0) {
            console.log('🔄 Auto-refreshing page at', now.toLocaleTimeString('de-DE'));
            location.reload();
        }
    }, 60000); // Check every minute
}

// ===========================
// Start Application
// ===========================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}