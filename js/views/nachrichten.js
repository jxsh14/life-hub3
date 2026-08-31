/* ==========================================================================
   NACHRICHTEN — lokal gespeicherter Nachrichtenbereich
   ========================================================================== */

let msgActiveConv = null;

function renderNachrichten(root){
  let convs = DB.get("conversations");
  if (!msgActiveConv && convs.length) msgActiveConv = convs[0].id;

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Werkzeuge</div><h2>💬 Nachrichten</h2>
      <div class="desc">Lokal auf diesem Gerät gespeichert.</div></div>
    <div class="msg-shell">
      <div class="conv-list">
        <div style="padding:10px;">
          <button class="btn sm" style="width:100%;" id="msg-new-conv">➕ Neue Unterhaltung</button>
          <input type="text" id="msg-search" placeholder="Nachrichten durchsuchen…" style="width:100%;margin-top:8px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:12.5px;">
        </div>
        <div id="conv-items"></div>
      </div>
      <div class="msg-main" id="msg-main"></div>
    </div>
  `;
  document.getElementById("msg-new-conv").onclick = ()=>{
    const name = prompt("Name der Unterhaltung (z. B. Lerngruppe Mathe):");
    if (!name) return;
    const c = DB.add("conversations", {name, messages:[]});
    msgActiveConv = c.id; renderNachrichten(root);
  };
  document.getElementById("msg-search").addEventListener("input", (e)=> drawConvList(e.target.value.toLowerCase()));

  function drawConvList(filter=""){
    convs = DB.get("conversations");
    let list = convs;
    if (filter){
      list = convs.filter(c=> c.name.toLowerCase().includes(filter) || c.messages.some(m=>m.text.toLowerCase().includes(filter)));
    }
    document.getElementById("conv-items").innerHTML = list.map(c=>{
      const last = c.messages[c.messages.length-1];
      const unread = c.messages.some(m=>!m.fromMe && !m.read);
      return `<div class="conv-item ${c.id===msgActiveConv?'active':''}" data-c="${c.id}">
        <div class="n">${escapeHtml(c.name)} ${unread?'<span class="pill red" style="padding:1px 6px;">neu</span>':''}</div>
        <div class="p">${last?escapeHtml(last.text):'Keine Nachrichten'}</div>
      </div>`;
    }).join("") || `<div class="empty-note" style="padding:16px;">Keine Unterhaltungen.</div>`;
    document.querySelectorAll("[data-c]").forEach(el=> el.addEventListener("click", ()=>{ msgActiveConv=el.dataset.c; renderNachrichten(root); }));
  }
  drawConvList();
  drawMsgMain(root);
}

function drawMsgMain(root){
  const main = document.getElementById("msg-main");
  const conv = DB.find("conversations", msgActiveConv);
  if (!conv){ main.innerHTML = `<div class="empty-note" style="margin:auto;">Wähle eine Unterhaltung oder erstelle eine neue.</div>`; return; }
  conv.messages.forEach(m=> m.read = true);
  DB.update("conversations", conv.id, {messages: conv.messages});

  main.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border-soft);font-weight:700;font-size:14px;">${escapeHtml(conv.name)}
      <button class="btn sm ghost" style="float:right;" id="msg-del-conv">🗑️ Löschen</button>
    </div>
    <div class="msg-log" id="msg-log"></div>
    <div class="msg-input">
      <input type="text" id="msg-text" placeholder="Nachricht schreiben…">
      <button class="btn primary icon-only" id="msg-send">➤</button>
    </div>
  `;
  const log = document.getElementById("msg-log");
  log.innerHTML = conv.messages.map(m=>`
    <div class="bubble ${m.fromMe?'me':''}">
      <div>${escapeHtml(m.text)}</div>
      <div class="ts">${new Date(m.ts).toLocaleString("de-DE",{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
    </div>`).join("") || `<div class="empty-note">Noch keine Nachrichten — schreib die erste!</div>`;
  log.scrollTop = log.scrollHeight;

  document.getElementById("msg-del-conv").onclick = ()=>{
    if (!confirm("Unterhaltung wirklich löschen?")) return;
    DB.remove("conversations", conv.id); msgActiveConv=null; renderNachrichten(root);
  };
  function send(){
    const input = document.getElementById("msg-text");
    const text = input.value.trim();
    if (!text) return;
    conv.messages.push({id:DB.uid("msg"), text, fromMe:true, ts:Date.now(), read:true});
    DB.update("conversations", conv.id, {messages: conv.messages});
    input.value = "";
    drawMsgMain(root);
  }
  document.getElementById("msg-send").onclick = send;
  document.getElementById("msg-text").addEventListener("keydown", (e)=>{ if(e.key==="Enter") send(); });
}
