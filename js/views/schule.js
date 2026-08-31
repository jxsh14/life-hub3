/* ==========================================================================
   SCHULE — Stundenplan, Hausaufgaben, Klassenarbeiten, Noten, Rucksack
   ========================================================================== */

/* ---------------- Schedule core helpers (used by Dashboard too) ---------------- */

function getScheduleForDate(dateStr){
  const dow = isoDow(parseDate(dateStr));
  const base = DB.get("schedule").filter(s => s.day === dow);
  const exceptions = DB.get("scheduleExceptions").filter(e => e.date === dateStr);
  let lessons = base.map(l => {
    const ex = exceptions.find(e => e.scheduleId === l.id);
    if (ex && ex.type === "skip") return null;
    if (ex && ex.type === "override") return Object.assign({}, l, ex.overrideData, {isException:true});
    return l;
  }).filter(Boolean);
  return lessons.sort((a,b)=> minutesOfDay(a.start)-minutesOfDay(b.start));
}

function getNextLesson(){
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();
  let d = new Date(now);
  for (let i=0;i<8;i++){
    const ds = fmtDate(d);
    const lessons = getScheduleForDate(ds).filter(l => i>0 || minutesOfDay(l.end) > nowMin);
    if (lessons.length) return { lesson: lessons[0], dateStr: ds, isToday: i===0 };
    d.setDate(d.getDate()+1);
  }
  return null;
}

function subjectsNeededTomorrow(){
  const ds = addDays(todayStr(),1);
  return getScheduleForDate(ds).map(l => subjectById(l.subjectId).name);
}

/* ---------------- Hub view ---------------- */

function renderSchule(){} // hub not used directly (deep-linked subviews), kept for nav symmetry

/* ---------------- STUNDENPLAN ---------------- */

let spWeekOffset = 0;

