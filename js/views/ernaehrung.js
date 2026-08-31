/* ==========================================================================
   ERNÄHRUNG — Essensplan + Rezeptgenerator
   ========================================================================== */

const MEAL_SLOTS = [["fruehstueck","🍳 Frühstück"],["snack1","🍎 Snack"],["mittag","🍝 Mittagessen"],["snack2","🥪 Snack"],["abend","🍽️ Abendessen"]];

const RECIPE_POOL = [
  {name:"Vollkorn-Nudeln mit Tomatensoße", base:["nudeln","tomaten"], time:20, steps:["Nudeln in Salzwasser kochen.","Zwiebel anschwitzen, Tomaten dazugeben, 10 Min köcheln.","Mit Salz, Pfeffer und Basilikum abschmecken.","Nudeln unterheben und servieren."], alt:"Mit geriebenem Käse überbacken."},
  {name:"Käse-Nudelauflauf", base:["nudeln","käse"], time:35, steps:["Nudeln kochen und abgießen.","Mit Sahne, Ei und geriebenem Käse mischen.","In Auflaufform 20 Min bei 200°C backen."], alt:"Mit Schinkenwürfeln aufpeppen."},
  {name:"Hähnchen-Reis-Pfanne", base:["reis","hähnchen"], time:25, steps:["Reis nach Packungsanweisung kochen.","Hähnchen in Streifen anbraten.","Gemüse dazugeben, 5 Min braten.","Mit Sojasoße abschmecken, mit Reis servieren."], alt:"Vegetarisch mit Tofu statt Hähnchen."},
  {name:"Ofengemüse mit Kartoffeln", base:["kartoffeln","gemüse"], time:40, steps:["Kartoffeln und Gemüse würfeln.","Mit Öl, Salz, Kräutern mischen.","30 Min bei 200°C im Ofen backen."], alt:"Mit Kräuterquark dazu servieren."},
  {name:"Rührei mit Vollkornbrot", base:["ei","brot"], time:10, steps:["Eier verquirlen, würzen.","In der Pfanne bei mittlerer Hitze stocken lassen.","Mit geröstetem Vollkornbrot servieren."], alt:"Mit Schnittlauch oder Tomatenwürfeln verfeinern."},
  {name:"Linsen-Eintopf", base:["linsen","gemüse"], time:35, steps:["Zwiebel und Gemüse anbraten.","Linsen und Brühe dazugeben.","20 Min köcheln lassen, würzen."], alt:"Mit einem Klecks Joghurt servieren."},
  {name:"Pfannkuchen", base:["mehl","milch","ei"], time:20, steps:["Mehl, Milch, Ei und Prise Salz verrühren.","Portionsweise in der Pfanne goldbraun backen.","Nach Wunsch süß oder herzhaft füllen."], alt:"Mit Apfelmus oder Frischkäse und Schinken."},
  {name:"Joghurt mit Obst und Haferflocken", base:["joghurt","obst"], time:5, steps:["Joghurt in eine Schüssel geben.","Obst klein schneiden und dazugeben.","Haferflocken und etwas Honig darüberstreuen."], alt:"Mit Nüssen oder Zimt verfeinern."},
];

function generateRecipe(ingredientsInput){
  const wanted = ingredientsInput.toLowerCase().split(/[,+und]+/).map(s=>s.trim()).filter(Boolean);
  let best = null, bestScore = -1;
  RECIPE_POOL.forEach(r=>{
    const score = r.base.filter(b => wanted.some(w => b.includes(w) || w.includes(b))).length;
    if (score > bestScore){ bestScore = score; best = r; }
  });
  if (!best || bestScore===0) best = RECIPE_POOL[Math.floor(Math.random()*RECIPE_POOL.length)];
  const amounts = best.base.map(b=>({name:b, amount: b==="ei"?"2 Stück": b==="milch"?"250 ml": "200 g"}));
  return { name: best.name, ingredients: amounts, time: best.time, steps: best.steps, alt: best.alt };
}

