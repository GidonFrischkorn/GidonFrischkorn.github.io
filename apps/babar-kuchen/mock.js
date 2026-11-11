/* Testmodus ohne Backend. Aktiv nur mit ?demo=… in der Adresse:
     ?demo=1      Beispieldaten, Einträge werden nur in diesem Browser-Tab gehalten
     ?demo=empty  wie 1, aber ohne Startdaten
     ?demo=error  Backend nicht erreichbar (Laden und Absenden schlagen fehl)
     ?demo=slow   wie 1, aber mit 3 Sekunden Verzögerung (Ladezustände ansehen)
   Antworten haben dieselbe Form wie die des echten Apps Script (Code.gs). */
(function () {
  var mode = null;
  try { mode = new URLSearchParams(location.search).get("demo"); } catch (e) {}
  if (!mode) { window.KuchenMock = null; return; }

  var C = window.KUCHEN_CONFIG;
  var KEY = "babar-kuchen-demo";
  var SEED = { schoko: 4, obst: 1, ruehr: 3, muffins: 2, blech: 1, sonstiges: 1 };
  var SEED_DESC = { schoko: ["Brownies", "Schoggitorte, vegan"], ruehr: ["Marmorkuchen, glutenfrei"] };

  function load() {
    try {
      var s = sessionStorage.getItem(KEY + ":" + mode);
      if (s) return JSON.parse(s);
    } catch (e) {}
    var rows = [];
    if (mode !== "empty") {
      Object.keys(SEED).forEach(function (id) {
        for (var i = 0; i < SEED[id]; i++) {
          rows.push({ category: id, description: (SEED_DESC[id] || [])[i] || "" });
        }
      });
    }
    return rows;
  }
  function save(rows) {
    try { sessionStorage.setItem(KEY + ":" + mode, JSON.stringify(rows)); } catch (e) {}
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ids() { return C.CATEGORIES.map(function (c) { return c.id; }); }

  function handle(method, payload) {
    var rows = load();
    if (method === "GET") {
      var counts = {}, descriptions = {};
      ids().forEach(function (id) { counts[id] = 0; descriptions[id] = []; });
      rows.forEach(function (r) {
        if (counts.hasOwnProperty(r.category)) {
          counts[r.category]++;
          if (r.description) descriptions[r.category].push(r.description);
        }
      });
      var out = { ok: true, counts: counts, total: rows.length };
      if (C.SHOW_DESCRIPTIONS) out.descriptions = descriptions;
      return out;
    }
    // POST – vereinfachte Version der Prüfungen in Code.gs
    if (payload.website) return { ok: true };
    var name = String(payload.name || "").trim();
    var desc = String(payload.description || "").trim();
    if (!name) return { ok: false, error: "name_required" };
    if (name.length > C.MAX_NAME) return { ok: false, error: "name_too_long" };
    if (ids().indexOf(payload.category) < 0) return { ok: false, error: "category_invalid" };
    if (desc.length > C.MAX_DESC) return { ok: false, error: "description_too_long" };
    rows.push({ category: payload.category, description: desc });
    save(rows);
    return { ok: true };
  }

  window.KuchenMock = {
    mode: mode,
    request: function (method, payload) {
      var wait = mode === "slow" ? 3000 : 400;
      return delay(wait).then(function () {
        if (mode === "error") throw new TypeError("Failed to fetch (Testmodus)");
        return handle(method, payload);
      });
    }
  };
})();
