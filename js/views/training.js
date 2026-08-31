/* ==========================================================================
   TRAINING — Übungen, Sessions, Timer, altersgerechte Übungsbibliothek
   ========================================================================== */

const EXERCISE_LIBRARY = [
  {name:"Kniebeugen (Körpergewicht)", position:"Füße schulterbreit, Zehen leicht nach außen.", execution:"Hüfte nach hinten unten absenken, als würdest du dich auf einen Stuhl setzen, dann wieder aufstehen.", breathing:"Einatmen beim Absenken, ausatmen beim Aufstehen.", mistakes:"Knie fallen nach innen; Rücken rundet sich.", easier:"Auf einen Stuhl absetzen und wieder aufstehen.", tips:"Blick geradeaus, Bewegung langsam und kontrolliert."},
  {name:"Liegestütze (Knie)", position:"Hände etwas breiter als Schultern, Knie statt Füße am Boden.", execution:"Körper als gerade Linie von Kopf bis Knie absenken und wieder hochdrücken.", breathing:"Einatmen beim Absenken, ausatmen beim Hochdrücken.", mistakes:"Hüfte hängt durch oder ist zu hoch.", easier:"An der Wand stehend Liegestütze machen.", tips:"Bauchspannung halten, Ellbogen nicht komplett durchdrücken."},
  {name:"Plank (Unterarmstütz)", position:"Unterarme und Zehenspitzen am Boden, Körper eine gerade Linie.", execution:"Position 20–40 Sekunden halten, Bauch anspannen.", breathing:"Ruhig weiteratmen, nicht die Luft anhalten.", mistakes:"Hohlkreuz oder Po zu hoch.", easier:"Auf den Knien statt auf den Zehen abstützen.", tips:"Gesäß leicht anspannen für stabile Haltung."},
  {name:"Ausfallschritte", position:"Aufrechter Stand, Hände in die Hüfte oder locker seitlich.", execution:"Großer Schritt nach vorne, hinteres Knie Richtung Boden senken, zurückdrücken.", breathing:"Einatmen beim Absenken, ausatmen beim Hochdrücken.", mistakes:"Vorderes Knie ragt weit über die Zehenspitzen hinaus.", easier:"Kleinere Schrittweite, an einer Wand abstützen.", tips:"Oberkörper aufrecht halten."},
  {name:"Superman (Rückenübung)", position:"Bauchlage, Arme nach vorne gestreckt.", execution:"Arme und Beine gleichzeitig leicht vom Boden abheben, kurz halten, absenken.", breathing:"Ausatmen beim Heben, einatmen beim Senken.", mistakes:"Zu starkes Überstrecken im Nacken.", easier:"Nur die Arme oder nur die Beine heben.", tips:"Blick zum Boden, Nacken lang lassen."},
  {name:"Jumping Jacks", position:"Aufrechter Stand, Arme seitlich am Körper.", execution:"Gleichzeitig Beine seitlich öffnen und Arme über den Kopf führen, dann zurückspringen.", breathing:"Gleichmäßig weiteratmen.", mistakes:"Zu harte Landung — auf den Fußballen abfedern.", easier:"Abwechselnd ein Bein zur Seite tippen statt springen.", tips:"Guter Einstieg zum Aufwärmen."},
];

