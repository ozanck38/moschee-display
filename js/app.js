/**
 * ═══════════════════════════════════════════════════════════
 * MOSCHEE-DISPLAY – HAUPTLOGIK v4
 * ═══════════════════════════════════════════════════════════
 */

let config = {};
let prayerTimes = {};
let nextPrayerInfo = null;
let dayInfo = null;

const PRAYER_NAMES = {
    imsak: { tr: 'İMSAK', en: 'FAJR' }, gunes: { tr: 'GÜNEŞ', en: 'SUNRISE' },
    ogle: { tr: 'ÖĞLE', en: 'DHUHR' }, ikindi: { tr: 'İKİNDİ', en: 'ASR' },
    aksam: { tr: 'AKŞAM', en: 'MAGHRIB' }, yatsi: { tr: 'YATSI', en: 'ISHA' }
};

const DAY_NAMES = {
    tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
    de: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
};

const PRAYER_ORDER = ['imsak','gunes','ogle','ikindi','aksam','yatsi'];

/** Zentrale Zeit – nutzt Debug-Overrides wenn vorhanden */
function now() {
    return (typeof RamadanModule !== 'undefined' && RamadanModule.getNow)
        ? RamadanModule.getNow()
        : new Date();
}

function showError(msg) {
    const el = document.createElement('div');
    el.className = 'error-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// ── Init ───────────────────────────────────────────────
async function init() {
    console.log('[Display] Init...');
    try {
        await loadConfig();
        updateMosqueInfo();
        await loadPrayerTimes();
        await loadWeather();
        updateAnnouncements();
        startClocks();
        setupAutoRefresh();

        if (typeof RamadanModule !== 'undefined') {
            RamadanModule.init(config, prayerTimes, dayInfo);
        }
        console.log('[Display] Fertig');
    } catch (e) { console.error('[Display]', e); }
}

// ── Config ─────────────────────────────────────────────
async function loadConfig() {
    try {
        if (window.MOSQUE_CONFIG) { config = window.MOSQUE_CONFIG; return; }
        const res = await fetch(`config.json?v=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type');
        config = ct?.includes('application/json') ? await res.json() : JSON.parse(await res.text());
    } catch (e) {
        console.error('[Config]', e);
        config = { mosque_name:'Aksa Camii', city:'Wedel', city_code:'10339',
            announcement_turkish:'', announcement_german:'', openweather_api_key:'' };
    }
}

function updateMosqueInfo() {
    const s = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    s('mosque-name', config.mosque_name); s('city-name', config.city); s('city-name-sub', config.city);
}

// ── Gebetszeiten ───────────────────────────────────────
async function loadPrayerTimes() {
    try {
        const res = await fetch(`https://ezanvakti.emushaf.net/vakitler/${config.city_code}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) throw new Error('Keine Daten');

        const today = now();
        const str = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
        const d = data.find(x => x.MiladiTarihKisaIso8601 === str) || data[0];

        dayInfo = { hijriLong: d.HicriTarihUzun||'', hijriShort: d.HicriTarihKisa||'', miladiShort: d.MiladiTarihKisaIso8601||'' };

        ['Imsak','Gunes','Ogle','Ikindi','Aksam','Yatsi'].forEach(f => { if (!d[f]) throw new Error(`Fehlt: ${f}`); });

        prayerTimes = { imsak:d.Imsak, gunes:d.Gunes, ogle:d.Ogle, ikindi:d.Ikindi, aksam:d.Aksam, yatsi:d.Yatsi };
        updatePrayerTimesDisplay();
        console.log('[Gebetszeiten]', prayerTimes);
    } catch (e) {
        console.error('[Gebetszeiten]', e.message);
        showError('Gebetszeiten konnten nicht geladen werden');
        prayerTimes = { imsak:'05:30', gunes:'07:15', ogle:'12:30', ikindi:'15:00', aksam:'17:45', yatsi:'19:30' };
        dayInfo = null;
        updatePrayerTimesDisplay();
    }
}

function updatePrayerTimesDisplay() {
    PRAYER_ORDER.forEach(p => { const el = document.getElementById(`prayer-${p}`); if (el) el.textContent = prayerTimes[p]; });
    updateIslamicDate();
    calcNextPrayer();
}

// ── Nächstes Gebet ─────────────────────────────────────

/** Berechnet welches Gebet als nächstes kommt */
function calcNextPrayer() {
    const n = now();
    const cur = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
    const ps = {};
    PRAYER_ORDER.forEach(p => { const [h,m] = prayerTimes[p].split(':').map(Number); ps[p] = h*3600+m*60; });

    let next = null, min = Infinity;
    PRAYER_ORDER.forEach(p => { let d = ps[p]-cur; if (d<0) d+=86400; if (d<min) { min=d; next=p; } });

    nextPrayerInfo = { name: next, targetSec: ps[next] };

    const el = document.getElementById('next-prayer-name');
    const pn = PRAYER_NAMES[next];
    if (el && pn) el.textContent = `${pn.tr} - ${pn.en}`;
    highlightCurrentPrayer(next);
}

/**
 * SYNCHRONER TICK: Uhr + Countdown werden im selben Moment berechnet
 * aus der aktuellen Zeit. Kein separater Counter der driften kann.
 */
function tick() {
    const n = now();
    const pad = v => String(v).padStart(2, '0');

    // ── Uhr ──
    document.getElementById('current-time').textContent =
        `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

    const di = n.getDay();
    document.getElementById('current-day').textContent = `${DAY_NAMES.tr[di]} / ${DAY_NAMES.de[di]}`;
    document.getElementById('current-date').textContent = `${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()}`;

    updateIslamicDate();

    // ── Countdown ──
    if (nextPrayerInfo) {
        const curSec = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
        let diff = nextPrayerInfo.targetSec - curSec;
        if (diff < 0) diff += 86400;

        // Bei 0 → nächstes Gebet neu berechnen
        if (diff <= 0 || diff > 86399) { calcNextPrayer(); return; }

        const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
        const el = document.getElementById('next-prayer-timer');
        if (el) {
            el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
            el.classList.toggle('info__clock--urgent', diff < 300);
        }
    }
}

function highlightCurrentPrayer(next) {
    document.querySelectorAll('.card[data-prayer]').forEach(c => c.classList.remove('card--active'));
    const i = PRAYER_ORDER.indexOf(next);
    const ci = i > 0 ? i-1 : PRAYER_ORDER.length-1;
    const c = document.querySelector(`[data-prayer="${PRAYER_ORDER[ci]}"]`);
    if (c) c.classList.add('card--active');
    const info = document.querySelector('.card--info');
    if (info) info.classList.add('card--active');
}

// ── Wetter ─────────────────────────────────────────────
async function loadWeather() {
    const tEl = document.getElementById('weather-temp'), iEl = document.getElementById('weather-icon');
    try {
        let data = null;
        try { const r = await fetch(`/.netlify/functions/weather?city=${encodeURIComponent(config.city)}`); if (r.ok) data = await r.json(); } catch(_){}
        if (!data) {
            const k = config.openweather_api_key;
            if (!k || k==='YOUR_API_KEY_HERE' || !k.trim()) throw new Error('Kein Key');
            const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.city)}&units=metric&appid=${k}&lang=de`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            data = await r.json();
        }
        if (!data?.main?.temp || !data?.weather?.[0]) throw new Error('Ungültig');
        tEl.textContent = `${Math.round(data.main.temp)}°C`;
        iEl.src = `images/weather/${data.weather[0].icon}.png`;
        iEl.style.display = 'block';
    } catch (e) {
        console.error('[Wetter]', e.message);
        tEl.textContent = '--°C'; iEl.style.display = 'none';
    }
}

