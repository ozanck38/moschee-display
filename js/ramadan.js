/**
 * ═══════════════════════════════════════════════════════════
 * RAMADAN MODUL v4
 * ═══════════════════════════════════════════════════════════
 *
 * DEBUG (Browser-Konsole):
 *   RamadanModule.debug.setDate('2026-02-20')   → Datum simulieren
 *   RamadanModule.debug.setTime('17:30')         → Uhrzeit simulieren
 *   RamadanModule.debug.reset()                  → Zurück auf Echtzeit
 *   RamadanModule.debug.forceTheme('ramadan')    → Theme erzwingen
 *   RamadanModule.debug.forceTheme('default')    → Standard erzwingen
 *   RamadanModule.debug.status()                 → Status anzeigen
 */

const RamadanModule = (function () {
    'use strict';

    // ── Ramadan-Daten 2025–2035 (Diyanet) ─────────────
    const RAMADAN_DATES = [
        { hijri: 1446, start: '2025-03-01', end: '2025-03-29', days: 29 },
        { hijri: 1447, start: '2026-02-19', end: '2026-03-19', days: 29 },
        { hijri: 1448, start: '2027-02-08', end: '2027-03-08', days: 29 },
        { hijri: 1449, start: '2028-01-28', end: '2028-02-25', days: 29 },
        { hijri: 1450, start: '2029-01-16', end: '2029-02-13', days: 29 },
        { hijri: 1451, start: '2030-01-05', end: '2030-02-03', days: 30 },
        { hijri: 1452, start: '2030-12-26', end: '2031-01-23', days: 29 },
        { hijri: 1453, start: '2031-12-15', end: '2032-01-13', days: 30 },
        { hijri: 1454, start: '2032-12-04', end: '2033-01-01', days: 29 },
        { hijri: 1455, start: '2033-11-23', end: '2033-12-22', days: 30 },
        { hijri: 1456, start: '2034-11-12', end: '2034-12-11', days: 30 },
        { hijri: 1457, start: '2035-11-01', end: '2035-11-30', days: 30 }
    ];

    let _isRamadan = false, _ramadanDay = 0, _ramadanTotal = 30;
    let _intervals = [], _config = {}, _prayerTimes = {}, _dayInfo = null;
    let _starsGenerated = false;
    let _debugDate = null, _debugTime = null;

    // ══════════════════════════════════════════════════
    // GLOBALE ZEIT (genutzt von app.js)
    // ══════════════════════════════════════════════════

    function getNow() {
        const real = new Date();
        if (!_debugDate && !_debugTime) return real;
        let d;
        if (_debugDate) {
            d = new Date(_debugDate + 'T' +
                String(real.getHours()).padStart(2,'0') + ':' +
                String(real.getMinutes()).padStart(2,'0') + ':' +
                String(real.getSeconds()).padStart(2,'0'));
        } else {
            d = new Date(real);
        }
        if (_debugTime) {
            const [h, m] = _debugTime.split(':').map(Number);
            d.setHours(h, m, real.getSeconds());
        }
        return d;
    }

    function _todayMidnight() {
        const d = getNow(); d.setHours(0,0,0,0); return d;
    }

    // ══════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════

    function init(config, prayerTimes, dayInfo) {
        _config = config; _prayerTimes = prayerTimes; _dayInfo = dayInfo;
        console.log('[Ramadan] Init...');

        const mode = config.theme || 'auto';
        if (mode === 'ramadan') _isRamadan = true;
        else if (mode === 'default') _isRamadan = false;
        else _isRamadan = _detect(config, dayInfo);

        if (_isRamadan) {
            const r = _calcDay(config, dayInfo);
            _ramadanDay = r.day; _ramadanTotal = r.total;
            _activate();
            console.log(`[Ramadan] Tag ${_ramadanDay}/${_ramadanTotal}`);
        } else {
            _deactivate();
            console.log('[Ramadan] Standard-Theme');
        }
        return _isRamadan;
    }

    // ── Erkennung ──────────────────────────────────────
    function _detect(config, dayInfo) {
        if (dayInfo?.hijriLong) {
            const t = dayInfo.hijriLong.toLowerCase();
            if (t.includes('ramazan') || t.includes('ramadan') || t.includes('رمضان')) return true;
        }
        const today = _todayMidnight();
        if (config.ramadan_start && config.ramadan_end) {
            const s = _pd(config.ramadan_start), e = _pd(config.ramadan_end);
            e.setHours(23,59,59,999);
            if (today >= s && today <= e) return true;
        }
        return !!_findRange(today);
    }

    function _findRange(date) {
        for (const e of RAMADAN_DATES) {
            const s = _pd(e.start), en = _pd(e.end);
            en.setHours(23,59,59,999);
            if (date >= s && date <= en) return e;
        }
        return null;
    }

    // ── Tag berechnen ──────────────────────────────────
    function _calcDay(config, dayInfo) {
        let day = 1, total = 30;
        if (dayInfo?.hijriLong) {
            const m = dayInfo.hijriLong.match(/(\d+)\s+(ramazan|ramadan)/i);
            if (m) { day = +m[1]; total = _getTotal(config); return { day: _clamp(day,1,total), total }; }
        }
        if (dayInfo?.hijriShort) {
            const m = dayInfo.hijriShort.match(/(\d+)\.(\d+)\.(\d+)/);
            if (m && +m[2] === 9) { day = +m[1]; total = _getTotal(config); return { day: _clamp(day,1,total), total }; }
        }
        const today = _todayMidnight();
        const range = _getRange(config);
        if (range) { total = range.total; day = _clamp(Math.floor((today - range.start) / 86400000) + 1, 1, total); }
        return { day, total };
    }

    function _getRange(config) {
        let s = null, e = null;
        if (config.ramadan_start && config.ramadan_end) { s = _pd(config.ramadan_start); e = _pd(config.ramadan_end); }
        if (!s || !e) { const b = _findRange(_todayMidnight()); if (b) { s = s||_pd(b.start); e = e||_pd(b.end); } }
        if (!s || !e) return null;
        return { start: s, end: e, total: _clamp(Math.round((e-s)/86400000)+1, 29, 30) };
    }

    function _getTotal(config) { const r = _getRange(config); return r ? r.total : 30; }

    // ══════════════════════════════════════════════════
    // THEME AKTIVIEREN / DEAKTIVIEREN
    // ══════════════════════════════════════════════════

    function _activate() {
        document.body.classList.add('theme-ramadan');
        _clearIntervals();

        const dayEl = document.getElementById('ramadan-day-text');
        if (dayEl) dayEl.textContent = `${_ramadanDay} / ${_ramadanTotal}`;

        _setupHints();
        _setupIftarCountdown();
        _generateStars();
    }

    function _deactivate() {
        document.body.classList.remove('theme-ramadan');
        _clearIntervals();
        // Hints entfernen
        document.querySelectorAll('.card__hint').forEach(h => { h.classList.remove('card__hint--visible'); h.classList.add('card__hint--hidden'); });
        document.querySelectorAll('.card--sahur, .card--iftar').forEach(c => c.classList.remove('card--sahur', 'card--iftar'));
    }

    // ══════════════════════════════════════════════════
    // HINTS
    // Nur die genutzten Kacheln bekommen sichtbare Hints.
    // card__hint ist im HTML mit display:none, wird per
    // JS auf card__hint--visible gesetzt.
    // ══════════════════════════════════════════════════

    function _setupHints() {
        // İmsak: Cemaatle 15 dk sonra
        _setHint('imsak', 'sahur', 'Cemaatle / In der Moschee',
            `<svg class="card__hint-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5v6l5.25 3.15.75-1.23-4.5-2.67V7h-1.5z"/></svg><span>${_addMin(_prayerTimes.imsak, 15)}</span>`
        );

        // Öğle: Sonra Mukabele
        _setHint('ogle', null, 'Sonra / Danach',
            `<svg class="card__hint-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg><span>Mukabele</span>`
        );

        // Yatsı: 15 dk önce Sohbet
        _setHint('yatsi', null, '15 dk önce Sohbet',
            `<svg class="card__hint-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5v6l5.25 3.15.75-1.23-4.5-2.67V7h-1.5z"/></svg><span>${_addMin(_prayerTimes.yatsi, -15)}</span>`
        );
    }

    function _setHint(prayer, cardClass, line1, line2Html) {
        const card = document.querySelector(`[data-prayer="${prayer}"]`);
        if (!card) return;
        if (cardClass) card.classList.add(`card--${cardClass}`);

        const hint = card.querySelector('.card__hint');
        if (!hint) return;

        hint.classList.remove('card__hint--hidden');
        hint.classList.add('card__hint--visible');

        const l1 = hint.querySelector('.card__hint-line1');
        const l2 = hint.querySelector('.card__hint-line2');
        if (l1) l1.textContent = line1;
        if (l2) l2.innerHTML = line2Html.trim();
    }

    // ══════════════════════════════════════════════════
    // IFTAR COUNTDOWN
    // ══════════════════════════════════════════════════

    function _setupIftarCountdown() {
        const card = document.querySelector('[data-prayer="aksam"]');
        if (!card) return;
        card.classList.add('card--iftar');

        const hint = card.querySelector('.card__hint');
        if (!hint) return;

        hint.classList.add('card__hint--iftar');

        const l1 = hint.querySelector('.card__hint-line1');
        const l2 = hint.querySelector('.card__hint-line2');
        if (l1) l1.textContent = 'İftar';
        if (l2) l2.innerHTML = `<span id="iftar-mini-countdown">--:--:--</span>`;

        const updateFn = () => {
            if (!_prayerTimes.aksam || !_prayerTimes.imsak) return;
            const n = getNow();
            const nowSec = n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds();
            const imsakSec = _pts(_prayerTimes.imsak);
            const aksamSec = _pts(_prayerTimes.aksam);
            const el = document.getElementById('iftar-mini-countdown');
            if (!el) return;

            if (nowSec >= imsakSec && nowSec < aksamSec) {
                hint.classList.remove('card__hint--hidden');
                hint.classList.add('card__hint--visible');
                el.textContent = _fmtCD(aksamSec - nowSec);
            } else {
                hint.classList.remove('card__hint--visible');
                hint.classList.add('card__hint--hidden');
            }
        };

        updateFn();
        _intervals.push(setInterval(updateFn, 1000));
    }

    // ══════════════════════════════════════════════════
    // STERNE (genau dein Code)
    // ══════════════════════════════════════════════════

    function _generateStars() {
        if (_starsGenerated) return;
        const container = document.querySelector('.ramadan-stars');
        if (!container) return;

        for (let i = 0; i < 45; i++) {
            const s = document.createElement('div');
            s.className = 'ramadan-star';
            s.style.left = `${Math.random() * 100}%`;
            s.style.top = `${Math.random() * 80}%`;

            const size = 1.5 + Math.random() * 3;
            s.style.width = `${size}px`;
            s.style.height = `${size}px`;
            s.style.setProperty('--dur', `${2 + Math.random() * 5}s`);
            s.style.setProperty('--del', `${Math.random() * 6}s`);
            s.style.setProperty('--br', `${0.25 + Math.random() * 0.45}`);

            container.appendChild(s);
        }
        _starsGenerated = true;
    }

    // ══════════════════════════════════════════════════
    // DEBUG
    // ══════════════════════════════════════════════════

    const debug = {
        setDate(dateStr) {
            _debugDate = dateStr;
            console.log(`[Debug] Datum: ${dateStr}`);
            init(_config, _prayerTimes, _dayInfo);
        },
        setTime(timeStr) {
            _debugTime = timeStr;
            console.log(`[Debug] Uhrzeit: ${timeStr}`);
        },
        reset() {
            _debugDate = null; _debugTime = null;
            console.log('[Debug] Reset');
            init(_config, _prayerTimes, _dayInfo);
        },
        forceTheme(mode) {
            if (mode === 'ramadan') {
                _isRamadan = true;
                const r = _calcDay(_config, _dayInfo);
                _ramadanDay = r.day; _ramadanTotal = r.total;
                _activate();
            } else { _isRamadan = false; _deactivate(); }
        },
        status() {
            console.table({ isRamadan: _isRamadan, day: _ramadanDay, total: _ramadanTotal,
                theme: _config.theme, debugDate: _debugDate, debugTime: _debugTime });
        }
    };

    // ── Hilfsfunktionen ────────────────────────────────
    function _addMin(t, m) {
        if (!t) return '--:--';
        const [h, mi] = t.split(':').map(Number);
        let tot = h*60+mi+m; if (tot<0) tot+=1440;
        return `${String(Math.floor(tot/60)%24).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`;
    }
    function _pts(t) { const [h,m] = t.split(':').map(Number); return h*3600+m*60; }
    function _fmtCD(s) { if (s<=0) return '00:00:00'; return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
    function _pd(s) { const d = new Date(s); d.setHours(0,0,0,0); return d; }
    function _clamp(v,a,b) { return Math.max(a, Math.min(v, b)); }
    function _clearIntervals() { _intervals.forEach(clearInterval); _intervals = []; }

    return {
        init, debug, getNow, RAMADAN_DATES,
        isRamadan: () => _isRamadan,
        getRamadanDay: () => _ramadanDay,
        getRamadanTotal: () => _ramadanTotal
    };
})();