function renderTraining(root){
  const sessions = DB.get("trainingSessions").slice().sort((a,b)=>b.date.localeCompare(a.date));
  const exercises = DB.get("exercises");

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Alltag</div><h2>💪 Training</h2></div>
    <div class="btn-row" style="margin-bottom:14px;">
      <button class="btn primary sm" id="tr-start">▶️ Training starten</button>
      <button class="btn sm" id="tr-add-ex">➕ Übung hinzufügen</button>
      <button class="btn sm" id="tr-library">📖 Übungsbibliothek</button>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Meine Übungen</h3></div>
        <div class="list" id="tr-ex-list">${exercises.length? exercises.map(e=>`
          <div class="row-item"><div class="rmeta"><div class="t">${escapeHtml(e.name)}</div>${e.notes?`<div class="s">${escapeHtml(e.notes)}</div>`:''}</div>
          <div class="actions"><button data-fav="${e.id}">${e.favorite?'❤️':'🤍'}</button><button data-del="${e.id}">🗑️</button></div></div>`).join("") : `<div class="empty-note">Noch keine Übungen — Bibliothek durchsuchen oder eigene hinzufügen.</div>`}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Trainingshistorie</h3></div>
        <div class="list">${sessions.length? sessions.slice(0,8).map(s=>`
          <div class="row-item"><div class="rmeta"><div class="t">${fmtDateHuman(s.date)}</div><div class="s">${s.entries.length} Übungen · ${Math.round(s.durationSec/60)} Min</div></div></div>`).join("") : `<div class="empty-note">Noch kein Training gespeichert.</div>`}</div>
      </div>
    </div>
  `;
  document.getElementById("tr-add-ex").onclick = ()=>{
    const name = prompt("Name der Übung:");
    if (name) { DB.add("exercises", {name, notes:"", favorite:false}); renderTraining(root); }
  };
  document.getElementById("tr-library").onclick = ()=> openExerciseLibrary(root);
  document.getElementById("tr-start").onclick = ()=> openTrainingSession(root);
  root.querySelectorAll("[data-fav]").forEach(el=> el.addEventListener("click", ()=>{
    const ex = DB.find("exercises", el.dataset.fav);
    DB.update("exercises", ex.id, {favorite: !ex.favorite}); renderTraining(root);
  }));
  root.querySelectorAll("[data-del]").forEach(el=> el.addEventListener("click", ()=>{ DB.remove("exercises", el.dataset.del); renderTraining(root); }));
}

function openExerciseLibrary(root){
  openModal(`
    <div class="modal-head"><h3>📖 Altersgerechte Übungsbibliothek</h3><button onclick="closeModal()">✕</button></div>
    <div class="small muted mt-8">Keine gefährlichen oder extremen Trainingsmethoden — für den Schulalltag geeignet.</div>
    <div class="list mt-16">
      ${EXERCISE_LIBRARY.map((e,i)=>`
      <div class="card tight">
        <div class="card-head"><h3>${escapeHtml(e.name)}</h3><button class="btn sm" style="margin-left:auto" data-add="${i}">➕ Übernehmen</button></div>
        <div class="small"><b>Ausgangsposition:</b> ${escapeHtml(e.position)}</div>
        <div class="small mt-8"><b>Durchführung:</b> ${escapeHtml(e.execution)}</div>
        <div class="small mt-8"><b>Atmung:</b> ${escapeHtml(e.breathing)}</div>
        <div class="small mt-8"><b>Häufige Fehler:</b> ${escapeHtml(e.mistakes)}</div>
        <div class="small mt-8"><b>Leichtere Variante:</b> ${escapeHtml(e.easier)}</div>
        <div class="small mt-8"><b>Tipp:</b> ${escapeHtml(e.tips)}</div>
      </div>`).join("")}
    </div>
  `, true);
  document.querySelectorAll("[data-add]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const e = EXERCISE_LIBRARY[el.dataset.add];
      DB.add("exercises", {name:e.name, notes:e.tips, favorite:false});
      toast("Hinzugefügt", e.name);
      closeModal(); renderTraining(root);
    });
  });
}

let trSession = null, trTimer = null, trSeconds = 0, trPaused = false;

function openTrainingSession(root){
  const exercises = DB.get("exercises");
  if (!exercises.length){ toast("Keine Übungen", "Füge zuerst Übungen hinzu.", true); return; }
  trSession = { entries: exercises.map(e=>({exerciseId:e.id, sets:[]})) , startedAt: Date.now() };
  trSeconds = 0; trPaused = false;
  openModal(`
    <div class="modal-head"><h3>Training läuft — <span class="mono" id="tr-timer">00:00</span></h3><button onclick="closeModal()">✕</button></div>
    <div class="list" id="tr-session-list"></div>
    <div class="btn-row mt-16">
      <button class="btn sm" id="tr-pause">⏸ Pause</button>
      <button class="btn primary sm" id="tr-finish">✔️ Training beenden & speichern</button>
    </div>
  `, true);
  drawSessionList();
  trTimer = setInterval(()=>{ if(!trPaused){ trSeconds++; document.getElementById("tr-timer").textContent = fmtSec(trSeconds); } }, 1000);
  document.getElementById("tr-pause").onclick = (e)=>{ trPaused=!trPaused; e.target.textContent = trPaused?"▶️ Weiter":"⏸ Pause"; };
  document.getElementById("tr-finish").onclick = ()=>{
    clearInterval(trTimer);
    DB.add("trainingSessions", { date: todayStr(), entries: trSession.entries.filter(e=>e.sets.length), durationSec: trSeconds });
    toast("Training gespeichert", fmtSec(trSeconds));
    closeModal(); renderTraining(root);
  };

  function drawSessionList(){
    document.getElementById("tr-session-list").innerHTML = trSession.entries.map((entry,ei)=>{
      const ex = DB.find("exercises", entry.exerciseId);
      return `<div class="card tight">
        <div style="font-weight:700;font-size:13.5px;">${escapeHtml(ex.name)}</div>
        <div class="list mt-8" id="tr-sets-${ei}">${entry.sets.map((s,si)=>`<div class="row-item"><div class="rmeta t">Satz ${si+1}: ${s.reps} Wdh.${s.weight?' · '+s.weight+' kg':''}</div></div>`).join("")}</div>
        <div class="btn-row mt-8">
          <input type="number" placeholder="Wdh." id="tr-reps-${ei}" style="width:70px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:6px;color:var(--text)">
          <input type="number" placeholder="kg (optional)" id="tr-weight-${ei}" style="width:110px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:6px;color:var(--text)">
          <button class="btn sm" data-addset="${ei}">➕ Satz</button>
        </div>
      </div>`;
    }).join("");
    document.querySelectorAll("[data-addset]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const ei = el.dataset.addset;
        const reps = Number(document.getElementById("tr-reps-"+ei).value);
        const weight = Number(document.getElementById("tr-weight-"+ei).value)||0;
        if (!reps) return;
        trSession.entries[ei].sets.push({reps, weight});
        drawSessionList();
      });
    });
  }
}
function fmtSec(s){ return pad2(Math.floor(s/60))+":"+pad2(s%60); }
