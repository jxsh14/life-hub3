/**
 * Beispiel-Backend für Schulcockpit → echte KI-Anbindung.
 *
 * WARUM ÜBERHAUPT EIN SERVER? Ein Anthropic-API-Key darf niemals im
 * Frontend-Code (also im Browser / auf GitHub) stehen — jeder Besucher
 * könnte ihn auslesen und auf deine Kosten verwenden. Dieser kleine
 * Serverless-Endpunkt hält den Key sicher auf dem Server und reicht nur
 * die Antwort an die App weiter.
 *
 * DEPLOYEN AUF VERCEL (kostenlos, ca. 5 Minuten):
 *   1. Neues Repo/Ordner mit dieser Datei unter:  /api/ai.js
 *   2. Auf vercel.com einloggen → "Add New Project" → Repo auswählen.
 *   3. Unter Project Settings → Environment Variables:
 *        ANTHROPIC_API_KEY = dein-echter-api-key
 *   4. Deploy klicken. Deine URL lautet dann z. B.:
 *        https://dein-projekt.vercel.app/api/ai
 *   5. Diese URL in Schulcockpit unter Einstellungen → KI-Backend eintragen
 *      und "Eigenen Endpunkt verwenden" aktivieren.
 *
 * Genauso als Cloudflare Worker oder Netlify Function umsetzbar — das
 * Prinzip (Key nur serverseitig, CORS erlauben, JSON rein/raus) bleibt gleich.
 */

export default async function handler(req, res) {
  // CORS: erlaubt Anfragen von deiner GitHub-Pages-Domain.
  // Für Produktion idealerweise auf die eigene Domain einschränken.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt." });

  const { level, mode, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "Keine Nachrichten übergeben." });
  }

  const modeInstruction = {
    einfach: "Erkläre so einfach wie möglich, in kleinen Schritten, mit einem Alltagsbeispiel.",
    kurz: "Antworte sehr kurz — nur das Ergebnis bzw. die wichtigste Information, ohne lange Herleitung.",
    ausführlich: "Erkläre ausführlich mit Hintergrund, Herleitung und einem Beispiel.",
    normal: "Erkläre klar und in angemessener Länge."
  }[mode] || "Erkläre klar und in angemessener Länge.";

  const systemPrompt =
    `Du bist eine hilfreiche Lern-KI in einer Schul-App für eine Schülerin/einen Schüler ` +
    `der ${level || "Mittelschule"}. ${modeInstruction} Antworte auf Deutsch, freundlich und altersgerecht.`;

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: "KI-API-Fehler: " + errText });
    }
    const data = await apiRes.json();
    const reply = (data.content || []).map(b => b.text || "").join("\n").trim();
    return res.status(200).json({ reply: reply || "(Keine Antwort erhalten.)" });
  } catch (err) {
    return res.status(500).json({ error: "Serverfehler: " + err.message });
  }
}
