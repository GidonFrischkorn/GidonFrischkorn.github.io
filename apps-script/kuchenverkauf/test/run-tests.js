#!/usr/bin/env node
/* Tests ohne Abhängigkeiten:  node apps-script/kuchenverkauf/test/run-tests.js
   1. Führt Code.gs mit nachgebauten Google-Diensten (Sheet, Lock, ContentService) aus.
   2. Prüft, dass config.js und Code.gs dieselben Kategorien und Längen haben.
   3. Prüft, dass alle Texte in allen fünf Sprachen vorhanden sind. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../../..");
const CODE = fs.readFileSync(path.join(ROOT, "apps-script/kuchenverkauf/Code.gs"), "utf8");
const PAGE = path.join(ROOT, "apps/babar-kuchen");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  -> " + detail : "")); }
}

/* ---------- Nachbau der Google-Dienste ---------- */
function makeEnv(opts) {
  opts = opts || {};
  const sheets = {};
  const lockLog = [];
  function makeSheet(name) {
    const rows = [];
    return {
      rows,
      getName: () => name,
      getLastRow: () => rows.length,
      appendRow: (r) => { if (opts.failAppend) throw new Error("append failed"); rows.push(r.slice()); },
      setFrozenRows: () => {},
      getRange: (r, c, nr, nc) => ({
        getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => {
          const out = [];
          for (let j = 0; j < nc; j++) {
            let v = row[c - 1 + j];
            // Sheets zeigt einen führenden Apostroph nicht als Teil des Werts.
            if (typeof v === "string" && v[0] === "'") v = v.slice(1);
            out.push(v === undefined ? "" : v);
          }
          return out;
        })
      })
    };
  }
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = makeSheet(n))
  };
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { lockLog.push("lock"); return opts.lockFails ? false : true; },
        releaseLock: () => lockLog.push("release")
      })
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (s) => ({ content: s, mime: null, setMimeType(m) { this.mime = m; return this; } })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: "Code.gs" });
  if (opts.showDescriptions) vm.runInContext("SHOW_DESCRIPTIONS = true;", ctx);
  if (opts.maxRows !== undefined) vm.runInContext("MAX_ROWS = " + opts.maxRows + ";", ctx);
  return {
    ctx, sheets, lockLog,
    get: () => { const o = ctx.doGet({}); return { raw: o.content, mime: o.mime, data: JSON.parse(o.content) }; },
    post: (body) => {
      const contents = typeof body === "string" ? body : JSON.stringify(body);
      const o = ctx.doPost({ postData: { contents, type: "text/plain" } });
      return JSON.parse(o.content);
    },
    rows: () => (sheets["Einträge"] ? sheets["Einträge"].rows : [])
  };
}

