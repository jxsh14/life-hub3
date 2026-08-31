/* ==========================================================================
   DASHBOARD
   ========================================================================== */

function greetingWord(){
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
}

function ringSVG(pct, id){
  const r = 26, c = 2*Math.PI*r;
  const off = c - (pct/100)*c;
  return `<div class="ring-wrap"><svg viewBox="0 0 64 64">
    <circle class="track" cx="32" cy="32" r="${r}"></circle>
    <circle class="prog" cx="32" cy="32" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
  </svg><div class="num" id="${id}">${Math.round(pct)}%</div></div>`;
}

function renderDashboard(root){
  const settings = DB.get("settings");
  const now = new Date();
  const dateHuman = `${WEEKDAYS[isoDow(now)-1]}, ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Day progress: 06:00 - 22:00 window
  const nowMin = now.getHours()*60+now.getMinutes();
  const dayPct = Math.min(100, Math.max(0, ((nowMin-360)/(22*60-360))*100));

  const nextLessonInfo = getNextLesson();
  const homeworkOpen = DB.get("homework").filter(h=>!h.done).sort((a,b)=>a.due.localeCompare(b.due));
  const homeworkToday = homeworkOpen.filter(h=>h.due===todayStr());
  const homeworkOverdue = homeworkOpen.filter(h=>daysBetween(h.due)<0);

  const rt = DB.get("routineTemplate");
  const rc = DB.get("routineChecks")[todayStr()] || {};
  let totalTasks=0, doneTasks=0;
  rt.forEach(block=> block.tasks.forEach((t,ti)=>{ totalTasks++; if (rc[block.id+":"+ti]) doneTasks++; }));

  const meals = settings.mealTimes;
  const mealOrder = [["fruehstueck","🍳 Frühstück"],["snack1","🍎 Snack"],["mittag","🍝 Mittagessen"],["snack2","🥪 Snack"],["abend","🍽️ Abendessen"]];
  const nextMeal = mealOrder.find(([k])=> minutesOfDay(meals[k]) > nowMin) || mealOrder[0];

  const trainingToday = isoDow(now) <= 5; // Mo-Fr default
  const nextTrainingLabel = trainingToday && minutesOfDay(settings.trainingTime) > nowMin ? `Heute ${settings.trainingTime}` : "Kein Training mehr heute";

  const events = DB.get("calendarEvents").filter(e=> e.date===todayStr() || (e.repeat==="weekly" && isoDow(parseDate(e.date))===isoDow(now)))
    .sort((a,b)=>(a.start||"").localeCompare(b.start||""));
  const nextEvent = events.find(e => !e.start || minutesOfDay(e.start) > nowMin);

  const exams = DB.get("exams").filter(x=>daysBetween(x.date)>=0).sort((a,b)=>a.date.localeCompare(b.date));
  const examTomorrow = exams.filter(x=>daysBetween(x.date)===1);
  const examSoon = exams.filter(x=>daysBetween(x.date)>1 && daysBetween(x.date)<=3);

  root.innerHTML = `
    <div class="hero">
      <div class="hero-top">
        <div class="hero-greet">
          <h2>${greetingWord()}, ${escapeHtml(settings.name)} 👋</h2>
          <div class="date">${dateHuman}</div>
        </div>
        <div class="hero-time">
          <div class="clock mono" id="dash-clock">${pad2(now.getHours())}:${pad2(now.getMinutes())}</div>
          <div class="lbl">Aktuelle Uhrzeit</div>
        </div>
      </div>
      <div class="day-progress">
        <div class="row"><span>Tagesfortschritt</span><span>${Math.round(dayPct)}%</span></div>
        <div class="bar"><i style="width:${dayPct}%"></i></div>
      </div>
    </div>

    <div class="grid grid-dash">
      <div style="display:flex;flex-direction:column;gap:16px;">

        <div class="card accent-glow">
          <div class="card-head"><span class="ic">📚</span><h3>Nächste Schulstunde</h3><a class="go" data-goto="stundenplan">Stundenplan →</a></div>
          ${renderNextLessonBlock(nextLessonInfo)}
        </div>

        <div class="card">
          <div class="card-head"><span class="ic">⭐</span><h3>Heute wichtig</h3></div>
          ${renderImportantToday({homeworkToday, homeworkOverdue, examTomorrow, examSoon, events})}
        </div>

        <div class="card">
          <div class="card-head"><span class="ic">📝</span><h3>Hausaufgaben</h3><a class="go" data-goto="hausaufgaben">Alle →</a></div>
          ${homeworkOpen.length ? `<div class="list">${homeworkOpen.slice(0,4).map(h=>{
            const subj = subjectById(h.subjectId); const overdue = daysBetween(h.due)<0;
            return `<div class="row-item">
              <span class="tag-dot" style="background:${subj.color}"></span>
              <div class="rmeta"><div class="t">${escapeHtml(subj.name)}: ${escapeHtml(h.task)}</div>
              <div class="s">${overdue?'<span class="pill red">Überfällig</span> ':''}${daysBetween(h.due)===0?'Heute fällig':fmtDateHuman(h.due)}</div></div>
            </div>`;
          }).join("")}</div>` : `<div class="empty-note">🎉 Keine offenen Hausaufgaben.</div>`}
        </div>

      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">

        <div class="card">
          <div class="card-head"><span class="ic">🌅</span><h3>Morgenroutine</h3><a class="go" data-goto="morgenroutine">Öffnen →</a></div>
          <div class="flex gap-12">
            ${ringSVG(totalTasks?100*doneTasks/totalTasks:0, "dash-routine-ring")}
            <div><div style="font-size:20px;font-weight:700;" class="mono">${doneTasks}/${totalTasks}</div><div class="small muted">erledigt</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><span class="ic">🍝</span><h3>Nächste Mahlzeit</h3><a class="go" data-goto="ernaehrung">Essensplan →</a></div>
          <div class="rail-item now" style="padding-left:2px;"><div class="rail-title">${nextMeal[1]}</div><div class="rail-meta mono">${meals[nextMeal[0]]} Uhr</div></div>
        </div>

        <div class="card">
          <div class="card-head"><span class="ic">💪</span><h3>Nächstes Training</h3><a class="go" data-goto="training">Training →</a></div>
          <div class="rail-item ${trainingToday?'now':''}" style="padding-left:2px;"><div class="rail-title">${nextTrainingLabel}</div></div>
        </div>

        <div class="card">
          <div class="card-head"><span class="ic">📅</span><h3>Nächster Termin</h3><a class="go" data-goto="kalender">Kalender →</a></div>
          ${nextEvent ? `<div class="rail-item now" style="padding-left:2px;"><div class="rail-title">${escapeHtml(nextEvent.title)}</div><div class="rail-meta mono">${nextEvent.start||'ganztägig'}</div></div>` : `<div class="empty-note">Keine weiteren Termine heute.</div>`}
        </div>

      </div>
    </div>
  `;

  root.querySelectorAll("[data-goto]").forEach(el=> el.addEventListener("click", ()=> goto(el.dataset.goto)));
}

function renderNextLessonBlock(info){
  if (!info) return `<div class="empty-note">🎉 Kein Unterricht mehr diese Woche.</div>`;
  const { lesson, dateStr, isToday } = info;
  const subj = subjectById(lesson.subjectId);
  if (!isToday){
    return `<div><div style="font-weight:700;font-size:15px;">${escapeHtml(subj.name)}</div>
      <div class="small muted mt-8">${fmtDateHuman(dateStr)} · ${lesson.start}–${lesson.end}${lesson.room?' · '+escapeHtml(lesson.room):''}</div>
      <div class="pill amber mt-8" style="display:inline-flex">🎉 Kein Unterricht mehr heute</div></div>`;
  }
  const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
  const startMin = minutesOfDay(lesson.start), endMin = minutesOfDay(lesson.end);
  const running = nowMin>=startMin && nowMin<endMin;
  const mins = running ? endMin-nowMin : startMin-nowMin;
  return `<div class="flex gap-12">
    ${ringSVG(running ? 100*(nowMin-startMin)/(endMin-startMin) : Math.max(0,100-(mins/60*100)), "dash-lesson-ring")}
    <div>
      <div style="font-weight:700;font-size:16px;">${escapeHtml(subj.name)}</div>
      <div class="small muted">${lesson.start}–${lesson.end}${lesson.room?' · Raum '+escapeHtml(lesson.room):''}${lesson.teacher?' · '+escapeHtml(lesson.teacher):''}</div>
      <div class="pill ${running?'green':'amber'} mt-8" style="display:inline-flex">${running?`Läuft noch ${mins} Min.`:`Beginnt in ${mins} Min.`}</div>
    </div>
  </div>`;
}

function renderImportantToday({homeworkToday, homeworkOverdue, examTomorrow, examSoon, events}){
  const rows = [];
  homeworkOverdue.forEach(h=> rows.push({dot:'red', text:`Hausaufgabe überfällig: ${subjectById(h.subjectId).name}`}));
  homeworkToday.forEach(h=> rows.push({dot:'red', text:`Hausaufgabe heute fällig: ${subjectById(h.subjectId).name}`}));
  examTomorrow.forEach(x=> rows.push({dot:'red', text:`Klassenarbeit morgen: ${subjectById(x.subjectId).name}`}));
  examSoon.forEach(x=> rows.push({dot:'amber', text:`Lernen für: ${subjectById(x.subjectId).name} (${fmtDateHuman(x.date)})`}));
  DB.get("homework").filter(h=>h.important && !h.done).forEach(h=> rows.push({dot:'amber', text:`Markiert: ${subjectById(h.subjectId).name} – ${h.task}`}));
  events.slice(0,2).forEach(e=> rows.push({dot:'blue', text:`Termin: ${e.title}${e.start?' · '+e.start:''}`}));
  if (!rows.length) return `<div class="empty-note">Nichts Dringendes — guter Tag! 🎉</div>`;
  const dotColor = {red:"var(--red)", amber:"var(--amber)", blue:"var(--blue)", green:"var(--green)"};
  return `<div class="list">` + rows.map(r=>`<div class="row-item"><span class="tag-dot" style="background:${dotColor[r.dot]||'var(--text-faint)'};flex-shrink:0;"></span><div class="rmeta"><div class="t" style="font-size:13px;">${escapeHtml(r.text)}</div></div></div>`).join("") + `</div>`;
}
