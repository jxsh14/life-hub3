/* ==========================================================================
   KI — allgemeine Lern-KI mit App-Daten-Kontext, Foto-Aufgaben, Tagesplan.

   Sicherheit: Es wird NIE ein API-Key im Frontend gespeichert. Ist unter
   Einstellungen → KI ein eigener Backend-Endpunkt (aiConfig.endpoint)
   hinterlegt, wird dorthin ein Request geschickt (dein Server hält den
   Anthropic-Key als Environment-Variable, siehe /api-example). Ohne
   Endpunkt läuft ein echter, lokaler Offline-Modus: App-Daten-Fragen,
   Rechnen und Merksätze funktionieren direkt im Browser, ohne KI-API.
   ========================================================================== */

let kiActiveThread = "default";
let kiPending = false;

function currentAiThread(){
  const threads = DB.get("aiThreads");
  return threads.find(t=>t.id===kiActiveThread) || threads[0];
}

function renderKI(root){
  const threads = DB.get("aiThreads");
  const thread = currentAiThread();
  const cfg = DB.get("aiConfig");

  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Werkzeuge</div>
      <h2>🤖 KI</h2>
      <div class="desc">Passt sich an dein Niveau an: ${escapeHtml(DB.get('settings').klasse)}, ${escapeHtml(DB.get('settings').schule)}.
        ${cfg.enabled && cfg.endpoint ? '<span class="pill green">API verbunden</span>' : '<span class="pill amber">Offline-Modus</span>'}
      </div>
    </div>
    <div class="btn-row" style="margin-bottom:12px;">
      ${threads.map(t=>`<button class="btn sm ${t.id===kiActiveThread?'primary':''}" data-th="${t.id}">${escapeHtml(t.name)}</button>`).join("")}
      <button class="btn sm ghost" id="ki-new-thread">➕ Neuer Chat</button>
      <div class="spacer" style="flex:1"></div>
      <label class="btn sm ghost" style="cursor:pointer;">📸 Foto <input type="file" id="ki-photo" accept="image/*" style="display:none"></label>
      <button class="btn sm" id="ki-plan-day">🧠 Plane meinen Tag</button>
    </div>
    <div class="ai-shell">
      <div class="ai-log" id="ki-log"></div>
      <div class="ai-input-bar">
        <textarea id="ki-input" rows="1" placeholder="Frag etwas — Mathe, Physik, Hausaufgaben, Übersetzungen, deine Termine …"></textarea>
        <button class="btn primary icon-only" id="ki-send">➤</button>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-th]").forEach(b=> b.addEventListener("click", ()=>{ kiActiveThread=b.dataset.th; renderKI(root); }));
  document.getElementById("ki-new-thread").onclick = ()=>{
    const name = prompt("Name für den neuen Chat:", "Neuer Chat");
    if (!name) return;
    const t = { id: DB.uid("thread"), name, messages: [] };
    const arr = DB.get("aiThreads"); arr.push(t); DB.set("aiThreads", arr);
    kiActiveThread = t.id; renderKI(root);
  };
  document.getElementById("ki-plan-day").onclick = ()=> kiPlanDay();
  document.getElementById("ki-photo").addEventListener("change", (e)=> kiHandlePhoto(e.target.files[0]));

  const log = document.getElementById("ki-log");
  function drawLog(){
    if (!thread.messages.length){
      log.innerHTML = `<div class="empty-note">Frag mich z. B.: „Erklär mir Bruchrechnen“, „Was habe ich morgen?“, „Fasse diesen Text zusammen“, oder lade ein Foto einer Aufgabe hoch.</div>`;
      return;
    }
    log.innerHTML = thread.messages.map(m=> `<div class="ai-msg ${m.from}">${m.html || escapeHtml(m.text).replace(/\n/g,"<br>")}</div>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  drawLog();

  const input = document.getElementById("ki-input");
  function send(){
    const text = input.value.trim();
    if (!text || kiPending) return;
    input.value = "";
    thread.messages.push({from:"user", text, ts:Date.now()});
    persistThread(thread);
    drawLog();
    kiRespond(thread, text, drawLog);
  }
  document.getElementById("ki-send").onclick = send;
  input.addEventListener("keydown", (e)=>{ if (e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } });
}

function persistThread(thread){
  const arr = DB.get("aiThreads");
  const idx = arr.findIndex(t=>t.id===thread.id);
  arr[idx] = thread;
  DB.set("aiThreads", arr);
}

/* ---------------- Response engine ---------------- */

async function kiRespond(thread, userText, onUpdate){
  kiPending = true;
  const level = `${DB.get('settings').klasse}, ${DB.get('settings').schule}`;
  const cfg = DB.get("aiConfig");

  let mode = thread._mode || "normal";
  if (/ich verstehe es nicht|versteh.*nicht|einfacher/i.test(userText)) mode = "einfach";
  if (/nur die lösung|kurz antworten|nur das ergebnis/i.test(userText)) mode = "kurz";
  if (/erklär ausführlich|ausführlich erklären|genauer erklären/i.test(userText)) mode = "ausführlich";
  thread._mode = mode;

  let replyText;
  try{
    if (cfg.enabled && cfg.endpoint){
      replyText = await kiCallBackend(cfg.endpoint, thread.messages, level, mode);
    } else {
      replyText = kiLocalAnswer(userText, level, mode);
    }
  } catch(err){
    replyText = "Der Backend-Endpunkt konnte nicht erreicht werden. Ich antworte stattdessen offline:\n\n" + kiLocalAnswer(userText, level, mode);
  }

  thread.messages.push({from:"bot", text: replyText, ts: Date.now()});
  persistThread(thread);
  kiPending = false;
  onUpdate();
}

async function kiCallBackend(endpoint, messages, level, mode){
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      level, mode,
      messages: messages.slice(-16).map(m=>({role: m.from==="user"?"user":"assistant", content:m.text}))
    })
  });
  if (!res.ok) throw new Error("Backend-Fehler " + res.status);
  const data = await res.json();
  return data.reply || "(Keine Antwort erhalten.)";
}

/* Echte, lokale Offline-Logik: App-Daten-Fragen + Rechnen + Erklärhilfen.
   Kein Fake — diese Funktionen greifen wirklich auf deine gespeicherten
   Daten zu bzw. berechnen wirklich das Ergebnis. */
function kiLocalAnswer(text, level, mode){
  const t = text.toLowerCase();

  // App-Daten Intents
  if (/was habe ich morgen|stundenplan morgen/.test(t)) return answerToday(1);
  if (/was habe ich heute|stundenplan heute/.test(t)) return answerToday(0);
  if (/mitnehmen|rucksack/.test(t)) return answerBackpack();
  if (/wann kann ich (heute )?trainieren|training heute/.test(t)) return answerTraining();
  if (/welche hausaufgaben|hausaufgaben.*habe ich|offene hausaufgaben/.test(t)) return answerHomework();
  if (/morgen früh|morgenroutine/.test(t)) return answerRoutine();

  // Rechnen
  const mathMatch = t.match(/^[\s\d+\-*/().,%^√]+$/);
  if (mathMatch && /\d/.test(t)){
    const r = safeMathEval(text);
    if (r !== null) return mode==="kurz" ? `**${r}**` : `Rechenweg: ${text.trim()} = **${r}**`;
  }

  // Übersetzen (sehr einfach, Muster: "übersetze X auf Englisch/Deutsch")
  const trMatch = t.match(/übersetze[n]?\s+["„]?(.+?)["“]?\s+(auf|ins|nach)\s+(englisch|deutsch)/);
  if (trMatch){
    return `Für eine zuverlässige Übersetzung von „${trMatch[1]}“ brauche ich eine echte KI-API (siehe Einstellungen → KI). Im Offline-Modus kann ich keine verlässliche Übersetzung garantieren — verbinde einen Backend-Endpunkt für diese Funktion.`;
  }

  // Erklärmodus-Antwort (generisch, ehrlich über Grenzen des Offline-Modus)
  const levelHint = mode==="einfach" ? "Ich erkläre es hier so einfach wie möglich, Schritt für Schritt." :
    mode==="ausführlich" ? "Hier eine ausführliche Erklärung mit Hintergrund und Beispiel." :
    "Kurze Erklärung:";
  return `${levelHint}\n\nIm Offline-Modus kann ich direkt rechnen, deinen Stundenplan/Hausaufgaben/Kalender auslesen und dir bei organisatorischen Fragen helfen (z. B. „Was habe ich morgen?“). Für ausführliche Erklärungen zu ${level.split(",")[0]}-Themen wie Mathe, Physik oder Aufsätze verbindest du am besten eine echte KI-API unter Einstellungen → KI — die Struktur dafür ist bereits fertig eingebaut, du musst nur deinen eigenen sicheren Backend-Endpunkt eintragen (siehe README/api-example im Projekt).`;
}

function safeMathEval(expr){
  const cleaned = expr.replace(/,/g,".").replace(/\^/g,"**").replace(/√/g,"Math.sqrt");
  if (!/^[\d\s+\-*/().%*a-zA-Z]+$/.test(cleaned)) return null;
  if (!/^[0-9+\-*/().\s%.]+$|Math\.sqrt/.test(cleaned)) return null;
  try{
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${cleaned});`)();
    if (typeof val === "number" && isFinite(val)) return Math.round(val*10000)/10000;
    return null;
  } catch(e){ return null; }
}

