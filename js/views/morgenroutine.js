/* ==========================================================================
   MORGENROUTINE
   ========================================================================== */

function renderMorgenroutine(root){
  const settings = DB.get("settings");
  const dow = isoDow(new Date());
  const isWeekend = dow>=6;
  const active = !isWeekend || settings.weekendRoutine;
  const template = DB.get("routineTemplate");
  const checks = DB.get("routineChecks")[todayStr()] || {};

  let total=0, done=0;
  template.forEach(b=> b.tasks.forEach((t,ti)=>{ total++; if(checks[b.id+":"+ti]) done++; }));
  const allDone = total>0 && done===total;

  const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
  const leaveMin = minutesOfDay(settings.leaveTime);
  const untilLeave = leaveMin - nowMin;

  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Alltag</div>
      <h2>🌅 Morgenroutine</h2>
      <div class="desc">Montag–Freitag automatisch aktiv${settings.weekendRoutine?', auch am Wochenende.':'.'}</div>
    </div>

    ${!active ? `<div class="card"><div class="empty-note">Heute ist Wochenende — Morgenroutine pausiert. In den <a href="#" data-goto="einstellungen" style="color:var(--accent)">Einstellungen</a> aktivierbar.</div></div>` : `
    <div class="card ${allDone?'':'accent-glow'}" style="margin-bottom:16px;">
      ${allDone ? `<div style="text-align:center;padding:10px;"><div style="font-size:34px;">🎉</div><div style="font-weight:700;font-size:16px;margin-top:6px;">Morgenroutine geschafft!</div></div>`
      : `<div class="flex gap-12">
          ${ringSVG(total?100*done/total:0,"mr-ring")}
          <div>
            <div style="font-weight:700;font-size:15px;">${untilLeave>0?`Noch ${untilLeave} Minuten bis du los musst.`:'Losgehzeit erreicht!'}</div>
            <div class="small muted mt-8">${done}/${total} Aufgaben erledigt</div>
          </div>
        </div>`}
    </div>
    <div class="rail" id="mr-rail"></div>
    `}
    <div class="btn-row mt-16"><button class="btn sm" id="mr-edit">✏️ Routine bearbeiten</button></div>
  `;
  root.querySelectorAll("[data-goto]").forEach(el=>el.addEventListener("click",(e)=>{e.preventDefault(); goto(el.dataset.goto);}));
  document.getElementById("mr-edit").onclick = ()=> openRoutineEditor();

  if (active){
    const rail = document.getElementById("mr-rail");
    rail.innerHTML = template.map(block=>{
      const blockMin = minutesOfDay(block.time);
      const tasksHtml = block.tasks.map((t,ti)=>{
        const key = block.id+":"+ti;
        const isDone = !!checks[key];
        return `<label class="checkline" style="margin-top:4px;">
          <input type="checkbox" data-key="${key}" ${isDone?'checked':''}>
          <span style="font-size:13px;${isDone?'text-decoration:line-through;color:var(--text-faint)':''}">${escapeHtml(t)}</span>
        </label>`;
      }).join("");
      const state = blockMin < nowMin-10 ? "done" : (Math.abs(blockMin-nowMin)<=10 ? "now" : "");
      return `<div class="rail-item ${state}">
        <div class="rail-time mono">${block.time}</div>
        <div class="rail-title">${escapeHtml(block.title)}</div>
        <div class="rail-meta">${tasksHtml}</div>
      </div>`;
    }).join("");
    rail.querySelectorAll("input[data-key]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        const all = DB.get("routineChecks");
        const day = all[todayStr()] || {};
        day[cb.dataset.key] = cb.checked;
        all[todayStr()] = day;
        DB.set("routineChecks", all);
        renderMorgenroutine(root);
      });
    });
  }
}

function openRoutineEditor(){
  const template = DB.get("routineTemplate");
  openModal(`
    <div class="modal-head"><h3>Morgenroutine bearbeiten</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Losgehzeit</label><input type="time" id="mre-leave" value="${DB.get('settings').leaveTime}"></div>
    <label class="checkline mt-8"><input type="checkbox" id="mre-weekend" ${DB.get('settings').weekendRoutine?'checked':''}><span class="small">Auch am Wochenende aktiv</span></label>
    <div class="hr"></div>
    <div class="list" id="mre-blocks" style="max-height:340px;overflow-y:auto;"></div>
    <div class="btn-row mt-16">
      <button class="btn sm" id="mre-add-block">➕ Block hinzufügen</button>
    </div>
    <div class="btn-row mt-16">
      <button class="btn primary" id="mre-save">Speichern</button>
      <button class="btn ghost" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
  let blocks = structuredClone(template);
  function draw(){
    document.getElementById("mre-blocks").innerHTML = blocks.map((b,bi)=>`
      <div class="card tight">
        <div class="field-row">
          <div class="field"><label>Zeit</label><input type="time" data-b="${bi}" class="mre-time" value="${b.time}"></div>
          <div class="field"><label>Titel</label><input type="text" data-b="${bi}" class="mre-title" value="${escapeHtml(b.title)}"></div>
        </div>
        <div class="field"><label>Aufgaben (eine pro Zeile)</label>
          <textarea data-b="${bi}" class="mre-tasks">${b.tasks.join("\n")}</textarea>
        </div>
        <button class="btn sm danger" data-remove="${bi}">🗑️ Block entfernen</button>
      </div>`).join("");
    document.querySelectorAll(".mre-time").forEach(el=> el.addEventListener("input", ()=> blocks[el.dataset.b].time = el.value));
    document.querySelectorAll(".mre-title").forEach(el=> el.addEventListener("input", ()=> blocks[el.dataset.b].title = el.value));
    document.querySelectorAll(".mre-tasks").forEach(el=> el.addEventListener("input", ()=> blocks[el.dataset.b].tasks = el.value.split("\n").filter(x=>x.trim())));
    document.querySelectorAll("[data-remove]").forEach(el=> el.addEventListener("click", ()=>{ blocks.splice(Number(el.dataset.remove),1); draw(); }));
  }
  draw();
  document.getElementById("mre-add-block").onclick = ()=>{
    blocks.push({id: DB.uid("r"), time:"12:00", title:"Neuer Block", tasks:["Neue Aufgabe"]});
    draw();
  };
  document.getElementById("mre-save").onclick = ()=>{
    blocks.sort((a,b)=> minutesOfDay(a.time)-minutesOfDay(b.time));
    DB.set("routineTemplate", blocks);
    DB.updateSettings({ leaveTime: document.getElementById("mre-leave").value, weekendRoutine: document.getElementById("mre-weekend").checked });
    closeModal(); toast("Routine gespeichert"); refreshCurrentView();
  };
}
