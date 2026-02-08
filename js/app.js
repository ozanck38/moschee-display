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
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Find today's prayer times using MiladiTarihKisaIso8601 format
            const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
            
            const todayData = data.find(d => d.MiladiTarihKisaIso8601 === todayStr);
            
            if (!todayData) {
                console.warn('⚠️ Could not find prayer times for today:', todayStr);
                console.log('📅 Using first available date:', data[0].MiladiTarihKisaIso8601);
            }
            
            const selectedData = todayData || data[0];
            
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
        }
    } catch (error) {
        console.error('❌ Prayer times loading failed:', error);
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
    try {
        // Try Netlify Function first (for production)
        const netlifyUrl = `/.netlify/functions/weather?city=${encodeURIComponent(config.city)}`;
        
        try {
            const response = await fetch(netlifyUrl);
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.main) {
                    const temp = Math.round(data.main.temp);
                    const icon = data.weather[0].icon;
                    
                    document.getElementById('weather-temp').textContent = `${temp}°`;
                    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
                    
                    console.log('✅ Weather loaded via Netlify Function:', temp + '°C');
                    return;
                }
            }
        } catch (netlifyError) {
            console.log('ℹ️ Netlify Function not available, falling back to direct API');
        }
        
        // Fallback: Direct API call (for local development)
        const API_KEY = config.openweather_api_key || 'YOUR_API_KEY_HERE';
        
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            console.warn('⚠️ OpenWeather API key not configured');
            document.getElementById('weather-temp').textContent = '--°';
            return;
        }
        
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${config.city}&units=metric&appid=${API_KEY}&lang=de`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.main) {
            const temp = Math.round(data.main.temp);
            const icon = data.weather[0].icon;
            
            document.getElementById('weather-temp').textContent = `${temp}°C`;
            document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
            
            console.log('✅ Weather loaded via direct API:', temp + '°C');
        }
    } catch (error) {
        console.error('❌ Weather loading failed:', error);
        document.getElementById('weather-temp').textContent = '--°C';
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