function updateIslamicDate() {
    const el = document.getElementById('islamic-date');
    if (el) el.textContent = dayInfo?.hijriLong?.trim() || '-- ----- ----';
}

// ── Ankündigungen ──────────────────────────────────────
function updateAnnouncements() {
    const trW = document.getElementById('announcement-tr-wrapper'), deW = document.getElementById('announcement-de-wrapper');
    const trT = document.getElementById('announcement-tr'), deT = document.getElementById('announcement-de');
    const box = document.getElementById('announcements');
    let has = false;

    if (config.announcement_turkish?.trim()) { trT.textContent = config.announcement_turkish; trW.classList.remove('hidden'); has = true; }
    else trW.classList.add('hidden');
    if (config.announcement_german?.trim()) { deT.textContent = config.announcement_german; deW.classList.remove('hidden'); has = true; }
    else deW.classList.add('hidden');

    box.classList.toggle('show', has);
    box.classList.toggle('hidden', !has);
}

// ── Start ──────────────────────────────────────────────
function startClocks() {
    tick(); // Sofort einmal
    setInterval(tick, 1000); // Einziger Interval für BEIDES
    setInterval(calcNextPrayer, 60000); // Recalc alle 60s
}

function setupAutoRefresh() {
    setInterval(() => { if (new Date().getMinutes() % 10 === 0) location.reload(); }, 60000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
