/* ==========================================================================
   UTILS — Datum/Zeit, Toasts, Modal-Helfer, Formatierung
   ========================================================================== */

const WEEKDAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const WEEKDAYS_SHORT = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function parseDate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function todayStr(){ return fmtDate(new Date()); }
function fmtDateHuman(dateStr){
  const d = parseDate(dateStr);
  return `${WEEKDAYS[isoDow(d)-1]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}
function isoDow(d){ const j = d.getDay(); return j===0?7:j; } // 1=Mo..7=So
function timeNow(){ const d=new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function minutesOfDay(hhmm){ const [h,m]=hhmm.split(":").map(Number); return h*60+m; }
function addDays(dateStr, n){ const d=parseDate(dateStr); d.setDate(d.getDate()+n); return fmtDate(d); }
function daysBetween(dateStr){ const d=parseDate(dateStr); const t=parseDate(todayStr()); return Math.round((d-t)/86400000); }

function subjectById(id){ return DB.get("subjects").find(s=>s.id===id) || {name:"Unbekannt", color:"#888"}; }

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- Toasts ---------- */
function toast(title, body="", warn=false){
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = "toast" + (warn ? " warn" : "");
  el.innerHTML = `<div class="tt">${escapeHtml(title)}</div>${body?`<div>${escapeHtml(body)}</div>`:""}`;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transition="opacity .25s"; setTimeout(()=>el.remove(),260); }, 3800);
}

/* ---------- Modal ---------- */
function openModal(html, wide=false){
  const backdrop = document.getElementById("modal-backdrop");
  const box = document.getElementById("modal-box");
  box.className = "modal" + (wide ? " wide" : "");
  box.innerHTML = html;
  backdrop.hidden = false;
}
function closeModal(){
  document.getElementById("modal-backdrop").hidden = true;
  document.getElementById("modal-box").innerHTML = "";
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
});

/* ---------- Priority helpers ---------- */
const PRIORITY_LABEL = { hoch:"🔴 Hoch", mittel:"🟡 Mittel", niedrig:"🟢 Niedrig" };

/* ---------- Grade color class ---------- */
function gradeClass(v){ const n=Math.round(v); return "g"+Math.min(6,Math.max(1,n)); }
