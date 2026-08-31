/* ==========================================================================
   NOTIZEN — digitaler Schulblock (Canvas, Pointer Events: Maus/Touch/Stylus)
   ========================================================================== */

let noteState = {
  notebookId: null, pageId: null,
  tool: "pen", color: "#EDEEF3", width: 3,
  drawing: false, zoom: 1,
  strokes: [], redoStack: [],
  currentStroke: null
};

function ensureNotebook(){
  let nbs = DB.get("notebooks");
  if (!nbs.length){
    const nb = { id: DB.uid("nb"), name:"Mein Schulblock", pages:[{id:DB.uid("pg"), name:"Seite 1", strokes:[]}] };
    nbs = [nb]; DB.set("notebooks", nbs);
  }
  if (!noteState.notebookId) noteState.notebookId = nbs[0].id;
  const nb = nbs.find(n=>n.id===noteState.notebookId) || nbs[0];
  if (!noteState.pageId) noteState.pageId = nb.pages[0].id;
  return nb;
}

function renderNotizen(root){
  const nbs = DB.get("notebooks");
  const nb = ensureNotebook();
  const page = nb.pages.find(p=>p.id===noteState.pageId) || nb.pages[0];
  noteState.strokes = page.strokes || [];

  root.innerHTML = `
    <div class="view-head"><div class="eyebrow">Werkzeuge</div><h2>📝 Notizen</h2></div>
    <div class="notes-shell">
      <div class="notebook-list">
        <button class="btn sm" style="width:100%;margin-bottom:8px;" id="nb-new">➕ Notizbuch</button>
        <div class="list" id="nb-list"></div>
        <div class="hr"></div>
        <div class="small muted" style="margin-bottom:6px;">Seiten</div>
        <div class="list" id="pg-list"></div>
        <button class="btn sm" style="width:100%;margin-top:8px;" id="pg-new">➕ Seite</button>
      </div>
      <div class="canvas-wrap">
        <div class="note-toolbar">
          <button data-tool="pen" title="Stift">🖊️</button>
          <button data-tool="highlighter" title="Textmarker">🖍️</button>
          <button data-tool="eraser" title="Radiergummi">🧽</button>
          <button data-tool="line" title="Linie">📏</button>
          <button data-tool="rect" title="Rechteck">⬜</button>
          <div class="sep"></div>
          <button id="nt-undo" title="Rückgängig">↩️</button>
          <button id="nt-redo" title="Wiederholen">↪️</button>
          <div class="sep"></div>
          <button id="nt-zoom-out" title="Verkleinern">−</button>
          <button id="nt-zoom-in" title="Vergrößern">＋</button>
          <div class="sep"></div>
          <input type="color" id="nt-color" value="${noteState.color}" style="width:30px;height:30px;border:none;background:none;">
          <button id="nt-clear" title="Seite leeren">🗑️</button>
        </div>
        <canvas id="note-canvas"></canvas>
      </div>
    </div>
  `;

  drawNbList(nbs, root);
  drawPgList(nb, root);
  setupCanvas(root);

  root.querySelectorAll("[data-tool]").forEach(b=>{
    b.classList.toggle("active", b.dataset.tool===noteState.tool);
    b.addEventListener("click", ()=>{ noteState.tool=b.dataset.tool; root.querySelectorAll("[data-tool]").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
  });
  document.getElementById("nt-color").oninput = (e)=> noteState.color = e.target.value;
  document.getElementById("nt-undo").onclick = ()=>{ if(noteState.strokes.length){ noteState.redoStack.push(noteState.strokes.pop()); persistStrokes(nb.id,page.id); redrawCanvas(); } };
  document.getElementById("nt-redo").onclick = ()=>{ if(noteState.redoStack.length){ noteState.strokes.push(noteState.redoStack.pop()); persistStrokes(nb.id,page.id); redrawCanvas(); } };
  document.getElementById("nt-zoom-in").onclick = ()=>{ noteState.zoom = Math.min(3, noteState.zoom+0.2); redrawCanvas(); };
  document.getElementById("nt-zoom-out").onclick = ()=>{ noteState.zoom = Math.max(0.4, noteState.zoom-0.2); redrawCanvas(); };
  document.getElementById("nt-clear").onclick = ()=>{ if(confirm("Diese Seite wirklich leeren?")){ noteState.strokes=[]; noteState.redoStack=[]; persistStrokes(nb.id,page.id); redrawCanvas(); } };
  document.getElementById("nb-new").onclick = ()=>{
    const name = prompt("Name des Notizbuchs:", "Neues Notizbuch");
    if (!name) return;
    const arr = DB.get("notebooks");
    const newNb = { id: DB.uid("nb"), name, pages:[{id:DB.uid("pg"), name:"Seite 1", strokes:[]}] };
    arr.push(newNb); DB.set("notebooks", arr);
    noteState.notebookId = newNb.id; noteState.pageId = newNb.pages[0].id;
    renderNotizen(root);
  };
  document.getElementById("pg-new").onclick = ()=>{
    const arr = DB.get("notebooks");
    const target = arr.find(n=>n.id===nb.id);
    const newPage = {id:DB.uid("pg"), name:"Seite "+(target.pages.length+1), strokes:[]};
    target.pages.push(newPage); DB.set("notebooks", arr);
    noteState.pageId = newPage.id; renderNotizen(root);
  };
}

function drawNbList(nbs, root){
  document.getElementById("nb-list").innerHTML = nbs.map(n=>`
    <div class="row-item" style="cursor:pointer;background:${n.id===noteState.notebookId?'var(--surface-3)':'var(--surface-2)'}" data-nb="${n.id}">
      <div class="rmeta t" style="font-size:13px;">${escapeHtml(n.name)}</div>
      <div class="actions"><button data-rename-nb="${n.id}">✏️</button><button data-del-nb="${n.id}">🗑️</button></div>
    </div>`).join("");
  document.querySelectorAll("[data-nb]").forEach(el=> el.addEventListener("click",(e)=>{ if(e.target.tagName==='BUTTON')return; noteState.notebookId=el.dataset.nb; noteState.pageId=null; renderNotizen(root); }));
  document.querySelectorAll("[data-rename-nb]").forEach(el=> el.addEventListener("click", ()=>{
    const n = DB.find("notebooks", el.dataset.renameNb);
    const name = prompt("Neuer Name:", n.name); if(!name) return;
    DB.update("notebooks", n.id, {name}); renderNotizen(root);
  }));
  document.querySelectorAll("[data-del-nb]").forEach(el=> el.addEventListener("click", ()=>{
    if (!confirm("Notizbuch wirklich löschen?")) return;
    DB.remove("notebooks", el.dataset.delNb);
    noteState.notebookId=null; noteState.pageId=null; renderNotizen(root);
  }));
}
function drawPgList(nb, root){
  document.getElementById("pg-list").innerHTML = nb.pages.map(p=>`
    <div class="row-item" style="cursor:pointer;background:${p.id===noteState.pageId?'var(--surface-3)':'var(--surface-2)'}" data-pg="${p.id}">
      <div class="rmeta t" style="font-size:13px;">${escapeHtml(p.name)}</div>
      <div class="actions"><button data-dup-pg="${p.id}">📄</button><button data-del-pg="${p.id}">🗑️</button></div>
    </div>`).join("");
  document.querySelectorAll("[data-pg]").forEach(el=> el.addEventListener("click",(e)=>{ if(e.target.tagName==='BUTTON')return; noteState.pageId=el.dataset.pg; renderNotizen(root); }));
  document.querySelectorAll("[data-dup-pg]").forEach(el=> el.addEventListener("click", ()=>{
    const arr = DB.get("notebooks"); const target = arr.find(n=>n.id===nb.id);
    const src = target.pages.find(p=>p.id===el.dataset.dupPg);
    const copy = {id:DB.uid("pg"), name:src.name+" (Kopie)", strokes: structuredClone(src.strokes)};
    target.pages.push(copy); DB.set("notebooks", arr); renderNotizen(root);
  }));
  document.querySelectorAll("[data-del-pg]").forEach(el=> el.addEventListener("click", ()=>{
    if (nb.pages.length<=1){ toast("Geht nicht", "Mindestens eine Seite muss bleiben.", true); return; }
    const arr = DB.get("notebooks"); const target = arr.find(n=>n.id===nb.id);
    target.pages = target.pages.filter(p=>p.id!==el.dataset.delPg);
    DB.set("notebooks", arr); noteState.pageId=null; renderNotizen(root);
  }));
}

function persistStrokes(nbId, pageId){
  const arr = DB.get("notebooks");
  const nb = arr.find(n=>n.id===nbId);
  const page = nb.pages.find(p=>p.id===pageId);
  page.strokes = noteState.strokes;
  DB.set("notebooks", arr);
}

function setupCanvas(root){
  const canvas = document.getElementById("note-canvas");
  const wrap = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  function resize(){
    canvas.width = wrap.clientWidth * devicePixelRatio;
    canvas.height = wrap.clientHeight * devicePixelRatio;
    canvas.style.width = wrap.clientWidth+"px";
    canvas.style.height = wrap.clientHeight+"px";
    redrawCanvas();
  }
  window.addEventListener("resize", resize);
  resize();

  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX-rect.left)/noteState.zoom, y: (e.clientY-rect.top)/noteState.zoom, pressure: e.pressure||0.5 };
  }

  canvas.addEventListener("pointerdown", (e)=>{
    canvas.setPointerCapture(e.pointerId);
    noteState.drawing = true;
    const p = getPos(e);
    noteState.currentStroke = { tool: noteState.tool, color: noteState.tool==="highlighter"?noteState.color+"55":noteState.color,
      width: noteState.tool==="highlighter"?14:(noteState.tool==="eraser"?18:noteState.width),
      points:[p], start:p };
  });
  canvas.addEventListener("pointermove", (e)=>{
    if (!noteState.drawing) return;
    const p = getPos(e);
    if (noteState.tool==="line" || noteState.tool==="rect"){
      noteState.currentStroke.points = [noteState.currentStroke.start, p];
    } else {
      noteState.currentStroke.points.push(p);
    }
    redrawCanvas(true);
  });
  function finish(){
    if (!noteState.drawing) return;
    noteState.drawing = false;
    if (noteState.currentStroke && noteState.currentStroke.points.length){
      noteState.strokes.push(noteState.currentStroke);
      noteState.redoStack = [];
      const nb = ensureNotebook();
      persistStrokes(nb.id, noteState.pageId);
    }
    noteState.currentStroke = null;
    redrawCanvas();
  }
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointerleave", finish);

  redrawCanvas();
}

function redrawCanvas(withCurrent){
  const canvas = document.getElementById("note-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(devicePixelRatio*noteState.zoom,0,0,devicePixelRatio*noteState.zoom,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const all = withCurrent && noteState.currentStroke ? [...noteState.strokes, noteState.currentStroke] : noteState.strokes;
  all.forEach(s=> drawStroke(ctx, s));
}

function drawStroke(ctx, s){
  ctx.lineJoin="round"; ctx.lineCap="round";
  ctx.globalCompositeOperation = s.tool==="eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
  ctx.beginPath();
  if (s.tool==="line" && s.points.length>=2){
    ctx.moveTo(s.points[0].x, s.points[0].y); ctx.lineTo(s.points[1].x, s.points[1].y);
  } else if (s.tool==="rect" && s.points.length>=2){
    const [a,b] = s.points;
    ctx.rect(a.x, a.y, b.x-a.x, b.y-a.y);
  } else {
    s.points.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}