function answerToday(offsetDays){
  const ds = addDays(todayStr(), offsetDays);
  const lessons = getScheduleForDate(ds);
  const hw = DB.get("homework").filter(h=>!h.done && h.due===ds);
  const events = DB.get("calendarEvents").filter(e=>e.date===ds);
  const exams = DB.get("exams").filter(x=>x.date===ds);
  let lines = [`**${fmtDateHuman(ds)}:**`];
  lines.push(lessons.length ? lessons.map(l=>`• ${l.start}–${l.end} ${subjectById(l.subjectId).name}${l.room?' (Raum '+l.room+')':''}`).join("\n") : "Kein Unterricht.");
  if (exams.length) lines.push("\n**Klassenarbeiten:**\n"+exams.map(x=>`• ${subjectById(x.subjectId).name}${x.topic?': '+x.topic:''}`).join("\n"));
  if (hw.length) lines.push("\n**Fällige Hausaufgaben:**\n"+hw.map(h=>`• ${subjectById(h.subjectId).name}: ${h.task}`).join("\n"));
  if (events.length) lines.push("\n**Termine:**\n"+events.map(e=>`• ${e.title}${e.start?' um '+e.start:''}`).join("\n"));
  return lines.join("\n");
}
function answerBackpack(){
  const ds = addDays(todayStr(),1);
  const list = getBackpackListFor(ds);
  return `**Für morgen (${fmtDateHuman(ds)}) einpacken:**\n` + list.map(i=>`• ${i.label}`).join("\n");
}
function answerTraining(){
  const settings = DB.get("settings");
  const lessons = getScheduleForDate(todayStr());
  const last = lessons[lessons.length-1];
  const trainMin = minutesOfDay(settings.trainingTime);
  if (last && minutesOfDay(last.end) > trainMin) return `Dein Training ist um ${settings.trainingTime} geplant, aber die Schule endet erst um ${last.end} — eventuell verschieben.`;
  return `Dein Training ist heute um ${settings.trainingTime} geplant — nach der Schule hast du dafür Zeit.`;
}
function answerHomework(){
  const hw = DB.get("homework").filter(h=>!h.done).sort((a,b)=>a.due.localeCompare(b.due));
  if (!hw.length) return "🎉 Du hast aktuell keine offenen Hausaufgaben.";
  return "**Offene Hausaufgaben:**\n" + hw.map(h=>`• ${subjectById(h.subjectId).name}: ${h.task} (fällig ${fmtDateHuman(h.due)})`).join("\n");
}
function answerRoutine(){
  const rt = DB.get("routineTemplate");
  return `**Morgenroutine morgen früh:**\n` + rt.map(b=>`• ${b.time} – ${b.title}: ${b.tasks.join(", ")}`).join("\n");
}

