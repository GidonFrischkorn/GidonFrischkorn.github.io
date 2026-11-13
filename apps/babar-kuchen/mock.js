/* Testmodus ohne Backend. Aktiv nur mit ?demo=… in der Adresse:
     ?demo=1      Beispieldaten, Einträge werden nur in diesem Browser-Tab gehalten
     ?demo=empty  wie 1, aber ohne Startdaten
     ?demo=error  Backend nicht erreichbar (Laden und Absenden schlagen fehl)
     ?demo=slow   wie 1, aber mit 3 Sekunden Verzögerung (Ladezustände ansehen)
     ?demo=closed wie 1, aber nach dem Anmeldeschluss (nur noch die Übersicht)
   Antworten haben dieselbe Form wie die des echten Apps Script (Code.gs). */
(function () {
  var mode = null;
  try { mode = new URLSearchParams(location.search).get("demo"); } catch (e) {}
  if (!mode) { window.KuchenMock = null; return; }

  var C = window.KUCHEN_CONFIG;
  var KEY = "babar-kuchen-demo3";   // neuer Schlüssel: alte Demo-Daten im Tab nicht weiterverwenden
  // [Art, Hauptzutaten, Beschreibung] – 12 Beispiel-Einträge
  var SEED = [
    ["muffins", ["schoko"], ""], ["muffins", ["schoko", "banane"], ""], ["muffins", ["beeren"], ""],
    ["blech", ["schoko"], "Brownies"], ["blech", ["apfel"], ""],
    ["ruehr", ["natur"], "Marmorkuchen, glutenfrei"], ["ruehr", ["zitrone"], ""], ["ruehr", ["schoko", "nuss"], ""],
    ["guetzli", ["gewuerz", "nuss"], "Zimtsterne"], ["waehe", ["apfel"], ""],
    ["torte", ["rueebli", "nuss"], ""], ["sonstiges", ["andere"], "Baklava mit Pistazien"]
  ];

  function load() {
    try {
      var s = sessionStorage.getItem(KEY + ":" + mode);
      if (s) return JSON.parse(s);
    } catch (e) {}
    var rows = [];
    if (mode !== "empty") {
      SEED.forEach(function (r) { rows.push({ category: r[0], ingredients: r[1], description: r[2] }); });
    }
    return rows;
  }
  function save(rows) {
    try { sessionStorage.setItem(KEY + ":" + mode, JSON.stringify(rows)); } catch (e) {}
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ids() { return C.CATEGORIES; }
  function ingIds() { return C.INGREDIENTS; }
  function known(list, allowed, max) {
    return Array.isArray(list) && list.length <= max &&
      !list.some(function (id) { return allowed.indexOf(id) < 0; });
  }

  function handle(method, payload) {
    var rows = load();
    if (method === "GET") {
      var counts = {}, descriptions = {}, ingredients = {};
      ids().forEach(function (id) { counts[id] = 0; descriptions[id] = []; });
      ingIds().forEach(function (id) { ingredients[id] = 0; });
      rows.forEach(function (r) {
        if (counts.hasOwnProperty(r.category)) {
          counts[r.category]++;
          if (r.description) descriptions[r.category].push(r.description);
          (r.ingredients || []).forEach(function (g) { if (ingredients.hasOwnProperty(g)) ingredients[g]++; });
        }
      });
      var out = { ok: true, counts: counts, ingredients: ingredients, total: rows.length };
      if (C.SHOW_DESCRIPTIONS) out.descriptions = descriptions;
      return out;
    }
    // POST – vereinfachte Version der Prüfungen in Code.gs
    if (payload.website) return { ok: true };
    var first = String(payload.firstName || "").trim();
    var last = String(payload.lastName || "").trim();
    var desc = String(payload.description || "").trim();
    var other = payload.category === C.OTHER_CATEGORY ? String(payload.otherName || "").trim() : "";
    if (!first) return { ok: false, error: "first_name_required" };
    if (first.length > C.MAX_NAME) return { ok: false, error: "first_name_too_long" };
    if (!last) return { ok: false, error: "last_name_required" };
    if (last.length > C.MAX_NAME) return { ok: false, error: "last_name_too_long" };
    if (ids().indexOf(payload.category) < 0) return { ok: false, error: "category_invalid" };
    if (other.length > C.MAX_OTHER) return { ok: false, error: "other_too_long" };
    if (desc.length > C.MAX_DESC) return { ok: false, error: "description_too_long" };
    var ings = payload.ingredients || [];
    if (!known(ings, ingIds(), C.MAX_INGREDIENTS)) return { ok: false, error: "ingredients_invalid" };
    if (!known(payload.allergens || [], C.ALLERGENS, C.ALLERGENS.length)) {
      return { ok: false, error: "allergens_invalid" };
    }
    rows.push({ category: payload.category, ingredients: ings, description: desc });
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
