/* ==========================================================================
   KALENDER — Monats- & Tagesansicht, verknüpft mit Schule
   ========================================================================== */

let calView = "month"; // month | day
let calCursor = todayStr();

function itemsForDate(ds){
  const items = [];
  getScheduleForDate(ds).forEach(l=> items.push({type:"lesson", time:l.start, title:subjectById(l.subjectId).name, sub:`${l.start}–${l.end}${l.room?' · '+l.room:''}`, color: subjectById(l.subjectId).color}));
  DB.get("homework").filter(h=>h.due===ds).forEach(h=> items.push({type:"hw", time:"23:59", title:"HA: "+subjectById(h.subjectId).name, sub:h.task, color:"#E8B84B", done:h.done}));
  DB.get("exams").filter(x=>x.date===ds).forEach(x=> items.push({type:"exam", time:x.time||"08:00", title:"Klassenarbeit: "+subjectById(x.subjectId).name, sub:x.topic||"", color:"#FF6B6B"}));
  DB.get("calendarEvents").filter(e=> e.date===ds || (e.repeat==="weekly" && isoDow(parseDate(e.date))===isoDow(parseDate(ds)) && parseDate(e.date)<=parseDate(ds))).forEach(e=> items.push({type:"event", id:e.id, time:e.start||"00:00", title:e.title, sub:e.notes||"", color:"#6EA8FE"}));
  return items.sort((a,b)=> a.time.localeCompare(b.time));
}