function renderStundenplan(root){
  const showWeekend = false;
  const monday = mondayOfWeek(spWeekOffset);
  const days = showWeekend ? 7 : 5;
  const dayDates = Array.from({length:days}, (_,i)=> addDays(fmtDate(monday), i));

  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Schule</div>
      <h2>Stundenplan</h2>
      <div class="desc">Einmal einrichten — wiederholt sich automatisch jede Woche.</div>
    </div>
    <div class="btn-row mt-16" style="margin-bottom:14px;">
      <button class="btn sm" id="sp-prev">‹ Vorherige Woche</button>
      <button class="btn sm primary" id="sp-today">Heute</button>
      <button class="btn sm" id="sp-next">Nächste Woche ›</button>
      <div class="spacer" style="flex:1"></div>
      <button class="btn sm" id="sp-add">➕ Stunde hinzufügen</button>
    </div>
    <div class="card tight" style="overflow-x:auto;">
      <div class="week-grid" id="sp-grid" style="min-width:640px;"></div>
    </div>
  `;
  document.getElementById("sp-prev").onclick = ()=>{ spWeekOffset--; renderStundenplan(root); };
  document.getElementById("sp-next").onclick = ()=>{ spWeekOffset++; renderStundenplan(root); };
  document.getElementById("sp-today").onclick = ()=>{ spWeekOffset=0; renderStundenplan(root); };
  document.getElementById("sp-add").onclick = ()=> openLessonModal();

  const grid = document.getElementById("sp-grid");
  let html = `<div></div>`;
  dayDates.forEach((ds,i)=>{
    const isToday = ds === todayStr();
    html += `<div class="week-col-head ${isToday?'today':''}">${WEEKDAYS_SHORT[i]}<br><span class="faint">${parseDate(ds).getDate()}.${parseDate(ds).getMonth()+1}.</span></div>`;
  });
  html += `<div class="week-hour">Stunden</div>`;
  dayDates.forEach(ds=>{
    const lessons = getScheduleForDate(ds);
    html += `<div class="day-col">`;
    if (!lessons.length) html += `<div class="empty-note small">—</div>`;
    lessons.forEach(l=>{
      const subj = subjectById(l.subjectId);
      html += `<div class="slot ${l.isException?'exception':''}" style="border-left-color:${subj.color}" data-id="${l.id}" data-date="${ds}">
        <div class="sub">${escapeHtml(subj.name)}</div>
        <div class="meta">${l.start}–${l.end}${l.room?` · ${escapeHtml(l.room)}`:''}</div>
        ${l.teacher?`<div class="meta">${escapeHtml(l.teacher)}</div>`:''}
      </div>`;
    });
    html += `</div>`;
  });
  grid.innerHTML = html;
  grid.querySelectorAll(".slot").forEach(el=>{
    el.addEventListener("click", ()=> openLessonModal(el.dataset.id, el.dataset.date));
  });
}

function mondayOfWeek(offset){
  const d = new Date();
  const dow = isoDow(d);
  d.setDate(d.getDate() - (dow-1) + offset*7);
  d.setHours(0,0,0,0);
  return d;
}

function openLessonModal(id, dateCtx){
  const lesson = id ? DB.find("schedule", id) : null;
  const subjects = DB.get("subjects");
  openModal(`
    <div class="modal-head"><h3>${lesson?"Stunde bearbeiten":"Stunde hinzufügen"}</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Fach</label>
      <select id="lf-subject">${subjects.map(s=>`<option value="${s.id}" ${lesson?.subjectId===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Wochentag</label>
      <select id="lf-day">${WEEKDAYS.map((w,i)=>`<option value="${i+1}" ${ (lesson?.day||1)===i+1 ?'selected':''}>${w}</option>`).join("")}</select>
    </div>
    <div class="field-row">
      <div class="field"><label>Beginn</label><input type="time" id="lf-start" value="${lesson?.start||'08:00'}"></div>
      <div class="field"><label>Ende</label><input type="time" id="lf-end" value="${lesson?.end||'08:45'}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Lehrer</label><input type="text" id="lf-teacher" value="${escapeHtml(lesson?.teacher||'')}"></div>
      <div class="field"><label>Raum</label><input type="text" id="lf-room" value="${escapeHtml(lesson?.room||'')}"></div>
    </div>
    <div class="field"><label>Notizen</label><textarea id="lf-notes">${escapeHtml(lesson?.notes||'')}</textarea></div>
    ${lesson && dateCtx ? `
    <div class="hr"></div>
    <div class="small muted mt-8">Diese Woche ändern:</div>
    <div class="btn-row mt-8">
      <button class="btn sm" id="lf-skip-once">Nur ${fmtDateHuman(dateCtx)} ausfallen lassen</button>
    </div>` : ""}
    <div class="hr"></div>
    <div class="btn-row">
      <button class="btn primary" id="lf-save">${lesson?"Speichern (ab jetzt jede Woche)":"Hinzufügen"}</button>
      ${lesson?`<button class="btn danger" id="lf-delete">Löschen</button>`:""}
      <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
  document.getElementById("lf-save").onclick = ()=>{
    const data = {
      subjectId: document.getElementById("lf-subject").value,
      day: Number(document.getElementById("lf-day").value),
      start: document.getElementById("lf-start").value,
      end: document.getElementById("lf-end").value,
      teacher: document.getElementById("lf-teacher").value.trim(),
      room: document.getElementById("lf-room").value.trim(),
      notes: document.getElementById("lf-notes").value.trim()
    };
    if (lesson) DB.update("schedule", lesson.id, data);
    else DB.add("schedule", data);
    closeModal(); toast("Gespeichert", "Stundenplan aktualisiert."); refreshCurrentView();
  };
  if (lesson && document.getElementById("lf-delete")){
    document.getElementById("lf-delete").onclick = ()=>{
      DB.remove("schedule", lesson.id);
      DB.set("scheduleExceptions", DB.get("scheduleExceptions").filter(e=>e.scheduleId!==lesson.id));
      closeModal(); toast("Gelöscht"); refreshCurrentView();
    };
  }
  if (lesson && dateCtx && document.getElementById("lf-skip-once")){
    document.getElementById("lf-skip-once").onclick = ()=>{
      DB.add("scheduleExceptions", { scheduleId: lesson.id, date: dateCtx, type:"skip" });
      closeModal(); toast("Ausnahme gespeichert", `Fällt am ${fmtDateHuman(dateCtx)} aus.`); refreshCurrentView();
    };
  }
}

/* ---------------- HAUSAUFGABEN ---------------- */

function renderHausaufgaben(root){
  const items = DB.get("homework").slice().sort((a,b)=> a.due.localeCompare(b.due));
  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Schule</div>
      <h2>Hausaufgaben</h2>
    </div>
    <div class="btn-row" style="margin-bottom:14px;">
      <button class="btn primary sm" id="hw-add">➕ Hausaufgabe</button>
      <div class="chip-select" id="hw-filter">
        <button class="active" data-f="alle">Alle</button>
        <button data-f="offen">Offen</button>
        <button data-f="erledigt">Erledigt</button>
        <button data-f="ueberfaellig">Überfällig</button>
      </div>
    </div>
    <div class="list" id="hw-list"></div>
  `;
  document.getElementById("hw-add").onclick = ()=> openHomeworkModal();
  let filter = "alle";
  const list = document.getElementById("hw-list");
  function draw(){
    let arr = items;
    if (filter==="offen") arr = arr.filter(h=>!h.done);
    if (filter==="erledigt") arr = arr.filter(h=>h.done);
    if (filter==="ueberfaellig") arr = arr.filter(h=>!h.done && daysBetween(h.due)<0);
    if (!arr.length){ list.innerHTML = `<div class="empty-note">Keine Hausaufgaben in dieser Ansicht.</div>`; return; }
    list.innerHTML = arr.map(h=>{
      const subj = subjectById(h.subjectId);
      const overdue = !h.done && daysBetween(h.due) < 0;
      const dueLbl = daysBetween(h.due)===0 ? "Heute fällig" : (overdue ? `Überfällig · ${fmtDateHuman(h.due)}` : fmtDateHuman(h.due));
      return `<div class="row-item ${h.done?'done':''}">
        <span class="tag-dot" style="background:${subj.color}"></span>
        <label class="checkline" style="flex:0"><input type="checkbox" ${h.done?'checked':''} data-toggle="${h.id}"></label>
        <div class="rmeta">
          <div class="t">${escapeHtml(subj.name)}: ${escapeHtml(h.task)}</div>
          <div class="s">${overdue?'<span class="pill red">Überfällig</span> ':''}${dueLbl} · ${PRIORITY_LABEL[h.priority]||''}</div>
        </div>
        <div class="actions">
          <button data-edit="${h.id}" title="Bearbeiten">✏️</button>
          <button data-del="${h.id}" title="Löschen">🗑️</button>
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-toggle]").forEach(el=>{
      el.addEventListener("change", ()=>{ DB.update("homework", el.dataset.toggle, {done: el.checked}); refreshCurrentView(); });
    });
    list.querySelectorAll("[data-edit]").forEach(el=> el.addEventListener("click", ()=> openHomeworkModal(el.dataset.edit)));
    list.querySelectorAll("[data-del]").forEach(el=> el.addEventListener("click", ()=>{ DB.remove("homework", el.dataset.del); toast("Gelöscht"); renderHausaufgaben(root); }));
  }
  draw();
  document.querySelectorAll("#hw-filter button").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll("#hw-filter button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); filter=b.dataset.f; draw();
    });
  });
}

function openHomeworkModal(id){
  const hw = id ? DB.find("homework", id) : null;
  const subjects = DB.get("subjects");
  openModal(`
    <div class="modal-head"><h3>${hw?"Hausaufgabe bearbeiten":"Hausaufgabe hinzufügen"}</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Fach</label>
      <select id="hf-subject">${subjects.map(s=>`<option value="${s.id}" ${hw?.subjectId===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Aufgabe</label><textarea id="hf-task">${escapeHtml(hw?.task||'')}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Abgabedatum</label><input type="date" id="hf-due" value="${hw?.due||todayStr()}"></div>
      <div class="field"><label>Priorität</label>
        <select id="hf-prio">
          <option value="hoch" ${hw?.priority==='hoch'?'selected':''}>🔴 Hoch</option>
          <option value="mittel" ${!hw||hw?.priority==='mittel'?'selected':''}>🟡 Mittel</option>
          <option value="niedrig" ${hw?.priority==='niedrig'?'selected':''}>🟢 Niedrig</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Notizen</label><textarea id="hf-notes">${escapeHtml(hw?.notes||'')}</textarea></div>
    <div class="btn-row">
      <button class="btn primary" id="hf-save">Speichern</button>
      ${hw?`<button class="btn danger" id="hf-delete">Löschen</button>`:""}
      <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
  document.getElementById("hf-save").onclick = ()=>{
    const data = {
      subjectId: document.getElementById("hf-subject").value,
      task: document.getElementById("hf-task").value.trim(),
      due: document.getElementById("hf-due").value,
      priority: document.getElementById("hf-prio").value,
      notes: document.getElementById("hf-notes").value.trim(),
      done: hw?.done || false
    };
    if (!data.task){ toast("Fehlt", "Bitte eine Aufgabe eintragen.", true); return; }
    if (hw) DB.update("homework", hw.id, data); else DB.add("homework", data);
    closeModal(); toast("Gespeichert"); refreshCurrentView();
  };
  if (hw && document.getElementById("hf-delete")){
    document.getElementById("hf-delete").onclick = ()=>{ DB.remove("homework", hw.id); closeModal(); toast("Gelöscht"); refreshCurrentView(); };
  }
}

/* ---------------- KLASSENARBEITEN ---------------- */

function renderKlassenarbeiten(root){
  const items = DB.get("exams").slice().sort((a,b)=> a.date.localeCompare(b.date));
  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Schule</div><h2>Klassenarbeiten</h2></div>
    <div class="btn-row" style="margin-bottom:14px;"><button class="btn primary sm" id="ex-add">➕ Klassenarbeit</button></div>
    <div class="list" id="ex-list"></div>
  `;
  document.getElementById("ex-add").onclick = ()=> openExamModal();
  const list = document.getElementById("ex-list");
  if (!items.length){ list.innerHTML = `<div class="empty-note">Noch keine Klassenarbeiten eingetragen.</div>`; return; }
  list.innerHTML = items.map(x=>{
    const subj = subjectById(x.subjectId);
    const days = daysBetween(x.date);
    let cd = days===0?"Heute!":days===1?"Morgen":days<0?"Vorbei":`in ${days} Tagen`;
    return `<div class="row-item">
      <span class="tag-dot" style="background:${subj.color}"></span>
      <div class="rmeta">
        <div class="t">${escapeHtml(subj.name)}${x.topic?': '+escapeHtml(x.topic):''}</div>
        <div class="s">${fmtDateHuman(x.date)}${x.time?' · '+x.time:''} · <span class="pill ${days<=1&&days>=0?'red':'blue'}">${cd}</span></div>
      </div>
      <div class="actions">
        <button data-edit="${x.id}">✏️</button>
        <button data-del="${x.id}">🗑️</button>
      </div>
    </div>`;
  }).join("");
  list.querySelectorAll("[data-edit]").forEach(el=> el.addEventListener("click", ()=> openExamModal(el.dataset.edit)));
  list.querySelectorAll("[data-del]").forEach(el=> el.addEventListener("click", ()=>{ DB.remove("exams", el.dataset.del); toast("Gelöscht"); renderKlassenarbeiten(root); }));
}

function openExamModal(id){
  const ex = id ? DB.find("exams", id) : null;
  const subjects = DB.get("subjects");
  openModal(`
    <div class="modal-head"><h3>${ex?"Klassenarbeit bearbeiten":"Klassenarbeit hinzufügen"}</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Fach</label>
      <select id="exf-subject">${subjects.map(s=>`<option value="${s.id}" ${ex?.subjectId===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join("")}</select>
    </div>
    <div class="field-row">
      <div class="field"><label>Datum</label><input type="date" id="exf-date" value="${ex?.date||todayStr()}"></div>
      <div class="field"><label>Uhrzeit</label><input type="time" id="exf-time" value="${ex?.time||''}"></div>
    </div>
    <div class="field"><label>Thema</label><input type="text" id="exf-topic" value="${escapeHtml(ex?.topic||'')}"></div>
    <div class="field"><label>Notizen</label><textarea id="exf-notes">${escapeHtml(ex?.notes||'')}</textarea></div>
    <div class="btn-row">
      <button class="btn primary" id="exf-save">Speichern</button>
      ${ex?`<button class="btn danger" id="exf-delete">Löschen</button>`:""}
      <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
  document.getElementById("exf-save").onclick = ()=>{
    const data = {
      subjectId: document.getElementById("exf-subject").value,
      date: document.getElementById("exf-date").value,
      time: document.getElementById("exf-time").value,
      topic: document.getElementById("exf-topic").value.trim(),
      notes: document.getElementById("exf-notes").value.trim()
    };
    if (ex) DB.update("exams", ex.id, data); else DB.add("exams", data);
    closeModal(); toast("Gespeichert"); refreshCurrentView();
  };
  if (ex && document.getElementById("exf-delete")){
    document.getElementById("exf-delete").onclick = ()=>{ DB.remove("exams", ex.id); closeModal(); toast("Gelöscht"); refreshCurrentView(); };
  }
}

/* ---------------- NOTEN ---------------- */

function renderNoten(root){
  const subjects = DB.get("subjects");
  const grades = DB.get("grades");
  function subjAvg(subjId){
    const g = grades.filter(x=>x.subjectId===subjId);
    if (!g.length) return null;
    const wsum = g.reduce((a,x)=>a+(x.weight||1),0);
    const sum = g.reduce((a,x)=>a+x.value*(x.weight||1),0);
    return sum/wsum;
  }
  const allAvgs = subjects.map(s=>subjAvg(s.id)).filter(v=>v!==null);
  const overall = allAvgs.length ? (allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length) : null;

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Schule</div><h2>Noten</h2>
      <div class="desc">${overall?`Gesamtschnitt: <b class="mono">${overall.toFixed(2)}</b>`:'Noch keine Noten eingetragen.'}</div>
    </div>
    <div class="btn-row" style="margin-bottom:14px;"><button class="btn primary sm" id="gr-add">➕ Note eintragen</button></div>
    <div class="grid grid-2" id="gr-subjects"></div>
  `;
  document.getElementById("gr-add").onclick = ()=> openGradeModal();
  const wrap = document.getElementById("gr-subjects");
  wrap.innerHTML = subjects.map(s=>{
    const g = grades.filter(x=>x.subjectId===s.id).sort((a,b)=>b.date.localeCompare(a.date));
    const avg = subjAvg(s.id);
    return `<div class="card tight">
      <div class="card-head"><span class="tag-dot" style="background:${s.color}"></span><h3>${escapeHtml(s.name)}</h3>
        ${avg?`<span class="pill blue" style="margin-left:auto">Ø ${avg.toFixed(2)}</span>`:''}
      </div>
      ${g.length? `<div class="list">` + g.map(x=>`
        <div class="row-item">
          <div class="grade-chip ${gradeClass(x.value)}">${x.value}</div>
          <div class="rmeta"><div class="t">${escapeHtml(x.type||'Note')}</div><div class="s">${fmtDateHuman(x.date)}${x.weight&&x.weight!==1?` · Gewichtung ${x.weight}`:''}</div></div>
          <div class="actions"><button data-del="${x.id}">🗑️</button></div>
        </div>`).join("") + `</div>` : `<div class="empty-note">Keine Noten.</div>`}
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-del]").forEach(el=> el.addEventListener("click", ()=>{ DB.remove("grades", el.dataset.del); toast("Gelöscht"); renderNoten(root); }));
}

function openGradeModal(){
  const subjects = DB.get("subjects");
  openModal(`
    <div class="modal-head"><h3>Note eintragen</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Fach</label>
      <select id="gf-subject">${subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select>
    </div>
    <div class="field-row">
      <div class="field"><label>Note (1–6)</label><input type="number" id="gf-value" min="1" max="6" step="1" value="2"></div>
      <div class="field"><label>Art</label><input type="text" id="gf-type" placeholder="z. B. Test, mündlich" value=""></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Datum</label><input type="date" id="gf-date" value="${todayStr()}"></div>
      <div class="field"><label>Gewichtung (optional)</label><input type="number" id="gf-weight" min="1" max="5" step="0.5" value="1"></div>
    </div>
    <div class="btn-row"><button class="btn primary" id="gf-save">Speichern</button><button class="btn ghost" onclick="closeModal()">Abbrechen</button></div>
  `);
  document.getElementById("gf-save").onclick = ()=>{
    const value = Number(document.getElementById("gf-value").value);
    if (!value || value<1 || value>6){ toast("Ungültige Note","Bitte 1–6 eingeben.", true); return; }
    DB.add("grades", {
      subjectId: document.getElementById("gf-subject").value,
      value, type: document.getElementById("gf-type").value.trim() || "Note",
      date: document.getElementById("gf-date").value,
      weight: Number(document.getElementById("gf-weight").value)||1
    });
    closeModal(); toast("Note gespeichert"); refreshCurrentView();
  };
}

/* ---------------- RUCKSACK ---------------- */

function getBackpackListFor(dateStr){
  const stored = DB.get("backpackChecks")[dateStr];
  if (stored) return stored;
  const subjects = subjectsNeededTomorrowFor(dateStr);
  const base = [...subjects, "Mäppchen", "Trinkflasche", "Hausaufgaben"];
  return base.map(label => ({label, checked:false}));
}
function subjectsNeededTomorrowFor(dateStr){
  return getScheduleForDate(dateStr).map(l => subjectById(l.subjectId).name)
    .filter((v,i,a)=>a.indexOf(v)===i);
}

function renderRucksack(root){
  const targetDate = addDays(todayStr(),1);
  let list = getBackpackListFor(targetDate);
  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Schule</div><h2>🎒 Rucksack für morgen</h2>
      <div class="desc">${fmtDateHuman(targetDate)} — automatisch aus deinem Stundenplan erstellt.</div></div>
    <div class="card" style="max-width:420px;">
      <div class="list" id="bp-list"></div>
      <div class="btn-row mt-16">
        <input type="text" id="bp-new" placeholder="Weiteres hinzufügen…" style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:8px 12px;color:var(--text)">
        <button class="btn sm" id="bp-add">➕</button>
      </div>
    </div>
  `;
  function save(l){ const all = DB.get("backpackChecks"); all[targetDate]=l; DB.set("backpackChecks", all); }
  function draw(){
    document.getElementById("bp-list").innerHTML = list.map((it,i)=>`
      <label class="checkline row-item ${it.checked?'done':''}">
        <input type="checkbox" data-i="${i}" ${it.checked?'checked':''}>
        <span class="t" style="font-size:13.5px">${escapeHtml(it.label)}</span>
      </label>`).join("");
    document.querySelectorAll("#bp-list input").forEach(cb=>{
      cb.addEventListener("change", ()=>{ list[cb.dataset.i].checked = cb.checked; save(list); draw(); });
    });
  }
  draw();
  document.getElementById("bp-add").onclick = ()=>{
    const val = document.getElementById("bp-new").value.trim();
    if (!val) return;
    list.push({label:val, checked:false}); save(list); document.getElementById("bp-new").value=""; draw();
  };
}
