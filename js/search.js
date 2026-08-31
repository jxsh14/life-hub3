/* ==========================================================================
   GLOBALE SUCHE
   ========================================================================== */

function openGlobalSearch(){
  openModal(`
    <div class="modal-head"><h3>🔍 Suchen</h3><button onclick="closeModal()">✕</button></div>
    <input type="text" id="gs-input" autofocus placeholder="Hausaufgaben, Stundenplan, Notizen, Rezepte, Termine …"
      style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text);font-size:14px;">
    <div class="list mt-16" id="gs-results"></div>
  `, true);
  const input = document.getElementById("gs-input");
  input.focus();
  input.addEventListener("input", ()=> drawSearchResults(input.value.trim().toLowerCase()));
}

function drawSearchResults(q){
  const out = document.getElementById("gs-results");
  if (!q || q.length<2){ out.innerHTML = `<div class="empty-note">Mindestens 2 Zeichen eingeben.</div>`; return; }
  const results = [];

  DB.get("homework").forEach(h=>{ if ((h.task||"").toLowerCase().includes(q)) results.push({icon:"📝", label:`Hausaufgabe: ${subjectById(h.subjectId).name} – ${h.task}`, goto:"hausaufgaben"}); });
  DB.get("schedule").forEach(l=>{ const subj=subjectById(l.subjectId); if (subj.name.toLowerCase().includes(q) || (l.teacher||"").toLowerCase().includes(q) || (l.room||"").toLowerCase().includes(q)) results.push({icon:"📚", label:`Stundenplan: ${subj.name} (${WEEKDAYS[l.day-1]})`, goto:"stundenplan"}); });
  DB.get("exams").forEach(x=>{ const subj=subjectById(x.subjectId); if (subj.name.toLowerCase().includes(q) || (x.topic||"").toLowerCase().includes(q)) results.push({icon:"🧪", label:`Klassenarbeit: ${subj.name} – ${x.topic||''}`, goto:"klassenarbeiten"}); });
  DB.get("grades").forEach(g=>{ const subj=subjectById(g.subjectId); if (subj.name.toLowerCase().includes(q)) results.push({icon:"📊", label:`Note: ${subj.name} – ${g.value}`, goto:"noten"}); });
  DB.get("calendarEvents").forEach(e=>{ if ((e.title||"").toLowerCase().includes(q) || (e.notes||"").toLowerCase().includes(q)) results.push({icon:"📅", label:`Termin: ${e.title}`, goto:"kalender"}); });
  DB.get("conversations").forEach(c=>{ if (c.name.toLowerCase().includes(q) || c.messages.some(m=>m.text.toLowerCase().includes(q))) results.push({icon:"💬", label:`Nachrichten: ${c.name}`, goto:"nachrichten"}); });
  DB.get("recipes").forEach(r=>{ if (r.name.toLowerCase().includes(q)) results.push({icon:"🍝", label:`Rezept: ${r.name}`, goto:"ernaehrung"}); });
  DB.get("exercises").forEach(ex=>{ if (ex.name.toLowerCase().includes(q)) results.push({icon:"💪", label:`Übung: ${ex.name}`, goto:"training"}); });
  DB.get("subjects").forEach(s=>{ if (s.name.toLowerCase().includes(q)) results.push({icon:"📖", label:`Fach: ${s.name}`, goto:"noten"}); });
  DB.get("notebooks").forEach(nb=>{ if (nb.name.toLowerCase().includes(q)) results.push({icon:"📝", label:`Notizbuch: ${nb.name}`, goto:"notizen"}); });

  if (!results.length){ out.innerHTML = `<div class="empty-note">Keine Treffer für „${escapeHtml(q)}“.</div>`; return; }
  out.innerHTML = results.slice(0,30).map(r=>`<div class="row-item" style="cursor:pointer" data-goto="${r.goto}"><div class="rmeta t" style="font-size:13px;">${r.icon} ${escapeHtml(r.label)}</div></div>`).join("");
  out.querySelectorAll("[data-goto]").forEach(el=> el.addEventListener("click", ()=>{ closeModal(); goto(el.dataset.goto); }));
}
