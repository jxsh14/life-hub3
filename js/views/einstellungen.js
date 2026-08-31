/* ==========================================================================
   EINSTELLUNGEN
   ========================================================================== */

function renderEinstellungen(root){
  const s = DB.get("settings");
  const cfg = DB.get("aiConfig");
  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Übersicht</div><h2>⚙️ Einstellungen</h2></div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>👤 Profil</h3></div>
        <div class="field"><label>Name</label><input type="text" id="s-name" value="${escapeHtml(s.name)}"></div>
        <div class="field"><label>Klasse</label><input type="text" id="s-klasse" value="${escapeHtml(s.klasse)}"></div>
        <div class="field"><label>Schule</label><input type="text" id="s-schule" value="${escapeHtml(s.schule)}"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>🎨 Darstellung</h3></div>
        <div class="field"><label>Design</label>
          <select id="s-theme"><option value="dark" ${s.theme==='dark'?'selected':''}>Dark Mode</option><option value="light" ${s.theme==='light'?'selected':''}>Light Mode</option></select>
        </div>
        <label class="checkline mt-8"><input type="checkbox" id="s-notif" ${s.notificationsOn?'checked':''}><span class="small">Benachrichtigungen aktiv</span></label>
      </div>

      <div class="card">
        <div class="card-head"><h3>🕐 Zeiten</h3></div>
        <div class="field"><label>Losgehzeit</label><input type="time" id="s-leave" value="${s.leaveTime}"></div>
        <div class="field"><label>Trainingszeit</label><input type="time" id="s-train" value="${s.trainingTime}"></div>
        <div class="field"><label>Standard-Fokusdauer (Minuten)</label><input type="number" id="s-focus" value="${s.focusDefault}"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>🍽️ Mahlzeitenzeiten</h3></div>
        ${MEAL_SLOTS.map(([k,label])=>`<div class="field"><label>${label}</label><input type="time" id="s-meal-${k}" value="${s.mealTimes[k]}"></div>`).join("")}
      </div>

      <div class="card">
        <div class="card-head"><h3>🤖 KI-Backend</h3></div>
        <div class="small muted">Ohne eigenen Endpunkt läuft die KI im Offline-Modus (App-Daten, Rechnen). Für ausführliche Erklärungen: eigenen sicheren Server-Endpunkt eintragen (Anthropic-Key bleibt dort, niemals im Frontend). Siehe <code>/api-example</code> im Projekt.</div>
        <label class="checkline mt-16"><input type="checkbox" id="s-ai-on" ${cfg.enabled?'checked':''}><span class="small">Eigenen Endpunkt verwenden</span></label>
        <div class="field mt-8"><label>Backend-URL</label><input type="text" id="s-ai-endpoint" placeholder="https://dein-backend.example.com/api/ai" value="${escapeHtml(cfg.endpoint||'')}"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>💾 Daten</h3></div>
        <div class="btn-row">
          <button class="btn sm" id="s-export">⬇️ Daten exportieren</button>
          <button class="btn sm danger" id="s-reset">🗑️ Alle Daten löschen</button>
        </div>
      </div>
    </div>

    <div class="btn-row mt-16">
      <button class="btn primary" id="s-save">Speichern</button>
    </div>
  `;

  document.getElementById("s-save").onclick = ()=>{
    DB.updateSettings({
      name: document.getElementById("s-name").value.trim() || "Schüler:in",
      klasse: document.getElementById("s-klasse").value.trim(),
      schule: document.getElementById("s-schule").value.trim(),
      theme: document.getElementById("s-theme").value,
      notificationsOn: document.getElementById("s-notif").checked,
      leaveTime: document.getElementById("s-leave").value,
      trainingTime: document.getElementById("s-train").value,
      focusDefault: Number(document.getElementById("s-focus").value)||25,
      mealTimes: Object.fromEntries(MEAL_SLOTS.map(([k])=>[k, document.getElementById("s-meal-"+k).value]))
    });
    DB.set("aiConfig", { enabled: document.getElementById("s-ai-on").checked, endpoint: document.getElementById("s-ai-endpoint").value.trim() });
    applyTheme(DB.get("settings").theme);
    toast("Gespeichert", "Einstellungen aktualisiert.");
    buildNav();
    refreshCurrentView();
  };
  document.getElementById("s-export").onclick = ()=>{
    const blob = new Blob([DB.exportJSON()], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "schulcockpit-daten.json"; a.click();
  };
  document.getElementById("s-reset").onclick = ()=>{
    if (!confirm("Wirklich ALLE Daten unwiderruflich löschen?")) return;
    DB.resetAll(); toast("Zurückgesetzt"); location.reload();
  };
}
