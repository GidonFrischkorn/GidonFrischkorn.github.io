/* Kuchenverkauf – Seitenlogik. Einstellungen: config.js, Texte: i18n.js. */
(function () {
  "use strict";

  var C = window.KUCHEN_CONFIG;
  var T = window.KUCHEN_I18N;
  var MOCK = window.KuchenMock;
  var LANGS = ["de", "en", "fr", "it", "ti"];
  var LOCALES = { de: "de-CH", en: "en-GB", fr: "fr-CH", it: "it-CH", ti: "ti" };
  var LANG_KEY = "babar-kuchen-lang";

  var state = {
    lang: "de",
    counts: null,        // { id: Anzahl } nach erfolgreichem Laden
    ingCounts: null,     // { Zutat-id: Anzahl }; null, solange das Backend keine liefert
    descriptions: null,  // nur bei SHOW_DESCRIPTIONS
    loading: false,
    loadFailed: false,
    sending: false,
    errors: {}           // Feld -> i18n-Schlüssel (für Sprachwechsel)
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    langs: $("langs"), title: $("title"), org: $("org"), date: $("date"),
    demoBanner: $("demoBanner"),
    overviewStatus: $("overviewStatus"), bars: $("bars"), total: $("total"),
    overviewError: $("overviewError"), overviewErrorText: $("overviewErrorText"), retry: $("retry"),
    notConfigured: $("notConfigured"), form: $("form"),
    name: $("name"), category: $("category"), description: $("description"), website: $("website"),
    nameErr: $("nameErr"), catErr: $("catErr"), descErr: $("descErr"),
    catHint: $("catHint"), descCount: $("descCount"),
    submit: $("submit"), submitText: $("submitText"), submitStatus: $("submitStatus"),
    submitError: $("submitError"),
    success: $("success"), successH: $("successH"), successText: $("successText"), again: $("again"),
    descCard: $("descCard"), descList: $("descList"),
    byCatH: $("byCatH"), ingBlock: $("ingBlock"), ingCounts: $("ingCounts"), ingNone: $("ingNone"),
    ingField: $("ingField"), ingGrid: $("ingGrid"), ingHint: $("ingHint"),
    ingManyHint: $("ingManyHint"), ingErr: $("ingErr"), markLegend: $("markLegend")
  };

  var backendReady = !!MOCK || !!C.WEB_APP_URL;

  /* ---------- Texte ---------- */

  function t(key, vars) {
    var s = (T[state.lang] && T[state.lang][key]) || T.de[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(String(vars[k])); });
    }
    return s;
  }
  function catLabel(cat) { return cat.label[state.lang] || cat.label.de; }
  function catById(id) {
    for (var i = 0; i < C.CATEGORIES.length; i++) if (C.CATEGORIES[i].id === id) return C.CATEGORIES[i];
    return null;
  }
  function countOf(id) { return state.counts ? (state.counts[id] || 0) : null; }
  function ingById(id) {
    for (var i = 0; i < C.INGREDIENTS.length; i++) if (C.INGREDIENTS[i].id === id) return C.INGREDIENTS[i];
    return null;
  }
  function ingCountOf(id) { return state.ingCounts ? (state.ingCounts[id] || 0) : null; }
  /* Alle eingetragenen Kuchen (Summe über die Arten). */
  function totalCount() {
    if (!state.counts) return 0;
    return C.CATEGORIES.reduce(function (s, c) { return s + countOf(c.id); }, 0);
  }
  /* "Schon gut vertreten": Mindestzahl UND Anteil an allen Kuchen (siehe config.js). */
  function isMarked(n, min, share) {
    return n !== null && n >= min && n >= share * totalCount();
  }
  function catMarked(id) { return isMarked(countOf(id), C.MARK_MIN, C.MARK_SHARE); }
  function ingMarked(id) { return isMarked(ingCountOf(id), C.ING_MARK_MIN, C.ING_MARK_SHARE); }
  /* Vorschläge im Hinweis: die zwei am wenigsten vertretenen Arten, ohne die gewählte,
     ohne Torte (passt nicht zum Verkaufstipp) und ohne Sonstiges. Bei Gleichstand gilt die
     Listenreihenfolge, d. h. Handliches zuerst. */
  var NO_SUGGEST = { torte: true, sonstiges: true };
  function suggestCategories(exceptId) {
    return C.CATEGORIES
      .filter(function (c) { return c.id !== exceptId && !NO_SUGGEST[c.id]; })
      .map(function (c, i) { return { c: c, n: countOf(c.id), i: i }; })
      .sort(function (a, b) { return (a.n - b.n) || (a.i - b.i); })
      .slice(0, 2)
      .map(function (x) { return catLabel(x.c); });
  }
  function checkedIngredients() {
    return C.INGREDIENTS.map(function (g) { return g.id; }).filter(function (id) {
      var box = el.ingGrid.querySelector('input[value="' + id + '"]');
      return box && box.checked;
    });
  }
  /* "Muffins/Cupcakes" oder "Muffins/Cupcakes (Schokolade, Banane)" */
  function entryLabel(catId, ingIds) {
    var s = catLabel(catById(catId));
    if (ingIds && ingIds.length) s += " (" + ingIds.map(function (id) { return catLabel(ingById(id)); }).join(", ") + ")";
    return s;
  }

  function formatDate() {
    var p = C.EVENT.date.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    var fallback = ("0" + p[2]).slice(-2) + "." + ("0" + p[1]).slice(-2) + "." + p[0];
    try {
      var loc = LOCALES[state.lang];
      var fmt = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      // Kennt der Browser die Sprache nicht (z. B. Tigrinya), lieber Zahlen als eine fremde Sprache.
      if (fmt.resolvedOptions().locale.split("-")[0] !== loc.split("-")[0]) return fallback;
      return fmt.format(d);
    } catch (e) { return fallback; }
  }

  /* ---------- Sprache ---------- */

  function initialLang() {
    var q = null;
    try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
    if (q && LANGS.indexOf(q) >= 0) return q;
    try {
      var s = localStorage.getItem(LANG_KEY);
      if (s && LANGS.indexOf(s) >= 0) return s;
    } catch (e) {}
    return "de";
  }

  function buildLangButtons() {
    LANGS.forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang-btn";
      b.lang = l;
      b.textContent = T[l].lang_name;
      b.setAttribute("data-lang", l);
      b.addEventListener("click", function () { setLang(l, true); });
      el.langs.appendChild(b);
    });
  }

  function setLang(l, remember) {
    state.lang = l;
    document.documentElement.lang = l;
    if (remember) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
    Array.prototype.forEach.call(el.langs.querySelectorAll(".lang-btn"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === l ? "true" : "false");
    });
    renderTexts();
  }

  function renderTexts() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    var title = C.EVENT.title[state.lang] || C.EVENT.title.de;
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
    renderIngredients();
    renderManyHint();
    if (!el.success.hidden && el.success.dataset.cat) {
      el.successText.textContent = t("success_text", {
        cat: entryLabel(el.success.dataset.cat, el.success.dataset.ings ? el.success.dataset.ings.split(",") : []),
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
        renderIngredients();
        renderManyHint();
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
    C.CATEGORIES.forEach(function (c) { var n = countOf(c.id); total += n; if (n > max) max = n; });

    var anyMarked = false;
    el.bars.textContent = "";
    C.CATEGORIES.forEach(function (c) {
      var n = countOf(c.id);
      var li = document.createElement("li");
      var marked = catMarked(c.id);
      if (marked) { li.className = "many"; anyMarked = true; }
      var row = document.createElement("div");
      row.className = "bar-row";
      var lab = document.createElement("span");
      lab.className = "bar-label";
      lab.textContent = catLabel(c);
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
    var used = C.INGREDIENTS.filter(function (g) { return ingCountOf(g.id) > 0; });
    used.sort(function (a, b) { return ingCountOf(b.id) - ingCountOf(a.id); });   // stabil: sonst Listenreihenfolge
    used.forEach(function (g) {
      var n = ingCountOf(g.id);
      var li = document.createElement("li");
      var marked = ingMarked(g.id);
      if (marked) anyMarked = true;
      li.className = "chip" + (marked ? " many" : "");
      var lab = document.createElement("span");
      lab.textContent = catLabel(g);
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
    C.CATEGORIES.forEach(function (c) {
      var list = (d[c.id] || []).filter(function (s) { return typeof s === "string" && s; });
      if (!list.length) return;
      any = true;
      var g = document.createElement("div");
      g.className = "desc-group";
      var h = document.createElement("h3");
      h.textContent = catLabel(c);
      var ul = document.createElement("ul");
      list.forEach(function (s) {
        var li = document.createElement("li");
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
    C.CATEGORIES.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      var n = countOf(c.id);
      o.textContent = catLabel(c) + (n === null ? "" : " (" + n + ")");
      el.category.appendChild(o);
    });
    el.category.value = current;
  }

  /* Kästchen einmal anlegen, danach nur Texte, Zahlen und Sperren aktualisieren. */
  function renderIngredients() {
    if (!el.ingGrid.firstChild) {
      C.INGREDIENTS.forEach(function (g) {
        var lab = document.createElement("label");
        lab.className = "ing";
        var box = document.createElement("input");
        box.type = "checkbox";
        box.name = "ingredients";
        box.value = g.id;
        var txt = document.createElement("span");
        txt.className = "ing-label";
        lab.appendChild(box);
        lab.appendChild(txt);
        el.ingGrid.appendChild(lab);
      });
    }
    el.ingHint.textContent = t("ing_hint", { n: C.MAX_INGREDIENTS });
    var full = checkedIngredients().length >= C.MAX_INGREDIENTS;
    Array.prototype.forEach.call(el.ingGrid.querySelectorAll("input"), function (box) {
      var g = ingById(box.value);
      var n = ingCountOf(g.id);
      // Umbruch nach "/" erlauben (unsichtbares Leerzeichen), statt mitten im Wort zu trennen.
      box.nextSibling.textContent = catLabel(g).replace(/\//g, "/\u200B") + (n === null ? "" : " (" + n + ")");
      // Bei voller Auswahl die übrigen sperren; abwählen geht immer.
      box.disabled = full && !box.checked;
      box.parentNode.classList.toggle("off", box.disabled);
    });
  }

  function renderManyHint() {
    var cat = el.category.value ? catById(el.category.value) : null;
    el.catHint.textContent = (cat && catMarked(cat.id))
      ? t("hint_many", { cat: catLabel(cat), n: countOf(cat.id), list: suggestCategories(cat.id).join(t("list_and")) })
      : "";
    var many = checkedIngredients().filter(ingMarked);
    el.ingManyHint.textContent = many.length
      ? t("hint_many_ing", { list: many.map(function (id) { return catLabel(ingById(id)); }).join(", ") })
      : "";
  }

  function renderDescCount() {
    var left = C.MAX_DESC - el.description.value.length;
    el.descCount.textContent = t("chars_left", { n: Math.max(0, left) });
  }

  var FIELDS = {
    name: { input: "name", err: "nameErr" },
    category: { input: "category", err: "catErr" },
    description: { input: "description", err: "descErr" },
    ingredients: { input: "ingField", err: "ingErr" }
  };
  var LIMITS = { name: "MAX_NAME", description: "MAX_DESC", ingredients: "MAX_INGREDIENTS" };
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

  function values() {
    return {
      name: el.name.value.replace(/\s+/g, " ").trim(),
      category: el.category.value,
      description: el.description.value.replace(/\s+/g, " ").trim(),
      ingredients: checkedIngredients(),
      website: el.website.value
    };
  }

  function validate(v) {
    var e = {};
    if (!v.name) e.name = "err_name";
    else if (v.name.length > C.MAX_NAME) e.name = "err_name_long";
    if (!catById(v.category)) e.category = "err_cat";
    if (v.description.length > C.MAX_DESC) e.description = "err_desc_long";
    if (v.ingredients.length > C.MAX_INGREDIENTS) e.ingredients = "err_ing";
    return e;
  }

  var SERVER_ERRORS = {
    name_required: ["name", "err_name"],
    name_too_long: ["name", "err_name_long"],
    category_invalid: ["category", "err_cat"],
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
    el.success.dataset.cat = v.category;
    el.success.dataset.name = v.name;
    el.success.dataset.ings = v.ingredients.join(",");
    el.successText.textContent = t("success_text", { cat: entryLabel(v.category, v.ingredients), name: v.name });
    el.form.hidden = true;
    el.success.hidden = false;
    el.successH.focus();
    loadCounts();
  }

  function resetForm() {
    el.form.reset();
    state.errors = {};
    el.submitError.hidden = true;
    el.success.hidden = true;
    delete el.success.dataset.cat;
    delete el.success.dataset.name;
    delete el.success.dataset.ings;
    el.form.hidden = false;
    renderFieldErrors();
    renderIngredients();
    renderManyHint();
    renderDescCount();
    el.name.focus();
  }

  /* ---------- Start ---------- */

  el.name.maxLength = C.MAX_NAME;
  el.description.maxLength = C.MAX_DESC;
  buildLangButtons();
  setLang(initialLang(), false);

  el.form.addEventListener("submit", onSubmit);
  el.category.addEventListener("change", function () {
    if (state.errors.category) { delete state.errors.category; renderFieldErrors(); }
    renderManyHint();
  });
  el.ingGrid.addEventListener("change", function () {
    if (state.errors.ingredients) { delete state.errors.ingredients; renderFieldErrors(); }
    renderIngredients();
    renderManyHint();
  });
  el.name.addEventListener("input", function () {
    if (state.errors.name) { delete state.errors.name; renderFieldErrors(); }
  });
  el.description.addEventListener("input", function () {
    renderDescCount();
    if (state.errors.description) { delete state.errors.description; renderFieldErrors(); }
  });
  el.retry.addEventListener("click", loadCounts);
  el.again.addEventListener("click", resetForm);

  loadCounts();
})();
