/* ==========================================================================
   DB — persistente Speicherung über localStorage.
   Jede Collection ist ein Array von Objekten mit eindeutiger "id".
   Alles läuft synchron und lokal — nach Reload bleiben alle Daten erhalten.
   ========================================================================== */

const DB = (() => {
  const KEY = "schulcockpit_v1";

  const DEFAULTS = {
    meta: { seeded: false },
    settings: {
      name: "Max",
      klasse: "8. Klasse M-Zug",
      schule: "Mittelschule, Bayern",
      theme: "dark",
      leaveTime: "07:35",
      notificationsOn: true,
      mealTimes: { fruehstueck: "07:05", snack1: "10:00", mittag: "12:30", snack2: "15:30", abend: "18:30" },
      trainingTime: "16:30",
      focusDefault: 25,
      weekendRoutine: false
    },
    subjects: [
      { id: "f-mathe", name: "Mathematik", color: "#6EA8FE" },
      { id: "f-deutsch", name: "Deutsch", color: "#E8B84B" },
      { id: "f-englisch", name: "Englisch", color: "#B79CFF" },
      { id: "f-physik", name: "Physik", color: "#4ADE80" },
      { id: "f-geschichte", name: "Geschichte", color: "#FF9F6E" },
      { id: "f-sport", name: "Sport", color: "#4ADE80" },
      { id: "f-kunst", name: "Kunst", color: "#FBBF24" },
      { id: "f-wirtschaft", name: "Wirtschaft", color: "#6EA8FE" }
    ],
    schedule: [],        // {id, day(1-7), subjectId, teacher, room, start, end, notes}
    scheduleExceptions: [], // {id, scheduleId, date:"YYYY-MM-DD", type:"skip"|"override", overrideData}
    homework: [],         // {id, subjectId, task, due, priority, notes, done, important}
    exams: [],            // {id, subjectId, date, time, topic, notes}
    grades: [],           // {id, subjectId, value, type, date, weight}
    backpackChecks: {},   // date -> [ {label, checked} ]
    routineTemplate: [
      { id:"r1", time:"06:30", title:"Aufstehen", tasks:["Aufstehen","Bett machen"] },
      { id:"r2", time:"06:35", title:"Wasser", tasks:["Wasser trinken"] },
      { id:"r3", time:"06:40", title:"Badezimmer", tasks:["Zähne putzen","Gesicht waschen","Anziehen"] },
      { id:"r4", time:"06:55", title:"Bewegung", tasks:["3–5 Minuten leicht bewegen/dehnen"] },
      { id:"r5", time:"07:05", title:"Frühstück", tasks:["Frühstück essen"] },
      { id:"r6", time:"07:20", title:"Schulsachen", tasks:["Rucksack kontrollieren","Hausaufgaben kontrollieren","Stundenplan ansehen","Trinkflasche einpacken"] },
      { id:"r7", time:"07:30", title:"Fertig", tasks:["Jacke","Schuhe","Handy","Schulsachen"] },
      { id:"r8", time:"07:35", title:"Losgehen", tasks:["Zur Schule gehen/fahren"] }
    ],
    routineChecks: {},    // date -> { "r1:0": true, ... }
    calendarEvents: [],   // {id, title, date, start, end, repeat:"none"|"weekly", notes, reminder}
    notebooks: [],        // {id, name, pages:[{id,name,strokes:[]}]}
    conversations: [],    // {id, name, messages:[{id,text,fromMe,ts,read}]}
    meals: {},            // date -> {fruehstueck, snack1, mittag, snack2, abend} each {name, ...}
    recipes: [],          // {id, name, ingredients:[{name,amount}], time, steps:[], alt, favorite}
    exercises: [],         // {id, name, favorite, notes}
    trainingSessions: [], // {id, date, entries:[{exerciseId,sets:[{reps,weight}]}], durationSec}
    favorites: { recipes: [], exercises: [], notes: [] },
    focusLog: [],          // {id, date, minutes}
    importantFlags: [],   // manually starred item refs: {id, kind, refId, label}
    aiThreads: [{ id:"default", name:"Allgemein", messages:[] }],
    aiConfig: { endpoint: "", enabled: false },
    dismissedReminders: [] // ids of reminders already fired/dismissed, to avoid repeat spam
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      // merge defaults for any missing keys (forward-compatible)
      return Object.assign(structuredClone(DEFAULTS), parsed);
    } catch (e) {
      console.error("DB load error", e);
      return structuredClone(DEFAULTS);
    }
  }

  let state = load();
  let saveTimer = null;

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error("DB save error", e); }
    }, 80);
  }

  function uid(prefix = "id") {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function get(collection) { return state[collection]; }
  function set(collection, value) { state[collection] = value; persist(); }

  function add(collection, obj) {
    if (!Array.isArray(state[collection])) state[collection] = [];
    const item = Object.assign({ id: uid(collection) }, obj);
    state[collection].push(item);
    persist();
    return item;
  }
  function update(collection, id, patch) {
    const arr = state[collection];
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return null;
    arr[idx] = Object.assign({}, arr[idx], patch);
    persist();
    return arr[idx];
  }
  function remove(collection, id) {
    state[collection] = state[collection].filter(x => x.id !== id);
    persist();
  }
  function find(collection, id) {
    return (state[collection] || []).find(x => x.id === id) || null;
  }

  function updateSettings(patch) {
    state.settings = Object.assign({}, state.settings, patch);
    persist();
  }

  function resetAll() {
    localStorage.removeItem(KEY);
    state = structuredClone(DEFAULTS);
    persist();
  }

  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(json) {
    const parsed = JSON.parse(json);
    state = Object.assign(structuredClone(DEFAULTS), parsed);
    persist();
  }

  return { get, set, add, update, remove, find, updateSettings, resetAll, exportJSON, importJSON, uid, raw: () => state };
})();
