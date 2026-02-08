# 🕌 Moschee Display System

Ein modernes, responsives Display-System für Moscheen mit Gebetszeiten, Wetter und Ankündigungen.

## ✨ Features

- ✅ **Automatische Gebetszeiten** via Diyanet API
- ✅ **Live-Uhr** mit deutscher und türkischer Anzeige
- ✅ **Islamischer Kalender** (Hijri)
- ✅ **Countdown** bis zum nächsten Gebet
- ✅ **Wetter-Widget** mit Live-Temperatur
- ✅ **Zweisprachige Ankündigungen** (Türkisch/Deutsch)
- ✅ **Auto-Refresh** jede halbe Stunde
- ✅ **Responsive Design** für alle Display-Größen (1280×720 bis Full HD+)
- ✅ **Einfache Konfiguration** ohne Code-Kenntnisse

## 📁 Ordnerstruktur

```
moschee-display/
├── index.html              # Hauptdatei
├── config.json             # Konfiguration (HIER ANPASSEN!)
├── css/
│   └── style.css           # Styling
├── js/
│   └── app.js              # JavaScript Logik
├── images/
│   ├── ditib-logo.png
│   ├── background.png
│   ├── noise.jpg
│   ├── logo.svg
│   ├── flag-turkey.png
│   ├── flag-germany.png
│   └── prayers/
│       ├── imsak.png
│       ├── gunes.png
│       ├── ogle.png
│       ├── ikindi.png
│       ├── aksam.png
│       └── yatsi.png
└── README.md
```

## 🚀 Installation & Setup

### 1. Bilder vorbereiten

Benenne deine Bilder wie oben angegeben um und lege sie in den `images/` Ordner.

### 2. OpenWeather API Key holen

1. Gehe zu: https://openweathermap.org/api
2. Erstelle einen **kostenlosen** Account
3. Gehe zu "API keys" und kopiere deinen Key
4. Öffne `js/app.js` und ersetze in Zeile **261**:
   ```javascript
   const API_KEY = 'YOUR_OPENWEATHER_API_KEY';
   ```
   mit deinem echten Key:
   ```javascript
   const API_KEY = 'dein-api-key-hier';
   ```

### 3. Config anpassen

Öffne `config.json` und passe die Werte an:

```json
{
  "mosque_name": "Deine Moschee",
  "city": "Deine Stadt",
  "latitude": 53.5753,
  "longitude": 9.6961,
  "announcement_turkish": "Türkische Ankündigung hier",
  "announcement_german": "Deutsche Ankündigung hier"
}
```

**Wichtig:**
- `city`: Name deiner Stadt (für Gebetszeiten)
- `latitude` und `longitude`: Koordinaten deiner Stadt (für Wetter)
  - Finde sie auf: https://www.latlong.net/
- Lasse Ankündigungen **leer** (`""`), wenn du keine möchtest

### 4. Hochladen

**Option A - Kostenlos (GitHub Pages):**
1. Erstelle einen GitHub Account
2. Erstelle ein neues Repository
3. Lade alle Dateien hoch
4. Aktiviere GitHub Pages in den Settings
5. Deine Seite ist dann erreichbar unter: `benutzername.github.io/repository-name`

**Option B - Kostenlos (Netlify):**
1. Gehe zu https://netlify.com
2. Drag & Drop den kompletten Ordner
3. Fertig! Du bekommst eine URL wie: `deine-moschee.netlify.app`

**Option C - Eigene Domain:**
- Miete Webspace bei einem Hoster (z.B. Ionos, Strato, All-Inkl)
- Lade die Dateien per FTP hoch

### 5. Display einrichten

#### Variante 1: Direkt im Browser (TV/Smartboard mit Browser)
1. Öffne die URL im Vollbild-Modus (F11)
2. Aktiviere Auto-Play und verhindere Sleep-Mode

#### Variante 2: Raspberry Pi (empfohlen)
```bash
# Chromium im Kiosk-Modus starten
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --disable-session-crashed-bubble --incognito \
  "https://deine-url.com"
```

#### Variante 3: Amazon Fire TV Stick
1. Installiere "Silk Browser" oder "Firefox"
2. Öffne die URL
3. Gehe in Vollbild

## ⚙️ Funktionen im Detail

### Gebetszeiten
- Werden **automatisch** von ezanvakti.emushaf.net geladen
- Aktualisieren sich täglich automatisch
- Basieren auf deiner konfigurierten Stadt

### Countdown
- Zeigt Zeit bis zum **nächsten Gebet**
- Hebt das **aktuelle Gebet** visuell hervor
- Aktualisiert sich sekündlich

### Wetter
- Aktualisiert sich **alle 30 Minuten**
- Zeigt Temperatur und Icon (Sonne, Wolken, Regen, etc.)

### Auto-Refresh
- Seite lädt sich automatisch **zur vollen und halben Stunde** neu
- Verhindert Speicher-Probleme bei 24/7 Betrieb
- Aktualisiert Gebetszeiten täglich

### Ankündigungen
- Zweisprachig: Türkisch + Deutsch
- Mit Flaggen-Icons
- Wenn **beide leer** sind: Footer mit "designed by" wird angezeigt
- Wenn **mindestens eine** gefüllt ist: Ankündigungen werden angezeigt

## 🎨 Design anpassen

### Farben ändern
Öffne `css/style.css` und ändere die Variablen in `:root`:

```css
:root {
    --color-primary: #0c8aa4;        /* Hauptfarbe (Header) */
    --color-accent: rgba(255, 0, 0, 0.5);  /* Footer-Farbe */
}
```

### Schriftgröße
Das System ist **fluid** - passt sich automatisch an. Wenn du manuelle Anpassungen willst:

```css
:root {
    --font-size-xl: clamp(1.6rem, 2.5vw, 2.2rem);  /* Größer machen */
}
```

## 🔧 Fehlerbehebung

### Gebetszeiten werden nicht geladen
- Prüfe die Browser-Konsole (F12)
- Ist der Stadtname korrekt geschrieben?
- Funktioniert https://ezanvakti.emushaf.net/vakitler/DEINE-STADT ?

### Wetter wird nicht angezeigt
- Hast du den API Key eingetragen?
- Sind Latitude/Longitude korrekt?
- Hast du das kostenlose Limit (1000 Anfragen/Tag) überschritten?

### Seite ist zu klein/groß
- Prüfe die Browser-Zoom-Stufe (sollte 100% sein)
- Das System passt sich automatisch an Displaygrößen an

### Display schaltet sich aus
- Aktiviere "Kein Ruhemodus" in den Display-Einstellungen
- Bei Raspberry Pi: `xset s off` in autostart

## 📱 Für andere Moscheen

Einfach die `config.json` anpassen - das war's! 

Teile das Projekt gerne mit anderen Gemeinden. 

## 🤝 Support

Bei Fragen oder Problemen:
1. Prüfe die Browser-Konsole (F12 → Console)
2. Vergleiche deine Dateien mit der Original-Struktur
3. Kontaktiere Ozan

## 📜 Lizenz

Frei nutzbar für alle Moscheen und islamischen Gemeinden.

---

**Made with ❤️ for the Muslim Community**