/* ---------------- Tagesplan ---------------- */

function kiPlanDay(){
  const ds = todayStr();
  const lessons = getScheduleForDate(ds);
  const hw = DB.get("homework").filter(h=>!h.done);
  const exams = DB.get("exams").filter(x=>daysBetween(x.date)<=3 && daysBetween(x.date)>=0);
  const events = DB.get("calendarEvents").filter(e=>e.date===ds);
  const settings = DB.get("settings");

  const blocks = [];
  lessons.forEach(l=> blocks.push({time:l.start, end:l.end, label:`📚 ${subjectById(l.subjectId).name}`}));
  const schoolEnd = lessons.length ? lessons[lessons.length-1].end : "13:00";
  let cursor = minutesOfDay(schoolEnd) + 30;
  events.filter(e=>e.start).forEach(e=> blocks.push({time:e.start, end:e.end||e.start, label:`📅 ${e.title}`}));

  if (exams.length){
    blocks.push({time:minToHHMM(cursor), end:minToHHMM(cursor+45), label:`🧪 Lernen: ${subjectById(exams[0].subjectId).name}`}); cursor+=45+15;
  }
  hw.slice(0,2).forEach(h=>{
    blocks.push({time:minToHHMM(cursor), end:minToHHMM(cursor+30), label:`📝 Hausaufgabe: ${subjectById(h.subjectId).name}`}); cursor+=30+10;
  });
  const trainMin = minutesOfDay(settings.trainingTime);
  if (trainMin > cursor) blocks.push({time:settings.trainingTime, end:minToHHMM(trainMin+45), label:"💪 Training"});
  blocks.push({time:minToHHMM(Math.max(cursor, trainMin+45)+15), end:"", label:"🟢 Freie Zeit"});

  blocks.sort((a,b)=>minutesOfDay(a.time)-minutesOfDay(b.time));
  const thread = currentAiThread();
  thread.messages.push({from:"user", text:"🧠 Plane meinen Tag"});
  thread.messages.push({from:"bot", text:"**Dein Tagesplan (mit Pausen):**\n" + blocks.map(b=>`• ${b.time}${b.end?'–'+b.end:''} — ${b.label}`).join("\n")});
  persistThread(thread);
  renderKI(document.getElementById("view-ki"));
}
function minToHHMM(min){ min=((min%1440)+1440)%1440; return pad2(Math.floor(min/60))+":"+pad2(min%60); }

