// ===================================================
// 🌙 RAMADAN MODUL
// Theme-Wechsel, Sahur/Iftar, Tag-Zähler, Countdowns
// ===================================================

const RamadanModule = (function () {

    // Bekannte Ramadan-Daten (Fallback wenn API keine Hijri-Daten liefert)
    // Jedes Jahr manuell aktualisieren ODER ramadan_start/end in config.json setzen
    const RAMADAN_DATES = {
        2025: { start: '2025-03-01', end: '2025-03-30', days: 30 },
        2026: { start: '2026-02-18', end: '2026-03-19', days: 30 }
    };

    let isRamadan = false;
    let ramadanDay = 0;
    let ramadanTotal = 30; // wird dynamisch auf 29 oder 30 gesetzt
    let iftarCountdownInterval = null;
    let sahurCountdownInterval = null;

    // ===========================
    // INITIALISIERUNG
    // ===========================

    function init(config, prayerTimes, dayInfo) {
        console.log('🌙 Ramadan module initializing...');

        const themeMode = config.theme || 'auto';

        if (themeMode === 'ramadan') {
            isRamadan = true;
        } else if (themeMode === 'default') {
            isRamadan = false;
        } else {
            isRamadan = detectRamadan(config, dayInfo);
        }

        if (isRamadan) {
            // Ramadan-Tag und Gesamttage berechnen
            const result = calculateRamadanDayAndTotal(config, dayInfo);
            ramadanDay = result.day;
            ramadanTotal = result.total;

            activateRamadanTheme(prayerTimes);
            console.log(`✅ Ramadan theme active – Tag ${ramadanDay}/${ramadanTotal}`);
        } else {
            deactivateRamadanTheme();
            console.log('ℹ️ Default theme active');
        }

        setupThemeSwitch(config, prayerTimes, dayInfo);
        return isRamadan;
    }

    // ===========================
    // RAMADAN ERKENNUNG
    // ===========================

    function detectRamadan(config, dayInfo) {
        // 1) Hijri-Datum aus API prüfen
        if (dayInfo && dayInfo.hijriLong) {
            const hijriText = dayInfo.hijriLong.toLowerCase();
            if (hijriText.includes('ramazan') || hijriText.includes('ramadan') || hijriText.includes('رمضان')) {
                console.log('🌙 Ramadan detected via Hijri date:', dayInfo.hijriLong);
                return true;
            }
        }

        // 2) Config-Daten prüfen
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (config.ramadan_start && config.ramadan_end) {
            const start = new Date(config.ramadan_start);
            const end = new Date(config.ramadan_end);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (today >= start && today <= end) {
                console.log('🌙 Ramadan detected via config dates');
                return true;
            }
        }

        // 3) Eingebaute Daten
        const year = today.getFullYear();
        const yearData = RAMADAN_DATES[year];
        if (yearData) {
            const start = new Date(yearData.start);
            const end = new Date(yearData.end);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (today >= start && today <= end) {
                console.log('🌙 Ramadan detected via built-in dates');
                return true;
            }
        }

        return false;
    }

    // ===========================
    // RAMADAN-TAG & GESAMTTAGE BERECHNEN
    // ===========================

    function calculateRamadanDayAndTotal(config, dayInfo) {
        let day = 1;
        let total = 30;

        // ---- Methode 1: Hijri-Datum aus der API auslesen ----
        // Format z.B. "1 Ramazan 1447" oder "15 Ramazan 1446"
        if (dayInfo && dayInfo.hijriLong) {
            const match = dayInfo.hijriLong.match(/(\d+)\s+(ramazan|ramadan)/i);
            if (match) {
                day = parseInt(match[1], 10);
                // Gesamttage: aus Config oder Berechnung von Start→Ende
                total = calculateTotalFromConfig(config);
                console.log(`🌙 Ramadan day from Hijri: ${day}/${total}`);
                return { day: Math.max(1, Math.min(day, total)), total };
            }
        }

        // Auch kurzes Hijri-Datum versuchen (z.B. "01.09.1447")
        if (dayInfo && dayInfo.hijriShort) {
            const shortMatch = dayInfo.hijriShort.match(/(\d+)\.(\d+)\.(\d+)/);
            if (shortMatch) {
                const hijriDay = parseInt(shortMatch[1], 10);
                const hijriMonth = parseInt(shortMatch[2], 10);
                // Ramadan = Monat 9 im Hijri-Kalender
                if (hijriMonth === 9) {
                    day = hijriDay;
                    total = calculateTotalFromConfig(config);
                    console.log(`🌙 Ramadan day from Hijri short: ${day}/${total}`);
                    return { day: Math.max(1, Math.min(day, total)), total };
                }
            }
        }

        // ---- Methode 2: Aus Start-/Enddaten berechnen ----
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = null;
        let endDate = null;

        if (config.ramadan_start) {
            startDate = new Date(config.ramadan_start);
            startDate.setHours(0, 0, 0, 0);
        }
        if (config.ramadan_end) {
            endDate = new Date(config.ramadan_end);
            endDate.setHours(0, 0, 0, 0);
        }

        // Fallback: eingebaute Daten
        if (!startDate || !endDate) {
            const year = today.getFullYear();
            const yearData = RAMADAN_DATES[year];
            if (yearData) {
                if (!startDate) startDate = new Date(yearData.start);
                if (!endDate) endDate = new Date(yearData.end);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
            }
        }

        if (startDate && endDate) {
            // Gesamttage = Differenz in Tagen + 1
            const diffMs = endDate - startDate;
            total = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
            // Sicherheitscheck: muss 29 oder 30 sein
            if (total < 29) total = 29;
            if (total > 30) total = 30;

            const dayDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
            day = Math.max(1, Math.min(dayDiff, total));
        }

        console.log(`🌙 Ramadan day calculated: ${day}/${total}`);
        return { day, total };
    }

    function calculateTotalFromConfig(config) {
        // Versuche Gesamttage aus Config-Daten zu berechnen
        let startDate = null;
        let endDate = null;

        if (config.ramadan_start && config.ramadan_end) {
            startDate = new Date(config.ramadan_start);
            endDate = new Date(config.ramadan_end);
        }

        if (!startDate || !endDate) {
            const year = new Date().getFullYear();
            const yearData = RAMADAN_DATES[year];
            if (yearData) {
                if (!startDate) startDate = new Date(yearData.start);
                if (!endDate) endDate = new Date(yearData.end);
            }
        }

        if (startDate && endDate) {
            const total = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            if (total >= 29 && total <= 30) return total;
        }

        return 30; // Fallback
    }

    // ===========================
    // THEME AKTIVIEREN / DEAKTIVIEREN
    // ===========================

    function activateRamadanTheme(prayerTimes) {
        document.body.classList.add('theme-ramadan');
        updateDayCounter();
        updateBanner();
        markSahurCard(prayerTimes);
        markIftarCard(prayerTimes);
        startIftarCountdown(prayerTimes);
        startSahurCountdown(prayerTimes);
    }

    function deactivateRamadanTheme() {
        document.body.classList.remove('theme-ramadan');
        if (iftarCountdownInterval) { clearInterval(iftarCountdownInterval); iftarCountdownInterval = null; }
        if (sahurCountdownInterval) { clearInterval(sahurCountdownInterval); sahurCountdownInterval = null; }
        document.querySelectorAll('.card--sahur').forEach(c => c.classList.remove('card--sahur'));
        document.querySelectorAll('.card--iftar').forEach(c => c.classList.remove('card--iftar'));
    }

    // ===========================
    // TAG-ZÄHLER
    // ===========================

    function updateDayCounter() {
        const textEl = document.querySelector('.ramadan-day-counter__text');
        const labelEl = document.querySelector('.ramadan-day-counter__label');
        if (textEl) textEl.textContent = `${ramadanDay} / ${ramadanTotal}`;
        if (labelEl) labelEl.textContent = 'Ramazan Günü';
    }

    // ===========================
    // BANNER
    // ===========================

    function updateBanner() {
        const titleEl = document.querySelector('.ramadan-banner__title');
        const subtitleEl = document.querySelector('.ramadan-banner__subtitle');
        if (titleEl) titleEl.textContent = 'RAMAZAN AYIMIZ MÜBAREK OLSUN';
        if (subtitleEl) subtitleEl.textContent = 'Gesegneter Ramadan · Ramadan Mubarak';
    }

    // ===========================
    // SAHUR-KARTE (IMSAK) + 15 MIN
    // ===========================

    function markSahurCard(prayerTimes) {
        const imsakCard = document.getElementById('prayer-imsak')?.closest('.card');
        if (!imsakCard) return;
        imsakCard.classList.add('card--sahur');

        if (prayerTimes.imsak && !imsakCard.querySelector('.sahur-note')) {
            const content = imsakCard.querySelector('.card__content');
            if (content) {
                const mosqueTime = addMinutes(prayerTimes.imsak, 15);

                const noteEl = document.createElement('div');
                noteEl.className = 'sahur-note';
                noteEl.textContent = 'Cemaatle / In der Moschee';

                const timeEl = document.createElement('div');
                timeEl.className = 'sahur-mosque-time';
                timeEl.textContent = `🕌 ${mosqueTime}`;

                content.appendChild(noteEl);
                content.appendChild(timeEl);
            }
        }
    }

    // ===========================
    // IFTAR-KARTE (AKSAM)
    // ===========================

    function markIftarCard(prayerTimes) {
        const aksamCard = document.getElementById('prayer-aksam')?.closest('.card');
        if (!aksamCard) return;
        aksamCard.classList.add('card--iftar');

        if (!aksamCard.querySelector('.iftar-countdown-badge')) {
            const content = aksamCard.querySelector('.card__content');
            if (content) {
                const badge = document.createElement('div');
                badge.className = 'iftar-countdown-badge';
                badge.innerHTML = `
                    <span class="iftar-countdown-badge__icon">🌅</span>
                    <span class="iftar-countdown-badge__time" id="iftar-mini-countdown">--:--:--</span>
                `;
                content.appendChild(badge);
            }
        }
    }

    // ===========================
    // COUNTDOWNS
    // ===========================

    function startIftarCountdown(prayerTimes) {
        if (iftarCountdownInterval) clearInterval(iftarCountdownInterval);

        function update() {
            if (!prayerTimes.aksam) return;
            const now = new Date();
            const [h, m] = prayerTimes.aksam.split(':').map(Number);
            const iftarSec = h * 3600 + m * 60;
            const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            let diff = iftarSec - nowSec;
            const miniEl = document.getElementById('iftar-mini-countdown');

            if (diff <= 0) {
                if (miniEl) miniEl.textContent = 'İftar Vakti! ✨';
                return;
            }

            const hrs = Math.floor(diff / 3600);
            const mins = Math.floor((diff % 3600) / 60);
            const secs = diff % 60;
            if (miniEl) miniEl.textContent = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        }

        update();
        iftarCountdownInterval = setInterval(update, 1000);
    }

    function startSahurCountdown(prayerTimes) {
        if (sahurCountdownInterval) clearInterval(sahurCountdownInterval);
        const sahurSection = document.querySelector('.sahur-countdown-section');
        if (!sahurSection) return;

        function update() {
            if (!prayerTimes.imsak) return;
            const now = new Date();
            const [h, m] = prayerTimes.imsak.split(':').map(Number);
            const imsakSec = h * 3600 + m * 60;
            const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

            // Sahur-Countdown nur zwischen Mitternacht und Imsak
            if (nowSec < imsakSec && now.getHours() < 12) {
                let diff = imsakSec - nowSec;
                const hrs = Math.floor(diff / 3600);
                const mins = Math.floor((diff % 3600) / 60);
                const secs = diff % 60;
                const timeEl = sahurSection.querySelector('.sahur-countdown-section__time');
                if (timeEl) timeEl.textContent = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
                sahurSection.classList.add('active');
            } else {
                sahurSection.classList.remove('active');
            }
        }

        update();
        sahurCountdownInterval = setInterval(update, 1000);
    }

    // ===========================
    // HILFSFUNKTIONEN
    // ===========================

    function addMinutes(timeStr, minutesToAdd) {
        const [h, m] = timeStr.split(':').map(Number);
        let total = h * 60 + m + minutesToAdd;
        return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
    }

    // ===========================
    // THEME-SWITCH
    // ===========================

    function setupThemeSwitch(config, prayerTimes, dayInfo) {
        const btn = document.querySelector('.theme-switch');
        if (!btn) return;
        updateSwitchLabel(btn);

        btn.addEventListener('click', () => {
            if (document.body.classList.contains('theme-ramadan')) {
                deactivateRamadanTheme();
                isRamadan = false;
            } else {
                isRamadan = true;
                const result = calculateRamadanDayAndTotal(config, dayInfo);
                ramadanDay = result.day;
                ramadanTotal = result.total;
                activateRamadanTheme(prayerTimes);
            }
            updateSwitchLabel(btn);
        });
    }

    function updateSwitchLabel(btn) {
        if (!btn) return;
        btn.textContent = document.body.classList.contains('theme-ramadan')
            ? '☀️ Standard Theme'
            : '🌙 Ramadan Theme';
    }

    // ===========================
    // PUBLIC API
    // ===========================

    return {
        init,
        isRamadan: () => isRamadan,
        getRamadanDay: () => ramadanDay,
        getRamadanTotal: () => ramadanTotal
    };

})();