function renderErnaehrung(root){
  const ds = todayStr();
  const meals = DB.get("meals");
  const today = meals[ds] || {};

  root.innerHTML = `
    <div class="view-head">
      <div class="eyebrow">Alltag</div><h2>🍝 Ernährung</h2>
      <div class="desc">Essensplan für heute — Zeiten aus deinen Einstellungen.</div>
    </div>
    <div class="btn-row" style="margin-bottom:14px;">
      <button class="btn sm" id="plan-new">🔄 Tagesplan neu erstellen</button>
      <button class="btn sm primary" id="plan-recipe">🤖 KI-Rezept</button>
    </div>
    <div class="grid grid-2" id="meal-grid"></div>
  `;
  const settings = DB.get("settings").mealTimes;
  const grid = document.getElementById("meal-grid");
  function draw(){
    const t = meals[ds] || {};
    grid.innerHTML = MEAL_SLOTS.map(([k,label])=>{
      const m = t[k];
      return `<div class="card tight">
        <div class="card-head"><h3>${label}</h3><span class="pill gray mono" style="margin-left:auto">${settings[k]}</span></div>
        ${m ? `<div style="font-weight:600;font-size:13.5px;">${escapeHtml(m.name)}</div>
          ${m.time?`<div class="small muted mt-8">⏱ ${m.time} Min</div>`:''}
          <div class="btn-row mt-8">
            <button class="btn sm" data-swap="${k}">🔄 Ändern</button>
            <button class="btn sm ghost" data-fav="${k}">❤️ Speichern</button>
          </div>` : `<div class="empty-note">Noch nichts geplant.</div><button class="btn sm mt-8" data-swap="${k}">➕ Mahlzeit wählen</button>`}
      </div>`;
    }).join("");
    grid.querySelectorAll("[data-swap]").forEach(el=> el.addEventListener("click", ()=> pickMealFor(el.dataset.swap, draw)));
    grid.querySelectorAll("[data-fav]").forEach(el=> el.addEventListener("click", ()=>{
      const m = (meals[ds]||{})[el.dataset.fav];
      if (!m) return;
      const rec = DB.add("recipes", {name:m.name, ingredients:m.ingredients||[], time:m.time||0, steps:m.steps||[], alt:m.alt||"", favorite:true});
      const favs = DB.get("favorites"); favs.recipes.push(rec.id); DB.set("favorites", favs);
      toast("Gespeichert", "Zu Favoriten hinzugefügt.");
    }));
  }
  draw();

  document.getElementById("plan-new").onclick = ()=>{
    const t = {};
    MEAL_SLOTS.forEach(([k])=>{
      const r = RECIPE_POOL[Math.floor(Math.random()*RECIPE_POOL.length)];
      t[k] = { name:r.name, time:r.time, steps:r.steps, ingredients:r.base.map(b=>({name:b,amount:"200 g"})), alt:r.alt };
    });
    meals[ds]=t; DB.set("meals", meals); draw(); toast("Tagesplan erstellt");
  };
  document.getElementById("plan-recipe").onclick = ()=> openRecipeGenerator(draw);
}

function pickMealFor(slotKey, redraw){
  openModal(`
    <div class="modal-head"><h3>Mahlzeit wählen</h3><button onclick="closeModal()">✕</button></div>
    <div class="list">${RECIPE_POOL.map((r,i)=>`<div class="row-item" style="cursor:pointer" data-pick="${i}"><div class="rmeta"><div class="t">${escapeHtml(r.name)}</div><div class="s">⏱ ${r.time} Min</div></div></div>`).join("")}</div>
    <div class="btn-row mt-16"><button class="btn sm" id="pm-recipe">🤖 Stattdessen KI-Rezept erstellen</button></div>
  `);
  document.querySelectorAll("[data-pick]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const r = RECIPE_POOL[el.dataset.pick];
      const meals = DB.get("meals"); const ds = todayStr();
      meals[ds] = meals[ds]||{};
      meals[ds][slotKey] = { name:r.name, time:r.time, steps:r.steps, ingredients:r.base.map(b=>({name:b,amount:"200 g"})), alt:r.alt };
      DB.set("meals", meals); closeModal(); redraw(); toast("Gespeichert");
    });
  });
  document.getElementById("pm-recipe").onclick = ()=> openRecipeGenerator(redraw, slotKey);
}

function openRecipeGenerator(redraw, slotKey){
  openModal(`
    <div class="modal-head"><h3>🤖 KI-Rezept</h3><button onclick="closeModal()">✕</button></div>
    <div class="field"><label>Zutaten, die du hast</label><input type="text" id="rg-input" placeholder="z. B. Nudeln und Käse"></div>
    <button class="btn primary" id="rg-generate">Rezept erstellen</button>
    <div id="rg-result" class="mt-16"></div>
  `);
  document.getElementById("rg-generate").onclick = ()=>{
    const val = document.getElementById("rg-input").value.trim();
    if (!val){ toast("Bitte Zutaten eingeben", "", true); return; }
    const rec = generateRecipe(val);
    document.getElementById("rg-result").innerHTML = `
      <div class="card tight">
        <h3>${escapeHtml(rec.name)}</h3>
        <div class="small muted mt-8">⏱ Zubereitungszeit: ${rec.time} Min</div>
        <div class="mt-8" style="font-weight:600;font-size:12.5px;">Zutaten:</div>
        <div class="small">${rec.ingredients.map(i=>`${escapeHtml(i.amount)} ${escapeHtml(i.name)}`).join(", ")}</div>
        <div class="mt-8" style="font-weight:600;font-size:12.5px;">Anleitung:</div>
        <ol class="small" style="padding-left:18px;">${rec.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ol>
        <div class="small muted mt-8">💡 Alternative: ${escapeHtml(rec.alt)}</div>
        <div class="btn-row mt-16">
          <button class="btn sm" id="rg-fav">❤️ Speichern</button>
          <button class="btn sm primary" id="rg-add">🍽️ Zum Essensplan hinzufügen</button>
          <button class="btn sm ghost" id="rg-again">🔄 Anderes Rezept</button>
        </div>
      </div>`;
    document.getElementById("rg-fav").onclick = ()=>{
      const saved = DB.add("recipes", Object.assign({favorite:true}, rec));
      const favs = DB.get("favorites"); favs.recipes.push(saved.id); DB.set("favorites", favs);
      toast("Gespeichert");
    };
    document.getElementById("rg-add").onclick = ()=>{
      const meals = DB.get("meals"); const ds = todayStr();
      meals[ds] = meals[ds]||{};
      meals[ds][slotKey || "mittag"] = rec;
      DB.set("meals", meals); closeModal(); redraw?.(); toast("Zum Essensplan hinzugefügt");
    };
    document.getElementById("rg-again").onclick = ()=> document.getElementById("rg-generate").click();
  };
}
