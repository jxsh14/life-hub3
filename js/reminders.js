/* ==========================================================================
   ERINNERUNGEN — zentrale Engine, prüft alle Datenquellen periodisch.
   Erledigte/gelöschte Aufgaben lösen keine weiteren Erinnerungen mehr aus,
   weil hier immer live aus den aktuellen Daten geprüft wird.
   Während des Fokusmodus werden unwichtige Erinnerungen pausiert.
   ========================================================================== */

function initReminders(){
  if (DB.get("settings").notificationsOn && "Notification" in window && Notification.permission==="default"){
    Notification.requestPermission();
  }
  checkReminders();
}

function fireReminder(key, title, body, important=false){
  const dismissed = DB.get("dismissedReminders");
  const todayKey = key + "@" + todayStr();
  if (dismissed.includes(todayKey)) return;
  if (isFocusActive() && !important) return;

  toast(title, body);
  document.getElementById("reminder-banner-text").textContent = `${title} ${body||""}`;
  document.getElementById("reminder-banner").hidden = false;
  document.getElementById("reminder-dot").hidden = false;
  clearTimeout(window.__bannerTimer);
  window.__bannerTimer = setTimeout(()=>{ document.getElementById("reminder-banner").hidden = true; }, 8000);

  const settings = DB.get("settings");
  if (settings.notificationsOn && "Notification" in window && Notification.permission==="granted"){
    try{ new Notification(title, {body}); } catch(e){}
  }

  dismissed.push(todayKey);
  // keep list bounded: drop entries older than 3 days
  const cutoff = addDays(todayStr(), -3);
  DB.set("dismissedReminders", dismissed.filter(k=>{
    const d = k.split("@")[1]; return !d || d >= cutoff;
  }));
}

function checkReminders(){
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();
  const ds = todayStr();
  const dow = isoDow(now);
  const settings = DB.get("settings");

  // Morgenroutine Start
  const rt = DB.get("routineTemplate");
  const isWeekend = dow>=6;
  if ((!isWeekend || settings.weekendRoutine) && rt.length){
    const firstMin = minutesOfDay(rt[0].time);
    if (Math.abs(nowMin-firstMin) <= 1){
      fireReminder("routine-start", "🌅 Zeit für deine Morgenroutine!", "", true);
    }
  }

  // Schulstunden: 10 Min vorher & bei Beginn
  getScheduleForDate(ds).forEach(l=>{
    const startMin = minutesOfDay(l.start);
    const subj = subjectById(l.subjectId);
    if (nowMin === startMin-10){
      fireReminder("lesson-soon-"+l.id, `📚 In 10 Minuten beginnt ${subj.name}.`, "");
    }
    if (nowMin === startMin){
      fireReminder("lesson-now-"+l.id, `📚 ${subj.name} beginnt jetzt.`, "", true);
    }
  });

  // Hausaufgaben: fällig morgen (abends ankündigen) & überfällig (morgens)
  if (nowMin>=18*60 && nowMin<=18*60+5){
    DB.get("homework").filter(h=>!h.done && h.due===addDays(ds,1)).forEach(h=>{
      fireReminder("hw-tomorrow-"+h.id, `📝 Deine ${subjectById(h.subjectId).name}-Hausaufgabe ist morgen fällig.`, "");
    });
  }
  if (nowMin>=7*60 && nowMin<=7*60+10){
    DB.get("homework").filter(h=>!h.done && daysBetween(h.due)<0).forEach(h=>{
      fireReminder("hw-overdue-"+h.id+"-"+ds, `🔴 Deine ${subjectById(h.subjectId).name}-Hausaufgabe ist überfällig.`, "", true);
    });
  }

  // Klassenarbeiten morgen
  if (nowMin>=17*60 && nowMin<=17*60+5){
    DB.get("exams").filter(x=>daysBetween(x.date)===1).forEach(x=>{
      fireReminder("exam-tomorrow-"+x.id, `🧪 Morgen hast du eine ${subjectById(x.subjectId).name}arbeit.`, "", true);
    });
  }

  // Mahlzeiten
  Object.entries(settings.mealTimes).forEach(([k,time])=>{
    if (minutesOfDay(time)===nowMin){
      fireReminder("meal-"+k, "🍝 Zeit für deine nächste Mahlzeit.", "");
    }
  });

  // Training
  if (dow<=5){
    const trainMin = minutesOfDay(settings.trainingTime);
    if (nowMin === trainMin-15) fireReminder("training-soon", "💪 Dein Training beginnt in 15 Minuten.", "");
  }

  // Rucksack
  if (nowMin>=20*60 && nowMin<=20*60+5){
    fireReminder("backpack-evening", "🎒 Denk an deinen Rucksack für morgen.", "");
  }

  // Losgehen
  const leaveMin = minutesOfDay(settings.leaveTime);
  if (nowMin === leaveMin-15) fireReminder("leave-soon", "🚪 Noch 15 Minuten bis du los musst.", "", true);
  if (nowMin === leaveMin) fireReminder("leave-now", "🚪 Du solltest dich langsam auf den Weg machen.", "", true);

  // Nachrichten (ungelesen)
  const unread = DB.get("conversations").some(c=> c.messages.some(m=>!m.fromMe && !m.read));
  document.getElementById("reminder-dot").hidden = !unread;
}

function showReminderCenter(){
  document.getElementById("reminder-banner").hidden = true;
  const now = new Date();
  const items = [];
  const ds = todayStr();
  DB.get("homework").filter(h=>!h.done && daysBetween(h.due)<=1).forEach(h=> items.push(`📝 ${subjectById(h.subjectId).name}: ${h.task} (${daysBetween(h.due)<0?'überfällig':daysBetween(h.due)===0?'heute fällig':'morgen fällig'})`));
  DB.get("exams").filter(x=>daysBetween(x.date)<=2 && daysBetween(x.date)>=0).forEach(x=> items.push(`🧪 ${subjectById(x.subjectId).name}arbeit ${daysBetween(x.date)===0?'heute':daysBetween(x.date)===1?'morgen':'in 2 Tagen'}`));
  const nl = getNextLesson();
  if (nl && nl.isToday) items.push(`📚 Nächste Stunde: ${subjectById(nl.lesson.subjectId).name} um ${nl.lesson.start}`);
  openModal(`
    <div class="modal-head"><h3>🔔 Erinnerungen</h3><button onclick="closeModal()">✕</button></div>
    <div class="list">${items.length? items.map(t=>`<div class="row-item"><div class="rmeta t" style="font-size:13px;">${t}</div></div>`).join("") : `<div class="empty-note">Aktuell nichts Dringendes.</div>`}</div>
  `);
}
