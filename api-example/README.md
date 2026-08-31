# KI-Backend für Schulcockpit

Diese Datei zeigt, wie du deiner App eine **echte KI-API** (z. B. Claude von
Anthropic) sicher hinzufügst, ohne den API-Key im Frontend offenzulegen.

## Warum reicht die Frontend-App allein nicht?

Schulcockpit läuft komplett im Browser (auch auf GitHub Pages). Ein API-Key,
der im JavaScript-Code steht, wäre für jeden Besucher der Seite sichtbar
(Rechtsklick → "Quelltext anzeigen"). Deshalb übernimmt ein kleiner Server
("Proxy") die eigentliche Anfrage an die KI-API — der Key bleibt dort sicher
als Umgebungsvariable gespeichert.

## Deployen mit Vercel (kostenlos, ohne eigenen Server)

1. Erstelle ein neues, kleines Repository (kann auch das gleiche Repo wie
   Schulcockpit sein) mit folgender Struktur:
   ```
   /api/ai.js     ← Inhalt von ai-proxy.js aus diesem Ordner
   ```
2. Gehe auf [vercel.com](https://vercel.com), logge dich mit GitHub ein und
   klicke „Add New Project“ → wähle dein Repo aus.
3. Unter **Project Settings → Environment Variables** einen neuen Eintrag
   anlegen:
   - Name: `ANTHROPIC_API_KEY`
   - Wert: dein persönlicher Anthropic-API-Key (aus der Anthropic Console)
4. Auf **Deploy** klicken. Nach Abschluss bekommst du eine URL wie:
   `https://schulcockpit-ai.vercel.app`
5. Dein Endpunkt ist dann: `https://schulcockpit-ai.vercel.app/api/ai`

## In Schulcockpit eintragen

1. In der App: **Einstellungen → KI-Backend**
2. „Eigenen Endpunkt verwenden“ aktivieren
3. Die Backend-URL von oben eintragen
4. Speichern — der KI-Bereich zeigt danach „API verbunden“ an.

## Alternativen zu Vercel

Das gleiche Prinzip funktioniert genauso mit:
- **Netlify Functions**
- **Cloudflare Workers**
- Einem eigenen kleinen Node.js/Express-Server (z. B. auf Render oder Railway)

Wichtig ist immer nur: Der API-Key liegt **ausschließlich serverseitig**, die
App schickt lediglich die Chat-Nachrichten an deinen eigenen Endpunkt und
bekommt die fertige Antwort zurück.
