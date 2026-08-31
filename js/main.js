/* ==========================================================================
   MAIN — Navigation, Router, Boot
   ========================================================================== */

const NAV = [
  { slug:"dashboard", label:"Dashboard", ic:"🏠", render: renderDashboard },
  { section:"Schule" },
  { slug:"stundenplan", label:"Stundenplan", ic:"📚", render: renderStundenplan },
  { slug:"hausaufgaben", label:"Hausaufgaben", ic:"📝", render: renderHausaufgaben },
  { slug:"klassenarbeiten", label:"Klassenarbeiten", ic:"🧪", render: renderKlassenarbeiten },
  { slug:"noten", label:"Noten", ic:"📊", render: renderNoten },
  { slug:"rucksack", label:"Rucksack", ic:"🎒", render: renderRucksack },
  { section:"Alltag" },
  { slug:"morgenroutine", label:"Morgenroutine", ic:"🌅", render: renderMorgenroutine },
  { slug:"kalender", label:"Kalender", ic:"📅", render: renderKalender },
  { slug:"ernaehrung", label:"Ernährung", ic:"🍝", render: renderErnaehrung },
  { slug:"training", label:"Training", ic:"💪", render: renderTraining },
  { section:"Werkzeuge" },
  { slug:"ki", label:"KI", ic:"🤖", render: renderKI },
  { slug:"notizen", label:"Notizen", ic:"📝", render: renderNotizen },
  { slug:"nachrichten", label:"Nachrichten", ic:"💬", render: renderNachrichten },
  { section:"Übersicht" },
  { slug:"fortschritt", label:"Fortschritt", ic:"📈", render: renderFortschritt },
  { slug:"favoriten", label:"Favoriten", ic:"❤️", render: renderFavoriten },
  { slug:"einstellungen", label:"Einstellungen", ic:"⚙️", render: renderEinstellungen },
];

function buildNav(){
  const wrap = document.getElementById("nav-scroll");
  let html = "";
  NAV.forEach(item => {
    if (item.section){ html += `<div class="nav-section-label">${item.section}</div>`; return; }
    html += `<button class="nav-item" data-slug="${item.slug}"><span class="ic">${item.ic}</span><span>${item.label}</span>${item.slug==="hausaufgaben"?'<span class="badge" id="nav-badge-hw" hidden></span>':''}</button>`;
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll(".nav-item").forEach(btn=>{
    btn.addEventListener("click", ()=> navigate(btn.dataset.slug));
  });
}

function navigate(slug){
  const item = NAV.find(i=>i.slug===slug);
  if (!item) return;
  document.querySelectorAll(".view").forEach(v=>v.hidden = true);
  const view = document.getElementById("view-"+slug);
  if (!view) return;
  view.hidden = false;
  document.getElementById("topbar-title").textContent = item.label;
  document.querySelectorAll(".nav-item").forEach(b=> b.classList.toggle("active", b.dataset.slug===slug));
  window.location.hash = slug;
  item.render(view);
  window.scrollTo(0,0);
  document.getElementById("main").scrollTo?.(0,0);
}

function refreshCurrentView(){
  const slug = (window.location.hash||"#dashboard").slice(1) || "dashboard";
  const item = NAV.find(i=>i.slug===slug);
  const view = document.getElementById("view-"+(item?item.slug:"dashboard"));
  if (item && view && !view.hidden) item.render(view);
}

function goto(slug){ navigate(slug); }

/* ---------- Theme ---------- */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").textContent = theme==="dark" ? "🌙 Dark Mode" : "☀️ Light Mode";
}
function toggleTheme(){
  const cur = DB.get("settings").theme;
  const next = cur==="dark" ? "light" : "dark";
  DB.updateSettings({theme: next});
  applyTheme(next);
}

/* ---------- Boot ---------- */
function boot(){
  buildNav();
  applyTheme(DB.get("settings").theme || "dark");
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("open-search").addEventListener("click", openGlobalSearch);
  document.addEventListener("keydown", (e)=>{
    if (e.key==="/" && document.activeElement.tagName!=="INPUT" && document.activeElement.tagName!=="TEXTAREA"){
      e.preventDefault(); openGlobalSearch();
    }
    if (e.key==="Escape") closeModal();
  });
  document.getElementById("open-reminders").addEventListener("click", showReminderCenter);
  document.getElementById("reminder-banner-dismiss").addEventListener("click", ()=>{ document.getElementById("reminder-banner").hidden = true; });
  document.getElementById("quick-focus").addEventListener("click", ()=> openFocusPicker());
  document.getElementById("fab-focus").addEventListener("click", ()=> openFocusPicker());

  const startSlug = (window.location.hash||"").slice(1) || "dashboard";
  navigate(NAV.find(i=>i.slug===startSlug) ? startSlug : "dashboard");

  initReminders();
  setInterval(()=>{ refreshCurrentView(); }, 60000); // live clock / countdowns
  setInterval(()=>{ checkReminders(); }, 20000);
}

document.addEventListener("DOMContentLoaded", boot);