function renderKalender(root){
  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Alltag</div><h2>📅 Kalender</h2>
    </div>
    <div class="btn-row" style="margin-bottom:14px;">
      <div class="chip-select">
        <button data-v="month" class="${calView==='month'?'active':''}">Monat</button>
        <button data-v="day" class="${calView==='day'?'active':''}">Tag</button>
      </div>
      <div class="spacer" style="flex:1"></div>
      <button class="btn sm" id="cal-prev">‹</button>
      <button class="btn sm primary" id="cal-today">Heute</button>
      <button class="btn sm" id="cal-next">›</button>
      <button class="btn sm primary" id="cal-add">➕ Termin</button>
    </div>
    <div id="cal-body"></div>
  `;
  root.querySelectorAll("[data-v]").forEach(b=> b.addEventListener("click", ()=>{ calView=b.dataset.v; renderKalender(root); }));
  document.getElementById("cal-add").onclick = ()=> openEventModal(null, calCursor, root);
  document.getElementById("cal-today").onclick = ()=>{ calCursor = todayStr(); renderKalender(root); };
  document.getElementById("cal-prev").onclick = ()=>{ calCursor = calView==="month" ? shiftMonth(calCursor,-1) : addDays(calCursor,-1); renderKalender(root); };
  document.getElementById("cal-next").onclick = ()=>{ calCursor = calView==="month" ? shiftMonth(calCursor,1) : addDays(calCursor,1); renderKalender(root); };

  const body = document.getElementById("cal-body");
  if (calView==="month") drawMonth(body, root); else drawDay(body, root);
}

function shiftMonth(ds, n){ const d=parseDate(ds); d.setMonth(d.getMonth()+n); d.setDate(1); return fmtDate(d); }

function drawMonth(body, root){
  const d = parseDate(calCursor);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const startOffset = isoDow(first)-1;
  const daysInMonth = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  let html = `<div class="card tight"><h3 style="margin-bottom:10px;">${MONTHS[d.getMonth()]} ${d.getFullYear()}</h3>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">
      ${WEEKDAYS_SHORT.map(w=>`<div class="small faint" style="text-align:center;font-weight:700;">${w}</div>`).join("")}`;
  for (let i=0;i<startOffset;i++) html += `<div></div>`;
  for (let day=1; day<=daysInMonth; day++){
    const ds = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(day)}`;
    const items = itemsForDate(ds);
    const isToday = ds===todayStr();
    html += `<div data-day="${ds}" style="min-height:64px;border-radius:8px;padding:4px 5px;cursor:pointer;background:var(--surface-2);border:1px solid ${isToday?'var(--accent)':'var(--border-soft)'};">
      <div class="mono small" style="color:${isToday?'var(--accent)':'var(--text-dim)'}">${day}</div>
      ${items.slice(0,3).map(it=>`<div style="font-size:9.5px;background:${it.color}22;color:${it.color};border-radius:4px;padding:1px 4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.title)}</div>`).join("")}
      ${items.length>3?`<div class="faint" style="font-size:9px;">+${items.length-3} mehr</div>`:''}
    </div>`;
  }
  html += `</div></div>`;
  body.innerHTML = html;
  body.querySelectorAll("[data-day]").forEach(el=> el.addEventListener("click", ()=>{ calCursor = el.dataset.day; calView="day"; renderKalender(root); }));
}

function drawDay(body, root){
  const items = itemsForDate(calCursor);
  body.innerHTML = `<div class="card">
    <h3>${fmtDateHuman(calCursor)}</h3>
    <div class="rail mt-16">
      ${items.length? items.map(it=>`
        <div class="rail-item ${it.type==='exam'?'overdue':it.done?'done':''}">
          <div class="rail-time mono">${it.time!=="23:59"&&it.time!=="00:00"?it.time:''}</div>
          <div class="rail-title">${escapeHtml(it.title)}</div>
          ${it.sub?`<div class="rail-meta">${escapeHtml(it.sub)}</div>`:''}
          ${it.type==='event'?`<div class="btn-row mt-8"><button class="btn sm" data-edit-ev="${it.id}">✏️</button><button class="btn sm danger" data-del-ev="${it.id}">🗑️</button></div>`:''}
        </div>`).join("") : `<div class="empty-note">Nichts geplant.</div>`}
    </div>
  </div>`;
  body.querySelectorAll("[data-edit-ev]").forEach(el=> el.addEventListener("click", ()=> openEventModal(el.dataset.editEv, calCursor, root)));
  body.querySelectorAll("[data-del-ev]").forEach(el=> el.addEventListener("click", ()=>{ DB.remove("calendarEvents", el.dataset.delEv); toast("Gelöscht"); renderKalender(root); }));
}

function openEventModal(id, dateCtx, root){
  const ev = id ? DB.find("calendarEvents", id) : null;
  openModal(`
    <div class="modal-head"><h3>${ev?"Termin bearbeiten":"Termin hinzufügen"}</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Titel</label><input type="text" id="ev-title" value="${escapeHtml(ev?.title||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Datum</label><input type="date" id="ev-date" value="${ev?.date||dateCtx||todayStr()}"></div>
      <div class="field"><label>Uhrzeit (optional)</label><input type="time" id="ev-start" value="${ev?.start||''}"></div>
    </div>
    <div class="field"><label>Wiederholung</label>
      <select id="ev-repeat"><option value="none" ${!ev||ev.repeat==='none'?'selected':''}>Einmalig</option><option value="weekly" ${ev?.repeat==='weekly'?'selected':''}>Wöchentlich</option></select>
    </div>
    <div class="field"><label>Notizen</label><textarea id="ev-notes">${escapeHtml(ev?.notes||'')}</textarea></div>
    <div class="btn-row">
      <button class="btn primary" id="ev-save">Speichern</button>
      ${ev?`<button class="btn danger" id="ev-delete">Löschen</button>`:""}
      <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
  document.getElementById("ev-save").onclick = ()=>{
    const data = {
      title: document.getElementById("ev-title").value.trim(),
      date: document.getElementById("ev-date").value,
      start: document.getElementById("ev-start").value,
      repeat: document.getElementById("ev-repeat").value,
      notes: document.getElementById("ev-notes").value.trim()
    };
    if (!data.title){ toast("Titel fehlt", "", true); return; }
    if (ev) DB.update("calendarEvents", ev.id, data); else DB.add("calendarEvents", data);
    closeModal(); toast("Gespeichert"); renderKalender(root);
  };
  if (ev && document.getElementById("ev-delete")){
    document.getElementById("ev-delete").onclick = ()=>{ DB.remove("calendarEvents", ev.id); closeModal(); toast("Gelöscht"); renderKalender(root); };
  }
}
