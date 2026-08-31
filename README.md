# 🎒 Schulcockpit

Eine komplette, lokal laufende Web-App für den Schulalltag: Dashboard, Stundenplan,
Hausaufgaben, Klassenarbeiten, Noten, Rucksack-Check, Morgenroutine, KI-Assistent,
Ernährung, Training, Kalender, Notizen (Zeichenfläche), Nachrichten, Fortschritt,
Favoriten und Einstellungen.

**Kein Build-Schritt nötig.** Reines HTML/CSS/JavaScript — funktioniert direkt im
Browser, auch offline. Alle Daten werden lokal auf dem Gerät gespeichert
(`localStorage`) und bleiben nach einem Reload erhalten.

---

## 🚀 Schnellstart

### Lokal öffnen
Einfach `index.html` doppelklicken, oder mit einem lokalen Server starten (empfohlen,
z. B. wegen der Kamera-/Foto-Funktion und Service-Worker-artiger Features):

```bash
cd schulcockpit
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

### Auf GitHub Pages veröffentlichen
1. Neues Repository auf GitHub erstellen und diesen Ordner hochladen (`git init`,
   `git add .`, `git commit -m "Schulcockpit"`, `git push`).
2. Im Repo unter **Settings → Pages** als Quelle den `main`-Branch und
   Root-Verzeichnis auswählen.
3. Nach kurzer Zeit ist die App unter `https://<dein-nutzername>.github.io/<repo>/`
   erreichbar — direkt auf dem Handy zum Homescreen hinzufügbar.

---

## 📂 Projektstruktur

```
index.html              Grundgerüst, Navigation, alle View-Container
css/styles.css           Design-System (Farben, Typografie, Komponenten)
js/db.js                 Datenspeicherung (localStorage-Wrapper)
js/utils.js              Datum/Zeit-Hilfsfunktionen, Toasts, Modals
js/reminders.js          Erinnerungs-Engine (prüft alle Datenquellen)
js/search.js             Globale Suche
js/main.js               Router & Navigation
js/views/*.js            Ein Modul pro Bereich (Dashboard, Schule, KI, …)
api-example/              Beispiel für einen sicheren KI-Backend-Endpunkt
```

---

## 🔒 Daten & Datenschutz

Alle Daten (Stundenplan, Hausaufgaben, Noten, Notizen, Nachrichten, …) werden
**ausschließlich lokal im Browser** gespeichert — es gibt keinen Server, der
mitliest. Über **Einstellungen → Daten exportieren** lässt sich jederzeit ein
JSON-Backup herunterladen; über **Daten löschen** wird alles zurückgesetzt.

Da `localStorage` geräte- und browserspezifisch ist, synchronisieren sich Daten
**nicht** automatisch zwischen mehreren Geräten (z. B. Handy und Laptop) — dafür
wäre ein echtes Backend nötig.

---

## 🤖 KI-Funktion aktivieren (optional)

Ohne weitere Einrichtung läuft die KI in einem **echten Offline-Modus**: Sie kann
direkt rechnen und Fragen zu deinen gespeicherten App-Daten beantworten
("Was habe ich morgen?", "Welche Hausaufgaben habe ich?", …) — komplett im Browser,
ohne externe Anfrage.

Für ausführliche Erklärungen (Mathe, Physik, Aufsätze, Zusammenfassungen, echte
Übersetzungen) brauchst du eine echte KI-API. **Aus Sicherheitsgründen darf ein
API-Key niemals im Frontend-Code stehen** — jeder GitHub-Besucher könnte ihn sonst
auslesen und auf deine Kosten nutzen. Deshalb: einen kleinen eigenen Server-Endpunkt
deployen, der den Anthropic-Key sicher als Environment-Variable hält, und dessen
URL unter **Einstellungen → KI-Backend** eintragen.

Ein fertiges Beispiel für einen solchen Endpunkt (Vercel-Serverless-Funktion)
liegt in [`api-example/ai-proxy.js`](./api-example/ai-proxy.js) mit Anleitung in
[`api-example/README.md`](./api-example/README.md).

---

## 📸 Foto-Aufgaben (Texterkennung)

Im KI-Bereich kann ein Foto einer Hausaufgabe hochgeladen werden. Die Texterkennung
läuft direkt im Browser über [Tesseract.js](https://github.com/naptha/tesseract.js)
(wird per CDN geladen — dafür ist eine Internetverbindung nötig).

---

## 🛠️ Anpassen

- **Fächer & Farben**: `js/db.js` → `DEFAULTS.subjects`
- **Standard-Morgenroutine**: `js/db.js` → `DEFAULTS.routineTemplate` (oder direkt
  in der App unter Morgenroutine → „Routine bearbeiten“)
- **Design/Farben**: `css/styles.css` → CSS-Variablen im `:root`-Block

---

## ⚠️ Bekannte Grenzen dieser ersten Version

- Nachrichten sind rein lokal (kein echtes Backend, kein Versand an andere Geräte).
- Ohne konfiguriertes KI-Backend sind ausführliche Erklärungen eingeschränkt.
- Keine automatische Geräte-Synchronisation (siehe oben).
- Texterkennung benötigt eine Internetverbindung (Tesseract.js lädt vom CDN).

Diese Punkte lassen sich durch ein optionales echtes Backend (z. B. Firebase,
Supabase oder ein eigener Node-Server) nachrüsten — die Datenschicht (`js/db.js`)
ist bewusst so gekapselt, dass `localStorage` später durch API-Calls ersetzt werden
kann, ohne die Views anzufassen.
