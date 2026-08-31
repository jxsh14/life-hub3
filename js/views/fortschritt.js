/* ==========================================================================
   FORTSCHRITT, FAVORITEN, FOKUSMODUS
   ========================================================================== */

function renderFortschritt(root){
  const focusLog = DB.get("focusLog");
  const totalFocusMin = focusLog.reduce((a,f)=>a+f.minutes,0);
  const hwDone = DB.get("homework").filter(h=>h.done).length;
  const trainings = DB.get("trainingSessions").length;
  const grades = DB.get("grades").slice().sort((a,b)=>a.date.localeCompare(b.date));

  const routineChecks = DB.get("routineChecks");
  const rt = DB.get("routineTemplate");
  const totalPerDay = rt.reduce((a,b)=>a+b.tasks.length,0);
  const last7 = Array.from({length:7},(_,i)=> addDays(todayStr(), -6+i));
  const routinePct = last7.map(ds=>{
    const c = routineChecks[ds] || {};
    const done = Object.values(c).filter(Boolean).length;
    return totalPerDay ? Math.round(100*done/totalPerDay) : 0;
  });

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Übersicht</div><h2>📈 Fortschritt</h2></div>
    <div class="grid grid-3" style="margin-bottom:16px;">
      <div class="card progress-stat"><div class="n">${Math.round(totalFocusMin/60*10)/10}h</div><div class="l">Lernzeit gesamt</div></div>
      <div class="card progress-stat"><div class="n">${hwDone}</div><div class="l">Hausaufgaben erledigt</div></div>
      <div class="card progress-stat"><div class="n">${trainings}</div><div class="l">Trainings absolviert</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>🌅 Morgenroutine — letzte 7 Tage</h3></div>
        <div class="flex gap-8" style="align-items:flex-end;height:90px;">
          ${routinePct.map((p,i)=>`<div style="flex:1;text-align:center;">
            <div style="height:${Math.max(4,p*0.7)}px;background:linear-gradient(180deg,var(--accent),var(--accent-dim));border-radius:6px 6px 2px 2px;"></div>
            <div class="faint" style="font-size:10px;margin-top:4px;">${WEEKDAYS_SHORT[isoDow(parseDate(last7[i]))-1]}</div>
          </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>📊 Notenentwicklung</h3></div>
        ${grades.length ? `<div class="list">${grades.slice(-6).reverse().map(g=>`
          <div class="row-item"><div class="grade-chip ${gradeClass(g.value)}">${g.value}</div>
          <div class="rmeta"><div class="t">${escapeHtml(subjectById(g.subjectId).name)}</div><div class="s">${fmtDateHuman(g.date)}</div></div></div>`).join("")}</div>`
          : `<div class="empty-note">Noch keine Noten eingetragen.</div>`}
      </div>
    </div>
  `;
}

function renderFavoriten(root){
  const favs = DB.get("favorites");
  const recipes = DB.get("recipes").filter(r=> favs.recipes.includes(r.id));
  const exercises = DB.get("exercises").filter(e=>e.favorite);

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Übersicht</div><h2>❤️ Favoriten</h2></div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>🍝 Rezepte</h3></div>
        ${recipes.length? `<div class="list">${recipes.map(r=>`<div class="row-item"><div class="rmeta t">${escapeHtml(r.name)}</div><div class="actions"><button data-unfav-r="${r.id}">🗑️</button></div></div>`).join("")}</div>` : `<div class="empty-note">Keine gespeicherten Rezepte.</div>`}
      </div>
      <div class="card">
        <div class="card-head"><h3>💪 Übungen</h3></div>
        ${exercises.length? `<div class="list">${exercises.map(e=>`<div class="row-item"><div class="rmeta t">${escapeHtml(e.name)}</div></div>`).join("")}</div>` : `<div class="empty-note">Keine favorisierten Übungen.</div>`}
      </div>
    </div>
  `;
  root.querySelectorAll("[data-unfav-r]").forEach(el=> el.addEventListener("click", ()=>{
    const favs2 = DB.get("favorites"); favs2.recipes = favs2.recipes.filter(id=>id!==el.dataset.unfavR); DB.set("favorites", favs2);
    renderFavoriten(root);
  }));
}

/* ---------------- Fokusmodus ---------------- */

let focusState = { running:false, paused:false, totalSec:0, remainingSec:0, timer:null };

function openFocusPicker(){
  openModal(`
    <div class="modal-head"><h3>🧠 Fokusmodus</h3><button onclick="closeModal()">✕</button></div>
    <div class="chip-select">
      <button data-m="25">25 Min</button>
      <button data-m="45">45 Min</button>
      <button data-m="60">60 Min</button>
    </div>
    <div class="field mt-16"><label>Eigene Dauer (Minuten)</label><input type="number" id="focus-custom" min="1" value="${DB.get('settings').focusDefault}"></div>
    <button class="btn primary" style="width:100%" id="focus-start">Fokuszeit starten</button>
  `);
  document.querySelectorAll("[data-m]").forEach(b=> b.addEventListener("click", ()=> startFocus(Number(b.dataset.m))));
  document.getElementById("focus-start").onclick = ()=> startFocus(Number(document.getElementById("focus-custom").value)||25);
}

function startFocus(minutes){
  closeModal();
  focusState = { running:true, paused:false, totalSec: minutes*60, remainingSec: minutes*60, timer:null };
  document.getElementById("focus-overlay").hidden = false;
  updateFocusClock();
  focusState.timer = setInterval(()=>{
    if (focusState.paused) return;
    focusState.remainingSec--;
    updateFocusClock();
    if (focusState.remainingSec<=0) finishFocus(true);
  }, 1000);
  toast("Fokuszeit gestartet", `${minutes} Minuten — Erinnerungen pausiert.`);
}
function updateFocusClock(){
  document.getElementById("focus-clock").textContent = fmtSec(Math.max(0,focusState.remainingSec));
}
document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("focus-pause").addEventListener("click", (e)=>{
    focusState.paused = !focusState.paused;
    e.target.textContent = focusState.paused ? "▶️ Weiter" : "⏸ Pause";
  });
  document.getElementById("focus-stop").addEventListener("click", ()=> finishFocus(false));
});
function finishFocus(completed){
  clearInterval(focusState.timer);
  const elapsedMin = Math.round((focusState.totalSec-focusState.remainingSec)/60);
  if (elapsedMin>0) DB.add("focusLog", {date: todayStr(), minutes: elapsedMin});
  document.getElementById("focus-overlay").hidden = true;
  focusState.running = false;
  if (completed) toast("🎉 Fokuszeit beendet!", `${elapsedMin} Minuten gelernt.`);
  else toast("Fokuszeit beendet", `${elapsedMin} Minuten gespeichert.`);
  refreshCurrentView();
}
function isFocusActive(){ return focusState.running && !focusState.paused; }