/* ---------------- Foto-Aufgaben (OCR) ---------------- */

async function kiHandlePhoto(file){
  if (!file) return;
  const thread = currentAiThread();
  const url = URL.createObjectURL(file);
  thread.messages.push({from:"user", html:`<img src="${url}" style="max-width:220px;border-radius:10px;display:block;margin-bottom:6px;">📸 Foto einer Aufgabe`});
  persistThread(thread);
  renderKI(document.getElementById("view-ki"));
  toast("Texterkennung läuft…", "Das kann kurz dauern.");
  try{
    if (typeof Tesseract === "undefined"){ throw new Error("OCR-Bibliothek noch nicht geladen — Seite neu laden und erneut versuchen."); }
    const { data } = await Tesseract.recognize(file, "deu");
    const recognized = (data.text||"").trim();
    thread.messages.push({from:"bot", text: recognized ? `**Erkannter Text:**\n${recognized}\n\n${kiLocalAnswer(recognized, "", "normal")}` : "Ich konnte auf dem Foto keinen Text erkennen. Versuch ein schärferes, gerade ausgerichtetes Foto."});
  } catch(err){
    thread.messages.push({from:"bot", text: "Texterkennung fehlgeschlagen: " + err.message});
  }
  persistThread(thread);
  renderKI(document.getElementById("view-ki"));
}