/* ---------- 1. Code.gs ---------- */
console.log("Code.gs");
{
  const env = makeEnv();
  const g = env.get();
  check("doGet ohne Daten: ok, alle Zähler 0", g.data.ok === true && Object.values(g.data.counts).every((n) => n === 0) && g.data.total === 0);
  check("doGet liefert JSON-MIME-Type", g.mime === "application/json");
  check("doGet legt Blatt mit Kopfzeile an", env.rows().length === 1 && env.rows()[0][1] === "Name des Kindes");
  check("doGet ohne Beschreibungen, solange SHOW_DESCRIPTIONS false", !("descriptions" in g.data));
}
{
  const env = makeEnv();
  const r = env.post({ name: "  Lena   Muster ", category: "schoko", description: "Brownies,\n vegan", website: "" });
  check("gültiger Eintrag: ok", r.ok === true, JSON.stringify(r));
  const row = env.rows()[1];
  // Date aus dem vm-Kontext: instanceof greift dort nicht, daher toString.
  check("Zeile: Zeitstempel ist ein Datum", Object.prototype.toString.call(row[0]) === "[object Date]");
  check("Zeile: Name bereinigt", row[1] === "Lena Muster", JSON.stringify(row[1]));
  check("Zeile: Kategorie als deutscher Text", row[2] === "Schokokuchen");
  check("Zeile: Beschreibung ohne Zeilenumbruch", row[3] === "Brownies, vegan", JSON.stringify(row[3]));
  check("Lock geholt und freigegeben", env.lockLog.join(",") === "lock,release");
  const g = env.get();
  check("doGet zählt den Eintrag", g.data.counts.schoko === 1 && g.data.total === 1);
  check("doGet-Antwort enthält keinen Namen", !g.raw.includes("Lena") && !g.raw.includes("Muster"));
  check("doGet-Antwort enthält keine Beschreibung", !g.raw.includes("Brownies"));
}
{
  const env = makeEnv();
  const r = env.post({ name: "Bot", category: "schoko", description: "", website: "http://spam" });
  check("Honeypot: Antwort ok, aber nichts gespeichert", r.ok === true && env.rows().length <= 1);
}
{
  const env = makeEnv();
  const cases = [
    [{ category: "schoko" }, "name_required"],
    [{ name: "   ", category: "schoko" }, "name_required"],
    [{ name: "x".repeat(61), category: "schoko" }, "name_too_long"],
    [{ name: "Ali", category: "xyz" }, "category_invalid"],
    [{ name: "Ali", category: "__proto__" }, "category_invalid"],
    [{ name: "Ali", category: "constructor" }, "category_invalid"],
    [{ name: "Ali", category: "hasOwnProperty" }, "category_invalid"],
    [{ name: "Ali", category: ["schoko"] }, "category_invalid"],
    [{ name: "Ali", category: "Schokokuchen" }, "category_invalid"],
    [{ name: "Ali", category: "obst", description: "y".repeat(201) }, "description_too_long"],
    [{ name: { a: 1 }, category: "obst" }, "name_required"],
    ["kein json", "bad_request"],
    ["[1,2]", "bad_request"],
    ["null", "bad_request"],
    ["", "bad_request"]
  ];
  cases.forEach(([body, code]) => {
    const r = env.post(body);
    check("abgelehnt (" + code + "): " + JSON.stringify(body).slice(0, 40), r.ok === false && r.error === code, JSON.stringify(r));
  });
  check("abgelehnte Einträge schreiben nichts", env.rows().length <= 1);
  const ok60 = env.post({ name: "x".repeat(60), category: "obst", description: "y".repeat(200) });
  check("Grenzwerte 60/200 Zeichen erlaubt", ok60.ok === true);
}
{
  const env = makeEnv();
  const bad = ["=HYPERLINK(\"http://x\",\"klick\")", "+41 79", "-1+1", "@SUM(A1)", "'=1", "\t=1+1", "\r=1"];
  bad.forEach((s) => env.post({ name: s, category: "sonstiges", description: s }));
  const rows = env.rows().slice(1);
  check("Formel-Injection: alle " + bad.length + " Werte gespeichert", rows.length === bad.length);
  check("Formel-Injection: Name beginnt nie mit = + - @", rows.every((r) => !/^[=+\-@]/.test(r[1])), JSON.stringify(rows.map((r) => r[1])));
  check("Formel-Injection: Beschreibung beginnt nie mit = + - @", rows.every((r) => !/^[=+\-@]/.test(r[3])));
  check("Formel-Injection: mit Apostroph geschützt", rows.every((r) => r[1][0] === "'" && r[3][0] === "'"));
  const harmless = makeEnv();
  harmless.post({ name: "Mia", category: "obst", description: "Apfelkuchen" });
  check("normale Werte bleiben unverändert", harmless.rows()[1][1] === "Mia" && harmless.rows()[1][3] === "Apfelkuchen");
}
{
  const env = makeEnv({ showDescriptions: true });
  env.post({ name: "Noah Beispiel", category: "ruehr", description: "Marmorkuchen, glutenfrei" });
  env.post({ name: "Emma Test", category: "ruehr", description: "" });
  const g = env.get();
  check("SHOW_DESCRIPTIONS=true: Beschreibung geliefert", g.data.descriptions && g.data.descriptions.ruehr.length === 1 && g.data.descriptions.ruehr[0] === "Marmorkuchen, glutenfrei");
  check("SHOW_DESCRIPTIONS=true: trotzdem keine Namen", !g.raw.includes("Noah") && !g.raw.includes("Emma") && !g.raw.includes("Beispiel"));
}
{
  // Organisation bearbeitet das Sheet von Hand
  const env = makeEnv();
  env.get();
  const rows = env.rows();
  rows.push([new Date(), "A", "Obstkuchen", ""]);
  rows.push([new Date(), "B", " Obstkuchen ", ""]);
  rows.push([new Date(), "C", "Irgendwas", ""]);
  rows.push([new Date(), "D", "", ""]);
  rows.push(["", "", "", ""]);
  const g = env.get();
  check("von Hand eingetragene Zeilen: bekannte gezählt, unbekannte/leere ignoriert", g.data.counts.obst === 2 && g.data.total === 2, JSON.stringify(g.data));
}
{
  const env = makeEnv({ maxRows: 2 });
  env.post({ name: "A", category: "obst" });
  env.post({ name: "B", category: "obst" });
  const r = env.post({ name: "C", category: "obst" });
  check("MAX_ROWS erreicht: 'full'", r.ok === false && r.error === "full" && env.rows().length === 3);
  check("Lock auch bei 'full' freigegeben", env.lockLog.filter((x) => x === "release").length === 3);
}
{
  const env = makeEnv({ lockFails: true });
  const r = env.post({ name: "A", category: "obst" });
  check("Lock nicht verfügbar: 'busy', nichts gespeichert", r.error === "busy" && env.rows().length <= 1);
}
{
  const env = makeEnv({ failAppend: true });
  let r;
  try { r = env.post({ name: "A", category: "obst" }); } catch (e) { r = { thrown: e.message }; }
  check("Fehler beim Schreiben: 'server', Lock freigegeben", r.error === "server" && env.lockLog.slice(-1)[0] === "release", JSON.stringify(r));
}

