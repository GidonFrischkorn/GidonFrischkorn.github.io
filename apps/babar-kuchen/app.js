/* Kuchenverkauf – Seitenlogik. Einstellungen: config.js, Texte: i18n-<Sprache>.js. */
(function () {
  "use strict";

  var C = window.KUCHEN_CONFIG;
  var T = window.KUCHEN_I18N || {};
  var MOCK = window.KuchenMock;
  // Nur Sprachen, deren Datei auch geladen ist. Deutsch ist die Rückfallsprache.
  var LANGS = C.LANGS.filter(function (l) { return !!T[l]; });
  var LANG_KEY = "babar-kuchen-lang";

  var state = {
    lang: "de",
    counts: null,        // { id: Anzahl } nach erfolgreichem Laden
    ingCounts: null,     // { Zutat-id: Anzahl }; null, solange das Backend keine liefert
    descriptions: null,  // nur bei SHOW_DESCRIPTIONS
    loading: false,
    loadFailed: false,
    sending: false,
    nutAuto: false,      // Nuss-Allergen wurde von der Seite angekreuzt, nicht von Hand
    errors: {}           // Feld -> i18n-Schlüssel (für Sprachwechsel)
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    lang: $("lang"), title: $("title"), org: $("org"), date: $("date"),
    demoBanner: $("demoBanner"),
    overviewStatus: $("overviewStatus"), bars: $("bars"), total: $("total"),
    overviewError: $("overviewError"), overviewErrorText: $("overviewErrorText"), retry: $("retry"),
    notConfigured: $("notConfigured"), form: $("form"),
    firstName: $("firstName"), lastName: $("lastName"), category: $("category"),
    otherField: $("otherField"), otherName: $("otherName"),
    description: $("description"), website: $("website"),
    firstErr: $("firstErr"), lastErr: $("lastErr"), catErr: $("catErr"),
    otherErr: $("otherErr"), descErr: $("descErr"),
    catHint: $("catHint"), descCount: $("descCount"), descOtherNote: $("descOtherNote"),
    submit: $("submit"), submitText: $("submitText"), submitStatus: $("submitStatus"),
    submitError: $("submitError"),
    success: $("success"), successH: $("successH"), successText: $("successText"), again: $("again"),
    descCard: $("descCard"), descList: $("descList"),
    byCatH: $("byCatH"), ingBlock: $("ingBlock"), ingCounts: $("ingCounts"), ingNone: $("ingNone"),
    algGrid: $("algGrid"),
    ingField: $("ingField"), ingGrid: $("ingGrid"), ingHint: $("ingHint"),
    ingNutNote: $("ingNutNote"), ingManyHint: $("ingManyHint"), ingErr: $("ingErr"),
    markLegend: $("markLegend")
  };

  var backendReady = !!MOCK || !!C.WEB_APP_URL;

  /* ---------- Texte ---------- */

  /* Eingesetzte Werte (Zahlen, Namen, Listen) stehen zwischen unsichtbaren Richtungszeichen
     (FSI … PDI). So bleibt ein lateinischer Name in einem arabischen Satz an seinem Platz
     und umgekehrt. In Sprachen mit gleicher Schreibrichtung ändert das nichts. */
  var FSI = "⁨", PDI = "⁩";
  function t(key, vars) {
    var L = T[state.lang];
    var s = (L && L.ui && L.ui[key]) || T.de.ui[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(FSI + String(vars[k]) + PDI); });
    }
    return s;
  }
  /* Name einer Art ("cat"), eines Allergens ("alg") oder einer Hauptzutat ("ing"). */
  function label(kind, id) {
    var L = T[state.lang];
    return (L && L[kind] && L[kind][id]) || T.de[kind][id] || id;
  }
  function isCat(id) { return C.CATEGORIES.indexOf(id) >= 0; }
  function countOf(id) { return state.counts ? (state.counts[id] || 0) : null; }
  function ingCountOf(id) { return state.ingCounts ? (state.ingCounts[id] || 0) : null; }
  /* Alle eingetragenen Kuchen (Summe über die Arten). */
  function totalCount() {
    if (!state.counts) return 0;
    return C.CATEGORIES.reduce(function (s, id) { return s + countOf(id); }, 0);
  }
  /* "Schon gut vertreten": Mindestzahl UND Anteil an allen Kuchen (siehe config.js). */
  function isMarked(n, min, share) {
    return n !== null && n >= min && n >= share * totalCount();
  }
  function catMarked(id) { return isMarked(countOf(id), C.MARK_MIN, C.MARK_SHARE); }
  /* «Andere» ist ein Sammelbegriff: nie markieren, der Rat "andere Zutat" ergäbe keinen Sinn. */
  function ingMarked(id) {
    return id !== C.OTHER_INGREDIENT && isMarked(ingCountOf(id), C.ING_MARK_MIN, C.ING_MARK_SHARE);
  }
  /* Vorschläge im Hinweis: die zwei am wenigsten vertretenen Arten, ohne die gewählte,
     ohne Torte (passt nicht zum Verkaufstipp) und ohne Sonstiges. Bei Gleichstand gilt die
     Listenreihenfolge, d. h. Handliches zuerst. */
  var NO_SUGGEST = { torte: true };
  NO_SUGGEST[C.OTHER_CATEGORY] = true;
  function suggestCategories(exceptId) {
    return C.CATEGORIES
      .filter(function (id) { return id !== exceptId && !NO_SUGGEST[id]; })
      .map(function (id, i) { return { id: id, n: countOf(id), i: i }; })
      .sort(function (a, b) { return (a.n - b.n) || (a.i - b.i); })
      .slice(0, 2)
      .map(function (x) { return label("cat", x.id); });
  }
  function checkedIn(grid, ids) {
    return ids.filter(function (id) {
      var box = grid.querySelector('input[value="' + id + '"]');
      return box && box.checked;
    });
  }
  function checkedIngredients() { return checkedIn(el.ingGrid, C.INGREDIENTS); }
  function checkedAllergens() { return checkedIn(el.algGrid, C.ALLERGENS); }
  /* "Muffins/Cupcakes", "Muffins/Cupcakes (Schokolade, Banane)" oder "Sonstiges: Baklava" */
  function entryLabel(catId, ingIds, otherName) {
    var s = label("cat", catId);
    if (otherName) s += ": " + otherName;
    if (ingIds && ingIds.length) s += " (" + ingIds.map(function (id) { return label("ing", id); }).join(", ") + ")";
    return s;
  }

  function formatDate() {
    var p = C.EVENT.date.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    var fallback = ("0" + p[2]).slice(-2) + "." + ("0" + p[1]).slice(-2) + "." + p[0];
    try {
      var loc = (T[state.lang].meta && T[state.lang].meta.locale) || state.lang;
      // Kalender und Ziffern fest vorgeben: Ohne das zeigt Persisch das Jahr 1405 und
      // Thai das Jahr 2569, und Arabisch je nach Gerät andere Ziffern.
      var fmt = new Intl.DateTimeFormat(loc, {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        calendar: "gregory", numberingSystem: "latn"
      });
      // Kennt der Browser die Sprache nicht (z. B. Tigrinya), lieber Zahlen als eine fremde Sprache.
      if (fmt.resolvedOptions().locale.split("-")[0] !== loc.split("-")[0]) return fallback;
      return fmt.format(d);
    } catch (e) { return fallback; }
  }

  /* ---------- Sprache ---------- */

  /* "ar-SA" -> "ar", "zh-Hans-CN" -> "zh"; null, wenn die Seite die Sprache nicht hat. */
  function matchLang(tag) {
    if (!tag) return null;
    var low = String(tag).toLowerCase();
    if (LANGS.indexOf(low) >= 0) return low;
    var base = low.split("-")[0];
    if (base === "kmr") base = "ku";   // Kurmandschi wird teils als "kmr" gemeldet
    return LANGS.indexOf(base) >= 0 ? base : null;
  }

  /* Reihenfolge: Adresse (?lang=…), frühere Wahl auf diesem Gerät, Sprachen des Geräts, Deutsch. */
  function initialLang() {
    var m = null;
    try { m = matchLang(new URLSearchParams(location.search).get("lang")); } catch (e) {}
    if (m) return m;
    try { m = matchLang(localStorage.getItem(LANG_KEY)); } catch (e) {}
    if (m) return m;
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < prefs.length; i++) {
      m = matchLang(prefs[i]);
      if (m) return m;
    }
    return "de";
  }

  function buildLangSelect() {
    LANGS.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l;
      o.lang = l;
      o.textContent = T[l].meta.name;
      el.lang.appendChild(o);
    });
    el.lang.addEventListener("change", function () { setLang(el.lang.value, true); });
  }

  function setLang(l, remember) {
    state.lang = l;
    document.documentElement.lang = l;
    document.documentElement.dir = T[l].meta.dir === "rtl" ? "rtl" : "ltr";
    if (remember) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
    el.lang.value = l;
    renderTexts();
  }

  function renderTexts() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    var title = T[state.lang].title || T.de.title;
    el.title.textContent = title;
    el.org.textContent = C.EVENT.org;
    el.date.textContent = formatDate();
    document.title = title + " · " + C.EVENT.org;
    if (MOCK) { el.demoBanner.textContent = t("demo_banner"); el.demoBanner.hidden = false; }
    if (state.sending) el.submitText.textContent = t("sending");
    renderOverview();
    renderSelect();
    renderDescCount();
    renderFieldErrors();
    renderChoices();
    if (!el.success.hidden && el.success.dataset.cat) {
      el.successText.textContent = t("success_text", {
        cat: entryLabel(el.success.dataset.cat,
                        el.success.dataset.ings ? el.success.dataset.ings.split(",") : [],
                        el.success.dataset.other),
        name: el.success.dataset.name
      });
    }
    if (!el.submitError.hidden && el.submitError.dataset.key) {
      el.submitError.textContent = t(el.submitError.dataset.key);
    }
  }

  /* ---------- Backend ---------- */

  function request(method, payload) {
    if (MOCK) return MOCK.request(method, payload);
    if (!C.WEB_APP_URL) return Promise.reject(new Error("not_configured"));
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, C.TIMEOUT_MS) : null;
    // Einfache Anfrage ohne eigene Header ausser text/plain -> kein CORS-Preflight.
    // Apps Script antwortet mit einer Weiterleitung (302) auf script.googleusercontent.com;
    // fetch folgt ihr und liest die JSON-Antwort von dort.
    var opts = { method: method, redirect: "follow", credentials: "omit", cache: "no-store" };
    if (ctrl) opts.signal = ctrl.signal;
    if (method === "POST") {
      opts.headers = { "Content-Type": "text/plain;charset=utf-8" };
      opts.body = JSON.stringify(payload);
    }
    return fetch(C.WEB_APP_URL, opts)
      .then(function (res) {
        if (!res.ok) throw new Error("http_" + res.status);
        return res.text();
      })
      .then(function (txt) {
        try { return JSON.parse(txt); } catch (e) {
          // Typisch, wenn die Web-App nicht auf "Zugriff: Jeder" steht: Google liefert eine Login-Seite.
          console.error("Antwort ist kein JSON. Ist die Web-App mit 'Zugriff: Jeder' bereitgestellt?");
          throw new Error("bad_response");
        }
      })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        return data;
      }, function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  /* ---------- Übersicht ---------- */

  function loadCounts() {
    if (!backendReady) { renderOverview(); return; }
    state.loading = true;
    state.loadFailed = false;
    el.bars.setAttribute("aria-busy", "true");
    renderOverview();
    request("GET")
      .then(function (data) {
        if (!data || !data.ok || typeof data.counts !== "object") throw new Error("bad_response");
        state.counts = data.counts;
        state.ingCounts = (data.ingredients && typeof data.ingredients === "object") ? data.ingredients : null;
        state.descriptions = (C.SHOW_DESCRIPTIONS && data.descriptions) || null;
      })
      .catch(function (err) {
        console.warn("Übersicht nicht geladen:", err && err.message);
        state.loadFailed = true;
      })
      .then(function () {
        state.loading = false;
        el.bars.removeAttribute("aria-busy");
        renderOverview();
        renderSelect();
        renderChoices();
        renderDescriptions();
      });
  }

  function renderOverview() {
    var have = !!state.counts;
    el.overviewStatus.textContent = !backendReady ? t("not_configured")
      : (state.loading && !have) ? t("loading") : "";
    el.overviewError.hidden = !state.loadFailed;
    if (state.loadFailed) el.overviewErrorText.textContent = t("load_error");
    el.notConfigured.hidden = backendReady;
    el.form.hidden = !backendReady || !el.success.hidden;

    el.bars.hidden = !have;
    el.byCatH.hidden = !have;
    el.total.hidden = !have;
    el.ingBlock.hidden = !have || !state.ingCounts;
    if (!have) return;

    var max = 1, total = 0;
    C.CATEGORIES.forEach(function (id) { var n = countOf(id); total += n; if (n > max) max = n; });

    var anyMarked = false;
    el.bars.textContent = "";
    C.CATEGORIES.forEach(function (id) {
      var n = countOf(id);
      var li = document.createElement("li");
      var marked = catMarked(id);
      if (marked) { li.className = "many"; anyMarked = true; }
      var row = document.createElement("div");
      row.className = "bar-row";
      var lab = document.createElement("span");
      lab.className = "bar-label";
      lab.textContent = label("cat", id);
      if (marked) lab.appendChild(srMark());
      var num = document.createElement("span");
      num.className = "bar-count";
      num.textContent = String(n);
      row.appendChild(lab);
      row.appendChild(num);
      var track = document.createElement("div");
      track.className = "bar-track";
      track.setAttribute("aria-hidden", "true");
      var fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = (n === 0 ? 0 : Math.max(4, Math.round(100 * n / max))) + "%";
      track.appendChild(fill);
      li.appendChild(row);
      li.appendChild(track);
      el.bars.appendChild(li);
    });
    el.total.textContent = total === 0 ? t("empty") : t("total", { n: total });
    if (renderIngredientOverview()) anyMarked = true;
    // Erklärung der Farbe nur, wenn etwas markiert ist (Farbe nie als einziges Signal).
    el.markLegend.textContent = t("mark_legend");
    el.markLegend.hidden = !anyMarked;
  }

  /* Unsichtbarer Zusatz für Screenreader an markierten Balken/Kärtchen. */
  function srMark() {
    var s = document.createElement("span");
    s.className = "sr-only";
    s.textContent = " " + t("mark_sr");
    return s;
  }

  /* Zutaten in der Übersicht: nur die, die schon vorkommen, häufigste zuerst.
     Gibt zurück, ob eine Zutat markiert ist. */
  function renderIngredientOverview() {
    el.ingCounts.textContent = "";
    if (!state.ingCounts) return false;
    var anyMarked = false;
    var used = C.INGREDIENTS.filter(function (id) { return ingCountOf(id) > 0; });
    used.sort(function (a, b) { return ingCountOf(b) - ingCountOf(a); });   // stabil: sonst Listenreihenfolge
    used.forEach(function (id) {
      var n = ingCountOf(id);
      var li = document.createElement("li");
      var marked = ingMarked(id);
      if (marked) anyMarked = true;
      li.className = "chip" + (marked ? " many" : "");
      var lab = document.createElement("span");
      lab.textContent = label("ing", id);
      if (marked) lab.appendChild(srMark());
      var num = document.createElement("span");
      num.className = "chip-n";
      num.textContent = String(n);
      li.appendChild(lab);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(num);
      el.ingCounts.appendChild(li);
    });
    el.ingCounts.hidden = used.length === 0;
    el.ingNone.hidden = used.length > 0;
    return anyMarked;
  }

  function renderDescriptions() {
    var d = state.descriptions;
    if (!C.SHOW_DESCRIPTIONS || !d) { el.descCard.hidden = true; return; }
    el.descList.textContent = "";
    var any = false;
    C.CATEGORIES.forEach(function (id) {
      var list = (d[id] || []).filter(function (s) { return typeof s === "string" && s; });
      if (!list.length) return;
      any = true;
      var g = document.createElement("div");
      g.className = "desc-group";
      var h = document.createElement("h3");
      h.textContent = label("cat", id);
      var ul = document.createElement("ul");
      list.forEach(function (s) {
        var li = document.createElement("li");
        li.dir = "auto";
        li.textContent = s;   // textContent: Freitext wird nie als HTML interpretiert
        ul.appendChild(li);
      });
      g.appendChild(h);
      g.appendChild(ul);
      el.descList.appendChild(g);
    });
    el.descCard.hidden = !any;
  }

  /* ---------- Formular ---------- */

  function renderSelect() {
    var current = el.category.value;
    el.category.textContent = "";
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = t("cat_placeholder");
    el.category.appendChild(ph);
    C.CATEGORIES.forEach(function (id) {
      var o = document.createElement("option");
      o.value = id;
      var n = countOf(id);
      o.textContent = label("cat", id) + (n === null ? "" : " (" + n + ")");
      el.category.appendChild(o);
    });
    el.category.value = current;
  }

  /* Kästchen einmal anlegen (Allergene und Hauptzutaten sehen gleich aus). */
  function buildBoxes(grid, ids, name) {
    if (grid.firstChild) return;
    ids.forEach(function (id) {
      var lab = document.createElement("label");
      lab.className = "ing";
      var box = document.createElement("input");
      box.type = "checkbox";
      box.name = name;
      box.value = id;
      var txt = document.createElement("span");
      txt.className = "ing-label";
      lab.appendChild(box);
      lab.appendChild(txt);
      grid.appendChild(lab);
    });
  }
  // Umbruch nach "/" erlauben (unsichtbares Leerzeichen), statt mitten im Wort zu trennen.
  function breakable(s) { return s.replace(/\//g, "/​"); }

  function renderIngredients() {
    buildBoxes(el.ingGrid, C.INGREDIENTS, "ingredients");
    el.ingHint.textContent = t("ing_hint", { n: C.MAX_INGREDIENTS });
    var full = checkedIngredients().length >= C.MAX_INGREDIENTS;
    Array.prototype.forEach.call(el.ingGrid.querySelectorAll("input"), function (box) {
      var n = ingCountOf(box.value);
      box.nextSibling.textContent = breakable(label("ing", box.value)) + (n === null ? "" : " (" + n + ")");
      // Bei voller Auswahl die übrigen sperren; abwählen geht immer.
      box.disabled = full && !box.checked;
      box.parentNode.classList.toggle("off", box.disabled);
    });
  }

  /* Allergene. Wer Nüsse/Mandeln als Hauptzutat wählt, bekommt «Enthält Nüsse/Mandeln»
     angekreuzt und gesperrt; das Backend setzt dieselbe Regel durch. Hat die Seite das Kästchen
     selbst gesetzt, nimmt sie es auch wieder weg, sobald die Hauptzutat abgewählt wird. */
  function renderAllergens() {
    buildBoxes(el.algGrid, C.ALLERGENS, "allergens");
    var nut = checkedIngredients().indexOf(C.NUT_LINK.ingredient) >= 0;
    Array.prototype.forEach.call(el.algGrid.querySelectorAll("input"), function (box) {
      box.nextSibling.textContent = breakable(label("alg", box.value));
      if (box.value !== C.NUT_LINK.allergen) return;
      if (nut) {
        if (!box.checked) { box.checked = true; state.nutAuto = true; }
      } else if (state.nutAuto) {
        box.checked = false;
        state.nutAuto = false;
      }
      box.disabled = nut;
      box.parentNode.classList.toggle("locked", nut);
    });
    el.ingNutNote.textContent = nut ? t("alg_nut_note") : "";
  }

  function renderOther() {
    el.otherField.hidden = el.category.value !== C.OTHER_CATEGORY;
  }

  function renderManyHint() {
    var cat = isCat(el.category.value) ? el.category.value : null;
    el.catHint.textContent = (cat && catMarked(cat))
      ? t("hint_many", { cat: label("cat", cat), n: countOf(cat), list: suggestCategories(cat).join(t("list_and")) })
      : "";
    var many = checkedIngredients().filter(ingMarked);
    el.ingManyHint.textContent = many.length
      ? t("hint_many_ing", { list: many.map(function (id) { return label("ing", id); }).join(", ") })
      : "";
    el.descOtherNote.textContent = checkedIngredients().indexOf(C.OTHER_INGREDIENT) >= 0
      ? t("ing_other_note") : "";
  }

  /* Alles, was von Art und Kästchen abhängt. Reihenfolge: erst die Zutaten, dann die Allergene. */
  function renderChoices() {
    renderOther();
    renderIngredients();
    renderAllergens();
    renderManyHint();
  }

  function renderDescCount() {
    var left = C.MAX_DESC - el.description.value.length;
    el.descCount.textContent = t("chars_left", { n: Math.max(0, left) });
  }

  /* Reihenfolge = Reihenfolge auf der Seite: Der erste Fehler bekommt den Fokus. */
  var FIELDS = {
    firstName: { input: "firstName", err: "firstErr" },
    lastName: { input: "lastName", err: "lastErr" },
    category: { input: "category", err: "catErr" },
    otherName: { input: "otherName", err: "otherErr" },
    ingredients: { input: "ingField", err: "ingErr" },
    description: { input: "description", err: "descErr" }
  };
  var LIMITS = { firstName: "MAX_NAME", lastName: "MAX_NAME", otherName: "MAX_OTHER",
                 description: "MAX_DESC", ingredients: "MAX_INGREDIENTS" };
  function focusField(f) {
    if (f === "ingredients") { var b = el.ingGrid.querySelector("input:not([disabled])"); if (b) b.focus(); return; }
    el[FIELDS[f].input].focus();
  }

  function renderFieldErrors() {
    Object.keys(FIELDS).forEach(function (f) {
      var key = state.errors[f];
      var input = el[FIELDS[f].input], err = el[FIELDS[f].err];
      if (key) {
        err.textContent = t(key, { n: C[LIMITS[f]] });
        err.hidden = false;
        input.setAttribute("aria-invalid", "true");
      } else {
        err.textContent = "";
        err.hidden = true;
        input.removeAttribute("aria-invalid");
      }
    });
  }

  function tidy(s) { return s.replace(/\s+/g, " ").trim(); }

  function values() {
    var category = el.category.value;
    return {
      firstName: tidy(el.firstName.value),
      lastName: tidy(el.lastName.value),
      category: category,
      // Die Bezeichnung gilt nur für «Sonstiges»; ein Rest aus einer früheren Wahl geht nicht mit.
      otherName: category === C.OTHER_CATEGORY ? tidy(el.otherName.value) : "",
      allergens: checkedAllergens(),
      ingredients: checkedIngredients(),
      description: tidy(el.description.value),
      website: el.website.value
    };
  }

  function validate(v) {
    var e = {};
    if (!v.firstName) e.firstName = "err_first";
    else if (v.firstName.length > C.MAX_NAME) e.firstName = "err_name_long";
    if (!v.lastName) e.lastName = "err_last";
    else if (v.lastName.length > C.MAX_NAME) e.lastName = "err_name_long";
    if (!isCat(v.category)) e.category = "err_cat";
    if (v.otherName.length > C.MAX_OTHER) e.otherName = "err_other_long";
    if (v.ingredients.length > C.MAX_INGREDIENTS) e.ingredients = "err_ing";
    if (v.description.length > C.MAX_DESC) e.description = "err_desc_long";
    return e;
  }

  /* Fehlercodes des Backends -> Feld und Text. Alles andere zeigt die allgemeine Meldung. */
  var SERVER_ERRORS = {
    first_name_required: ["firstName", "err_first"],
    first_name_too_long: ["firstName", "err_name_long"],
    last_name_required: ["lastName", "err_last"],
    last_name_too_long: ["lastName", "err_name_long"],
    category_invalid: ["category", "err_cat"],
    other_too_long: ["otherName", "err_other_long"],
    description_too_long: ["description", "err_desc_long"],
    ingredients_invalid: ["ingredients", "err_ing"]
  };

  function showSubmitError(key) {
    el.submitError.dataset.key = key;
    el.submitError.textContent = t(key);
    el.submitError.hidden = false;
  }

  function setSending(on) {
    state.sending = on;
    el.submit.disabled = on;
    el.submitText.textContent = t(on ? "sending" : "submit");
    el.submitStatus.textContent = on ? t("sending") : "";
    el.form.setAttribute("aria-busy", on ? "true" : "false");
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (state.sending) return;           // Doppelklick-Schutz
    el.submitError.hidden = true;
    var v = values();
    state.errors = validate(v);
    renderFieldErrors();
    var first = Object.keys(FIELDS).filter(function (f) { return state.errors[f]; })[0];
    if (first) { focusField(first); return; }

    setSending(true);
    request("POST", v)
      .then(function (data) {
        if (data && data.ok) { showSuccess(v); return; }
        var code = data && data.error;
        var map = SERVER_ERRORS[code];
        if (map) {
          state.errors = {};
          state.errors[map[0]] = map[1];
          renderFieldErrors();
          focusField(map[0]);
        } else {
          showSubmitError(code === "full" ? "err_full" : "err_submit");
        }
      })
      .catch(function (err) {
        console.warn("Absenden fehlgeschlagen:", err && err.message);
        showSubmitError("err_submit");   // Eingaben bleiben stehen
      })
      .then(function () { setSending(false); });
  }

  function showSuccess(v) {
    var name = v.firstName + " " + v.lastName;
    el.success.dataset.cat = v.category;
    el.success.dataset.name = name;
    el.success.dataset.ings = v.ingredients.join(",");
    el.success.dataset.other = v.otherName;
    el.successText.textContent = t("success_text", {
      cat: entryLabel(v.category, v.ingredients, v.otherName), name: name
    });
    el.form.hidden = true;
    el.success.hidden = false;
    el.successH.focus();
    loadCounts();
  }

  function resetForm() {
    el.form.reset();
    state.errors = {};
    state.nutAuto = false;
    el.submitError.hidden = true;
    el.success.hidden = true;
    delete el.success.dataset.cat;
    delete el.success.dataset.name;
    delete el.success.dataset.ings;
    delete el.success.dataset.other;
    el.form.hidden = false;
    renderFieldErrors();
    renderChoices();
    renderDescCount();
    el.firstName.focus();
  }

  /* ---------- Start ---------- */

  el.firstName.maxLength = C.MAX_NAME;
  el.lastName.maxLength = C.MAX_NAME;
  el.otherName.maxLength = C.MAX_OTHER;
  el.description.maxLength = C.MAX_DESC;
  buildLangSelect();
  setLang(initialLang(), false);

  function clearOnInput(input, field, extra) {
    input.addEventListener("input", function () {
      if (extra) extra();
      if (state.errors[field]) { delete state.errors[field]; renderFieldErrors(); }
    });
  }

  el.form.addEventListener("submit", onSubmit);
  el.category.addEventListener("change", function () {
    if (state.errors.category) { delete state.errors.category; renderFieldErrors(); }
    renderOther();
    renderManyHint();
  });
  el.ingGrid.addEventListener("change", function () {
    if (state.errors.ingredients) { delete state.errors.ingredients; renderFieldErrors(); }
    renderIngredients();
    renderAllergens();
    renderManyHint();
  });
  el.algGrid.addEventListener("change", function (ev) {
    // Von Hand geändert: Das Nuss-Kästchen gehört ab jetzt der Person, nicht der Automatik.
    if (ev.target && ev.target.value === C.NUT_LINK.allergen) state.nutAuto = false;
  });
  clearOnInput(el.firstName, "firstName");
  clearOnInput(el.lastName, "lastName");
  clearOnInput(el.otherName, "otherName");
  clearOnInput(el.description, "description", renderDescCount);
  el.retry.addEventListener("click", loadCounts);
  el.again.addEventListener("click", resetForm);

  loadCounts();
})();