/* ---------- 2. config.js vs. Code.gs ---------- */
console.log("config.js <-> Code.gs");
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(PAGE, "config.js"), "utf8"), { window: win });
vm.runInNewContext(fs.readFileSync(path.join(PAGE, "i18n.js"), "utf8"), { window: win });
const C = win.KUCHEN_CONFIG, T = win.KUCHEN_I18N;
const gs = makeEnv().ctx;
const gsCats = vm.runInContext("CATEGORIES", gs);
const cfgIds = C.CATEGORIES.map((c) => c.id);
check("gleiche Kategorie-IDs in gleicher Reihenfolge", JSON.stringify(cfgIds) === JSON.stringify(Object.keys(gsCats)), cfgIds + " vs " + Object.keys(gsCats));
check("label.de == Text in Code.gs", C.CATEGORIES.every((c) => gsCats[c.id] === c.label.de),
  C.CATEGORIES.filter((c) => gsCats[c.id] !== c.label.de).map((c) => c.id).join(","));
check("IDs eindeutig", new Set(cfgIds).size === cfgIds.length);
check("MAX_NAME gleich", C.MAX_NAME === vm.runInContext("MAX_NAME", gs));
check("MAX_DESC gleich", C.MAX_DESC === vm.runInContext("MAX_DESC", gs));
check("SHOW_DESCRIPTIONS ist im Frontend aus", C.SHOW_DESCRIPTIONS === false);
check("SHOW_DESCRIPTIONS ist im Script aus", vm.runInContext("SHOW_DESCRIPTIONS", gs) === false);
check("Datum im Format JJJJ-MM-TT", /^\d{4}-\d{2}-\d{2}$/.test(C.EVENT.date));
check("WEB_APP_URL leer oder https://script.google.com/…/exec",
  C.WEB_APP_URL === "" || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.WEB_APP_URL), C.WEB_APP_URL);

/* ---------- 3. Übersetzungen ---------- */
console.log("Übersetzungen");
const LANGS = ["de", "en", "fr", "it", "ti"];
const keys = Object.keys(T.de);
check("fünf Sprachen vorhanden", LANGS.every((l) => T[l]));
LANGS.forEach((l) => {
  const missing = keys.filter((k) => typeof T[l][k] !== "string" || !T[l][k].trim());
  const extra = Object.keys(T[l]).filter((k) => !(k in T.de));
  check(l + ": alle " + keys.length + " Texte vorhanden", missing.length === 0 && extra.length === 0, "fehlt: " + missing + " / zu viel: " + extra);
  const ph = keys.filter((k) => {
    const want = (T.de[k].match(/\{\w+\}/g) || []).sort().join();
    const got = (T[l][k].match(/\{\w+\}/g) || []).sort().join();
    return want !== got;
  });
  check(l + ": Platzhalter {…} wie im Deutschen", ph.length === 0, ph.join(","));
  check(l + ": alle Kategorien übersetzt", C.CATEGORIES.every((c) => c.label[l] && c.label[l].trim()));
  check(l + ": Titel vorhanden", !!C.EVENT.title[l]);
});

/* ---------- 4. HTML verweist nur auf vorhandene Dateien, keine externen Quellen ---------- */
console.log("index.html");
const html = fs.readFileSync(path.join(PAGE, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith("data:"));
check("alle lokalen Verweise existieren", refs.every((r) => fs.existsSync(path.join(PAGE, r))), refs.join(","));
check("keine externen Verweise (http/https//)", refs.every((r) => !/^(https?:)?\/\//.test(r)));
check("noindex gesetzt", /<meta name="robots" content="noindex, nofollow">/.test(html));
const pageFiles = fs.readdirSync(PAGE);
check("kein Hinweis auf externe Fonts/CDNs in CSS/JS",
  pageFiles.filter((f) => /\.(js|css)$/.test(f)).every((f) => !/fonts\.googleapis|cdn\.|unpkg|jsdelivr|@import/.test(fs.readFileSync(path.join(PAGE, f), "utf8"))));

console.log("\n" + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
