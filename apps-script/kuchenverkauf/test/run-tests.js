#!/usr/bin/env node
/* Tests ohne Abhängigkeiten:  node apps-script/kuchenverkauf/test/run-tests.js
   1. Führt Code.gs mit nachgebauten Google-Diensten (Sheet, Lock, ContentService) aus.
   2. Prüft, dass config.js, i18n-de.js und Code.gs dieselben Arten, Allergene, Zutaten und
      Grenzen haben.
   3. Prüft, dass jede Sprache aus LANGS (config.js) eine vollständige Datei i18n-<Sprache>.js
      hat und in index.html eingebunden ist. */
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
        }),
        setValues: (vals) => vals.forEach((vr, i) => {
          if (!rows[r - 1 + i]) rows[r - 1 + i] = [];
          vr.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = v; });
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
// Gültiger Eintrag mit Abweichungen: P({ category: "muffins" })
const P = (extra) => Object.assign({ firstName: "Ali", lastName: "Test", category: "waehe" }, extra);
// Spalten im Blatt (0-basiert)
const COL = { time: 0, name: 1, cat: 2, desc: 3, ing: 4, alg: 5, other: 6 };
{
  const env = makeEnv();
  const g = env.get();
  check("doGet ohne Daten: ok, alle Zähler 0", g.data.ok === true && Object.values(g.data.counts).every((n) => n === 0) && g.data.total === 0);
  check("doGet liefert JSON-MIME-Type", g.mime === "application/json");
  check("doGet legt Blatt mit Kopfzeile an", env.rows().length === 1 && env.rows()[0][COL.name] === "Name des Kindes");
  check("Kopfzeile: 7 Spalten, Allergene in F, Gebäck in G",
    env.rows()[0].length === 7 && env.rows()[0][COL.alg] === "Allergene" && env.rows()[0][COL.other] === "Gebäck (bei Sonstiges)",
    JSON.stringify(env.rows()[0]));
  check("doGet ohne Beschreibungen, solange SHOW_DESCRIPTIONS false", !("descriptions" in g.data));
}
{
  const env = makeEnv();
  const r = env.post({ firstName: "  Lena ", lastName: " Muster   Beispiel ", category: "muffins", ingredients: ["schoko", "banane"],
    allergens: ["vegan", "glutenfrei"], description: "Brownies,\n vegan", website: "" });
  check("gültiger Eintrag: ok", r.ok === true, JSON.stringify(r));
  const row = env.rows()[1];
  // Date aus dem vm-Kontext: instanceof greift dort nicht, daher toString.
  check("Zeile: Zeitstempel ist ein Datum", Object.prototype.toString.call(row[COL.time]) === "[object Date]");
  check("Zeile: Vorname und Familienname bereinigt in einer Zelle", row[COL.name] === "Lena Muster Beispiel", JSON.stringify(row[COL.name]));
  check("Zeile: Kategorie als deutscher Text", row[COL.cat] === "Muffins/Cupcakes");
  check("Zeile: Beschreibung ohne Zeilenumbruch", row[COL.desc] === "Brownies, vegan", JSON.stringify(row[COL.desc]));
  check("Lock geholt und freigegeben", env.lockLog.join(",") === "lock,release");
  const g = env.get();
  check("Zeile: Hauptzutaten als deutscher Text in Spalte E", row[COL.ing] === "Schokolade, Banane", JSON.stringify(row[COL.ing]));
  check("Zeile: Allergene als deutscher Text in Spalte F, in Listenreihenfolge", row[COL.alg] === "Glutenfrei, Vegan", JSON.stringify(row[COL.alg]));
  check("Zeile: keine Bezeichnung ohne Sonstiges", row[COL.other] === "");
  check("doGet zählt den Eintrag", g.data.counts.muffins === 1 && g.data.total === 1);
  check("doGet zählt die Hauptzutaten", g.data.ingredients.schoko === 1 && g.data.ingredients.banane === 1 &&
    Object.values(g.data.ingredients).reduce((a, b) => a + b, 0) === 2, JSON.stringify(g.data.ingredients));
  check("doGet-Antwort enthält keinen Namen", !g.raw.includes("Lena") && !g.raw.includes("Muster"));
  check("doGet-Antwort enthält keine Beschreibung", !g.raw.includes("Brownies"));
  check("doGet-Antwort enthält keine Allergene", !/vegan|gluten|allerg/i.test(g.raw), g.raw);
}
{
  const env = makeEnv();
  const r = env.post({ firstName: "Bot", lastName: "Bot", category: "muffins", description: "", website: "http://spam" });
  check("Honeypot: Antwort ok, aber nichts gespeichert", r.ok === true && env.rows().length <= 1);
}
{
  const env = makeEnv();
  const cases = [
    [{ category: "muffins" }, "first_name_required"],
    [{ lastName: "Test", category: "muffins" }, "first_name_required"],
    [{ firstName: "   ", lastName: "Test", category: "muffins" }, "first_name_required"],
    [{ firstName: "Ali", category: "muffins" }, "last_name_required"],
    [{ firstName: "Ali", lastName: " \n ", category: "muffins" }, "last_name_required"],
    [{ name: "Ali Test", category: "muffins" }, "first_name_required"],   // Formular der ersten Version
    [P({ firstName: "x".repeat(61) }), "first_name_too_long"],
    [P({ lastName: "x".repeat(61) }), "last_name_too_long"],
    [P({ firstName: { a: 1 } }), "first_name_required"],
    [P({ lastName: ["Test"] }), "last_name_required"],
    [P({ category: "xyz" }), "category_invalid"],
    [P({ category: "__proto__" }), "category_invalid"],
    [P({ category: "constructor" }), "category_invalid"],
    [P({ category: "hasOwnProperty" }), "category_invalid"],
    [P({ category: ["muffins"] }), "category_invalid"],
    [P({ category: "Muffins/Cupcakes" }), "category_invalid"],
    [P({ category: "schoko" }), "category_invalid"],
    [P({ category: "sonstiges", otherName: "z".repeat(61) }), "other_too_long"],
    [P({ description: "y".repeat(201) }), "description_too_long"],
    [P({ ingredients: "schoko" }), "ingredients_invalid"],
    [P({ ingredients: ["xyz"] }), "ingredients_invalid"],
    [P({ ingredients: ["Schokolade"] }), "ingredients_invalid"],
    [P({ ingredients: ["schoko", "nuss", "apfel"] }), "ingredients_invalid"],
    [P({ ingredients: ["__proto__"] }), "ingredients_invalid"],
    [P({ ingredients: [1] }), "ingredients_invalid"],
    [P({ ingredients: { 0: "apfel" } }), "ingredients_invalid"],
    [P({ ingredients: ["vegan"] }), "ingredients_invalid"],
    [P({ allergens: "vegan" }), "allergens_invalid"],
    [P({ allergens: ["xyz"] }), "allergens_invalid"],
    [P({ allergens: ["Vegan"] }), "allergens_invalid"],
    [P({ allergens: ["__proto__"] }), "allergens_invalid"],
    [P({ allergens: ["constructor"] }), "allergens_invalid"],
    [P({ allergens: ["nuss"] }), "allergens_invalid"],
    [P({ allergens: [1] }), "allergens_invalid"],
    [P({ allergens: { 0: "vegan" } }), "allergens_invalid"],
    [P({ allergens: ["vegan", "vegan", "vegan", "vegan"] }), "allergens_invalid"],
    ["kein json", "bad_request"],
    ["[1,2]", "bad_request"],
    ["null", "bad_request"],
    ["", "bad_request"]
  ];
  cases.forEach(([body, code]) => {
    const r = env.post(body);
    check("abgelehnt (" + code + "): " + JSON.stringify(body).slice(0, 48), r.ok === false && r.error === code, JSON.stringify(r));
  });
  check("abgelehnte Einträge schreiben nichts", env.rows().length <= 1);
  const okMax = env.post(P({ firstName: "x".repeat(60), lastName: "w".repeat(60), category: "sonstiges",
    otherName: "z".repeat(60), description: "y".repeat(200) }));
  check("Grenzwerte 60/60/60/200 Zeichen erlaubt", okMax.ok === true, JSON.stringify(okMax));
  const okNone = makeEnv();
  check("ohne Hauptzutaten und Allergene erlaubt (Feld fehlt / null / leer)",
    okNone.post(P({ category: "blech" })).ok && okNone.post(P({ category: "blech", ingredients: null, allergens: null })).ok &&
    okNone.post(P({ category: "blech", ingredients: [], allergens: [] })).ok &&
    okNone.rows().slice(1).every((r) => r[COL.ing] === "" && r[COL.alg] === ""));
  const dup = makeEnv();
  dup.post(P({ category: "blech", ingredients: ["apfel", "apfel"], allergens: ["vegan", "vegan"] }));
  check("doppelte Hauptzutat und doppeltes Allergen nur einmal gespeichert",
    dup.rows()[1][COL.ing] === "Apfel" && dup.rows()[1][COL.alg] === "Vegan" && dup.get().data.ingredients.apfel === 1);
}
{
  // Bezeichnung bei Sonstiges
  const env = makeEnv();
  env.post(P({ category: "sonstiges", otherName: "  Baklava \n mit Pistazien " }));
  env.post(P({ category: "muffins", otherName: "Geheimnis" }));
  env.post(P({ category: "muffins", otherName: "q".repeat(500) }));
  env.post(P({ category: "sonstiges" }));
  env.post(P({ category: "sonstiges", otherName: { a: 1 } }));
  env.post(P({ category: "sonstiges", otherName: "=SUM(A1)" }));
  const rows = env.rows().slice(1);
  check("Sonstiges: Bezeichnung bereinigt in Spalte G", rows[0][COL.other] === "Baklava mit Pistazien" && rows[0][COL.cat] === "Sonstiges", JSON.stringify(rows[0]));
  check("andere Art: Bezeichnung wird übergangen, auch eine überlange", rows.length === 6 && rows[1][COL.other] === "" && rows[2][COL.other] === "");
  check("Sonstiges ohne oder mit ungültiger Bezeichnung erlaubt", rows[3][COL.other] === "" && rows[4][COL.other] === "");
  check("Sonstiges: Bezeichnung gegen Formeln geschützt", rows[5][COL.other] === "'=SUM(A1)", JSON.stringify(rows[5][COL.other]));
  const raw = env.get().raw;
  check("doGet-Antwort enthält keine Bezeichnung", !raw.includes("Baklava") && !raw.includes("Geheimnis") && !raw.includes("SUM"));
  check("doGet zählt Sonstiges", env.get().data.counts.sonstiges === 4);
}
{
  // Nüsse/Mandeln als Hauptzutat -> Allergen wird ergänzt
  const env = makeEnv();
  env.post(P({ ingredients: ["nuss"] }));
  env.post(P({ ingredients: ["schoko", "nuss"], allergens: ["vegan"] }));
  env.post(P({ ingredients: ["nuss"], allergens: ["nuesse"] }));
  env.post(P({ ingredients: ["schoko"], allergens: ["nuesse"] }));
  env.post(P({ ingredients: ["andere"] }));
  const rows = env.rows().slice(1);
  check("Nuss als Hauptzutat: Allergen ergänzt", rows[0][COL.alg] === "Enthält Nüsse/Mandeln", JSON.stringify(rows[0][COL.alg]));
  check("Nuss als Hauptzutat: ergänzt, übrige Allergene bleiben", rows[1][COL.alg] === "Enthält Nüsse/Mandeln, Vegan", JSON.stringify(rows[1][COL.alg]));
  check("Nuss doppelt angegeben: nur einmal", rows[2][COL.alg] === "Enthält Nüsse/Mandeln");
  check("Nuss-Allergen ohne Nuss als Hauptzutat bleibt", rows[3][COL.alg] === "Enthält Nüsse/Mandeln" && rows[3][COL.ing] === "Schokolade");
  check("Hauptzutat «Andere» gespeichert und gezählt, ohne Allergen", rows[4][COL.ing] === "Andere" && rows[4][COL.alg] === "" && env.get().data.ingredients.andere === 1);
}
{
  const env = makeEnv();
  const bad = ["=HYPERLINK(\"http://x\",\"klick\")", "+41 79", "-1+1", "@SUM(A1)", "'=1", "\t=1+1", "\r=1"];
  bad.forEach((s) => env.post({ firstName: s, lastName: s, category: "sonstiges", description: s, otherName: s }));
  const rows = env.rows().slice(1);
  check("Formel-Injection: alle " + bad.length + " Werte gespeichert", rows.length === bad.length);
  check("Formel-Injection: Name beginnt nie mit = + - @", rows.every((r) => !/^[=+\-@]/.test(r[COL.name])), JSON.stringify(rows.map((r) => r[COL.name])));
  check("Formel-Injection: Beschreibung beginnt nie mit = + - @", rows.every((r) => !/^[=+\-@]/.test(r[COL.desc])));
  check("Formel-Injection: Bezeichnung beginnt nie mit = + - @", rows.every((r) => !/^[=+\-@]/.test(r[COL.other])));
  check("Formel-Injection: mit Apostroph geschützt", rows.every((r) => r[COL.name][0] === "'" && r[COL.desc][0] === "'" && r[COL.other][0] === "'"));
  const harmless = makeEnv();
  harmless.post({ firstName: "Mia", lastName: "Meier", category: "waehe", description: "Apfelkuchen" });
  check("normale Werte bleiben unverändert", harmless.rows()[1][COL.name] === "Mia Meier" && harmless.rows()[1][COL.desc] === "Apfelkuchen");
  harmless.post({ firstName: "Mia", lastName: "=1+1", category: "waehe" });
  check("Formelzeichen nur im Familiennamen: Zelle beginnt mit dem Vornamen", harmless.rows()[2][COL.name] === "Mia =1+1");
}
{
  const env = makeEnv({ showDescriptions: true });
  env.post({ firstName: "Noah", lastName: "Beispiel", category: "ruehr", description: "Marmorkuchen, glutenfrei" });
  env.post({ firstName: "Emma", lastName: "Test", category: "ruehr", description: "" });
  env.post({ firstName: "Zoe", lastName: "Probe", category: "sonstiges", otherName: "Baklava", allergens: ["vegan"] });
  const g = env.get();
  check("SHOW_DESCRIPTIONS=true: Beschreibung geliefert", g.data.descriptions && g.data.descriptions.ruehr.length === 1 && g.data.descriptions.ruehr[0] === "Marmorkuchen, glutenfrei");
  check("SHOW_DESCRIPTIONS=true: trotzdem keine Namen, Bezeichnungen oder Allergene",
    !/Noah|Emma|Beispiel|Zoe|Probe|Baklava|[Vv]egan/.test(g.raw), g.raw);
}
{
  // Organisation bearbeitet das Sheet von Hand
  const env = makeEnv();
  env.get();
  const rows = env.rows();
  rows.push([new Date(), "A", "Wähe/Tarte", "", "Apfel; Zimt/Gewürze"]);
  rows.push([new Date(), "B", " Wähe/Tarte ", "", "apfel, Quatsch"]);
  rows.push([new Date(), "E", "Wähe/Tarte", ""]);
  rows.push([new Date(), "F", "Wähe/Tarte", "", " Apfel ,Apfel"]);
  rows.push([new Date(), "C", "Irgendwas", "", "Apfel"]);
  rows.push([new Date(), "D", "", ""]);
  rows.push(["", "", "", ""]);
  const g = env.get();
  check("von Hand eingetragene Zeilen: bekannte gezählt, unbekannte/leere ignoriert", g.data.counts.waehe === 4 && g.data.total === 4, JSON.stringify(g.data));
  check("von Hand eingetragene Zutaten: ; und , als Trenner, Unbekanntes und Doppeltes ignoriert",
    g.data.ingredients.apfel === 3 && g.data.ingredients.gewuerz === 1 &&
    Object.values(g.data.ingredients).reduce((a, b) => a + b, 0) === 4, JSON.stringify(g.data.ingredients));
}
{
  const env = makeEnv({ maxRows: 2 });
  env.post(P({ firstName: "A" }));
  env.post(P({ firstName: "B" }));
  const r = env.post(P({ firstName: "C" }));
  check("MAX_ROWS erreicht: 'full'", r.ok === false && r.error === "full" && env.rows().length === 3);
  check("Lock auch bei 'full' freigegeben", env.lockLog.filter((x) => x === "release").length === 3);
}
{
  const env = makeEnv({ lockFails: true });
  const r = env.post(P());
  check("Lock nicht verfügbar: 'busy', nichts gespeichert", r.error === "busy" && env.rows().length <= 1);
}
{
  const env = makeEnv({ failAppend: true });
  let r;
  try { r = env.post(P()); } catch (e) { r = { thrown: e.message }; }
  check("Fehler beim Schreiben: 'server', Lock freigegeben", r.error === "server" && env.lockLog.slice(-1)[0] === "release", JSON.stringify(r));
}
{
  // Blatt aus der ersten Version: Kopfzeile mit 4 Spalten und schon ein Eintrag.
  const env = makeEnv();
  env.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet("Einträge");
  const rows = env.rows();
  rows.push(["Zeitstempel", "Name des Kindes", "Art (umbenannt)", "Beschreibung"]);
  rows.push([new Date(), "Alt", "Muffins/Cupcakes", "alt"]);
  const g = env.get();
  check("altes Blatt (4 Spalten): E, F und G ergänzt, umbenannte Überschrift bleibt",
    rows[0][4] === "Hauptzutaten" && rows[0][5] === "Allergene" && rows[0][6] === "Gebäck (bei Sonstiges)" && rows[0][2] === "Art (umbenannt)", JSON.stringify(rows[0]));
  check("altes Blatt: bestehende Zeile unverändert und gezählt",
    rows[1].length === 4 && rows[1][1] === "Alt" && g.data.counts.muffins === 1 && g.data.total === 1);
  env.post(P({ category: "muffins", ingredients: ["zitrone"] }));
  check("altes Blatt: neuer Eintrag mit Zutat in Spalte E", rows[2][COL.ing] === "Zitrone" && env.get().data.ingredients.zitrone === 1);
}
{
  // Blatt von heute: Kopfzeile mit 5 Spalten und ein Eintrag mit Zutaten.
  const env = makeEnv();
  env.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet("Einträge");
  const rows = env.rows();
  rows.push(["Zeitstempel", "Name des Kindes", "Kategorie", "Beschreibung", "Hauptzutaten"]);
  rows.push([new Date(), "TEST", "Sonstiges", "", "Schokolade"]);
  const g = env.get();
  check("Blatt mit 5 Spalten: F und G ergänzt, A bis E unverändert",
    rows[0].length === 7 && rows[0][5] === "Allergene" && rows[0][6] === "Gebäck (bei Sonstiges)" &&
    rows[0].slice(0, 5).join("|") === "Zeitstempel|Name des Kindes|Kategorie|Beschreibung|Hauptzutaten", JSON.stringify(rows[0]));
  check("Blatt mit 5 Spalten: bestehende Zeile weiter gezählt", g.data.counts.sonstiges === 1 && g.data.ingredients.schoko === 1);
  env.post(P({ category: "sonstiges", otherName: "Baklava", allergens: ["glutenfrei"] }));
  check("Blatt mit 5 Spalten: neuer Eintrag füllt F und G", rows[2][COL.alg] === "Glutenfrei" && rows[2][COL.other] === "Baklava");
}
{
  const env = makeEnv();
  env.post({ firstName: "Lena", lastName: "Muster", category: "muffins", ingredients: ["schoko"], description: "geheim" });
  const raw = env.get().raw;
  check("doGet mit Zutaten: weiterhin keine Namen/Beschreibungen", !raw.includes("Lena") && !raw.includes("Muster") && !raw.includes("geheim"));
}

/* ---------- 2. config.js und i18n-de.js vs. Code.gs ---------- */
console.log("config.js / i18n-de.js <-> Code.gs");
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(PAGE, "config.js"), "utf8"), { window: win });
const C = win.KUCHEN_CONFIG;
const langFile = (l) => "i18n-" + l + ".js";
check("LANGS: Liste von Kürzeln, Deutsch zuerst, keine Doppelten",
  Array.isArray(C.LANGS) && C.LANGS[0] === "de" && new Set(C.LANGS).size === C.LANGS.length &&
  C.LANGS.every((l) => /^[a-z]{2,3}$/.test(l)), JSON.stringify(C.LANGS));
const missingFiles = C.LANGS.filter((l) => !fs.existsSync(path.join(PAGE, langFile(l))));
check("zu jeder Sprache in LANGS gibt es eine Datei", missingFiles.length === 0, missingFiles.join(","));
C.LANGS.filter((l) => !missingFiles.includes(l)).forEach((l) => {
  vm.runInNewContext(fs.readFileSync(path.join(PAGE, langFile(l)), "utf8"), { window: win }, { filename: langFile(l) });
});
const T = win.KUCHEN_I18N || {};
const gs = makeEnv().ctx;
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
[["CATEGORIES", "cat", "Arten"], ["ALLERGENS", "alg", "Allergene"], ["INGREDIENTS", "ing", "Zutaten"]].forEach(([name, kind, what]) => {
  const table = vm.runInContext(name, gs);
  const ids = C[name];
  check(what + ": gleiche ids in gleicher Reihenfolge wie in Code.gs", sameList(ids, Object.keys(table)), ids + " vs " + Object.keys(table));
  check(what + ": ids eindeutig", new Set(ids).size === ids.length);
  check(what + ": deutscher Text (i18n-de.js) == Text in Code.gs", ids.every((id) => table[id] === T.de[kind][id]),
    ids.filter((id) => table[id] !== T.de[kind][id]).join(","));
});
check("Zutaten- und Allergen-Texte ohne Komma/Semikolon (Trenner im Sheet)",
  C.INGREDIENTS.every((id) => !/[,;]/.test(T.de.ing[id])) && C.ALLERGENS.every((id) => !/[,;]/.test(T.de.alg[id])));
check("OTHER_CATEGORY: bekannte Art, gleich wie in Code.gs",
  C.CATEGORIES.includes(C.OTHER_CATEGORY) && C.OTHER_CATEGORY === vm.runInContext("OTHER_CATEGORY", gs));
check("OTHER_INGREDIENT: bekannte Hauptzutat", C.INGREDIENTS.includes(C.OTHER_INGREDIENT));
check("NUT_LINK: bekannte Zutat und bekanntes Allergen, gleich wie in Code.gs",
  C.INGREDIENTS.includes(C.NUT_LINK.ingredient) && C.ALLERGENS.includes(C.NUT_LINK.allergen) &&
  C.NUT_LINK.ingredient === vm.runInContext("NUT_INGREDIENT", gs) && C.NUT_LINK.allergen === vm.runInContext("NUT_ALLERGEN", gs));
check("MAX_INGREDIENTS gleich", C.MAX_INGREDIENTS === vm.runInContext("MAX_INGREDIENTS", gs));
check("MAX_NAME gleich", C.MAX_NAME === vm.runInContext("MAX_NAME", gs));
check("MAX_OTHER gleich", C.MAX_OTHER === vm.runInContext("MAX_OTHER", gs));
check("MAX_DESC gleich", C.MAX_DESC === vm.runInContext("MAX_DESC", gs));
check("SHOW_DESCRIPTIONS ist im Frontend aus", C.SHOW_DESCRIPTIONS === false);
check("SHOW_DESCRIPTIONS ist im Script aus", vm.runInContext("SHOW_DESCRIPTIONS", gs) === false);
check("Datum im Format JJJJ-MM-TT", /^\d{4}-\d{2}-\d{2}$/.test(C.EVENT.date));
check("WEB_APP_URL leer oder https://script.google.com/…/exec",
  C.WEB_APP_URL === "" || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.WEB_APP_URL), C.WEB_APP_URL);

/* ---------- 3. Übersetzungen ---------- */
console.log("Übersetzungen (" + C.LANGS.join(", ") + ")");
const keys = Object.keys(T.de.ui);
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
// Jede Sprache muss Text in ihrer eigenen Schrift enthalten. Fängt vertauschte oder
// unübersetzte Dateien ab. Sprachen mit lateinischer Schrift stehen nicht in der Liste.
const SCRIPTS = {
  am: /\p{Script=Ethiopic}/u, ti: /\p{Script=Ethiopic}/u, ar: /\p{Script=Arabic}/u, fa: /\p{Script=Arabic}/u,
  zh: /\p{Script=Han}/u, el: /\p{Script=Greek}/u, mn: /\p{Script=Cyrillic}/u, th: /\p{Script=Thai}/u
};
C.LANGS.forEach((l) => {
  const L = T[l];
  if (!L) { check(l + ": Datei geladen", false, langFile(l) + " setzt KUCHEN_I18N." + l + " nicht"); return; }
  check(l + ": meta (Name, Schreibrichtung, Locale)",
    L.meta && typeof L.meta.name === "string" && L.meta.name.trim() !== "" && (L.meta.dir === "ltr" || L.meta.dir === "rtl") &&
    typeof L.meta.locale === "string" && L.meta.locale.toLowerCase().split("-")[0] === l, JSON.stringify(L.meta));
  let localeOk = true;
  try { new Intl.DateTimeFormat(L.meta.locale); } catch (e) { localeOk = false; }
  check(l + ": Locale ist ein gültiges Sprachkennzeichen", localeOk, L.meta && L.meta.locale);
  check(l + ": Titel vorhanden", typeof L.title === "string" && L.title.trim() !== "");
  const ui = L.ui || {};
  const missing = keys.filter((k) => typeof ui[k] !== "string" || !ui[k].trim());
  const extra = Object.keys(ui).filter((k) => !(k in T.de.ui));
  check(l + ": alle " + keys.length + " Texte vorhanden, keine überzähligen", missing.length === 0 && extra.length === 0, "fehlt: " + missing + " / zu viel: " + extra);
  const ph = keys.filter((k) => placeholders(T.de.ui[k]) !== placeholders(ui[k] || ""));
  check(l + ": Platzhalter {…} wie im Deutschen", ph.length === 0, ph.join(","));
  [["CATEGORIES", "cat", "Arten"], ["ALLERGENS", "alg", "Allergene"], ["INGREDIENTS", "ing", "Zutaten"]].forEach(([name, kind, what]) => {
    const have = L[kind] || {};
    const bad = C[name].filter((id) => typeof have[id] !== "string" || !have[id].trim());
    const more = Object.keys(have).filter((id) => !C[name].includes(id));
    check(l + ": alle " + what + " übersetzt, keine überzähligen", bad.length === 0 && more.length === 0, "fehlt: " + bad + " / zu viel: " + more);
  });
  if (l !== "de") {
    const all = [];
    keys.forEach((k) => all.push(["ui." + k, T.de.ui[k], ui[k]]));
    ["cat", "alg", "ing"].forEach((kind) => Object.keys(T.de[kind]).forEach((id) => all.push([kind + "." + id, T.de[kind][id], (L[kind] || {})[id]])));
    // Nur ganze Oberflächentexte: Ein-Wort-Namen dürfen gleich lauten (Albanisch «banane», «Vegan»).
    const same = all.filter(([k, de, tr]) => k.startsWith("ui.") && de === tr && /\p{L}{4,}/u.test(de)).map((x) => x[0]);
    check(l + ": kein Oberflächentext steht noch auf Deutsch", same.length === 0, same.join(","));
    if (SCRIPTS[l]) {
      const wrong = all.filter(([k, de, tr]) => typeof tr === "string" && /\p{L}{4,}/u.test(de) && !SCRIPTS[l].test(tr)).map((x) => x[0]);
      check(l + ": Texte in der erwarteten Schrift", wrong.length === 0, wrong.join(","));
      check(l + ": Name der Sprache in der eigenen Schrift", SCRIPTS[l].test(L.meta.name), L.meta.name);
    }
  }
});

/* ---------- 4. HTML verweist nur auf vorhandene Dateien, keine externen Quellen ---------- */
console.log("index.html");
const html = fs.readFileSync(path.join(PAGE, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith("data:"));
check("alle lokalen Verweise existieren", refs.every((r) => fs.existsSync(path.join(PAGE, r))), refs.join(","));
check("keine externen Verweise (http/https//)", refs.every((r) => !/^(https?:)?\/\//.test(r)));
check("Verweise ohne Unterordner (die Prüfung in publish.yml übergeht Pfade mit /)", refs.every((r) => !r.includes("/")), refs.join(","));
check("noindex gesetzt", /<meta name="robots" content="noindex, nofollow">/.test(html));
const pageFiles = fs.readdirSync(PAGE);
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const langScripts = scripts.filter((f) => /^i18n-/.test(f));
check("index.html bindet genau die Sprachdateien aus LANGS ein, in dieser Reihenfolge", sameList(langScripts, C.LANGS.map(langFile)), langScripts.join(","));
check("im Ordner liegen genau die Sprachdateien aus LANGS", sameList(pageFiles.filter((f) => /^i18n/.test(f)).sort(), C.LANGS.map(langFile).sort()),
  pageFiles.filter((f) => /^i18n/.test(f)).join(","));
check("Reihenfolge der Scripts: theme.js, config.js, Sprachdateien, mock.js, ics.js, app.js",
  sameList(scripts, ["theme.js", "config.js"].concat(C.LANGS.map(langFile), ["mock.js", "ics.js", "app.js"])), scripts.join(","));
check("kein Hinweis auf externe Fonts/CDNs in CSS/JS",
  pageFiles.filter((f) => /\.(js|css)$/.test(f)).every((f) => !/fonts\.googleapis|cdn\.|unpkg|jsdelivr|@import/.test(fs.readFileSync(path.join(PAGE, f), "utf8"))));
const appJs = fs.readFileSync(path.join(PAGE, "app.js"), "utf8");
const appCss = fs.readFileSync(path.join(PAGE, "app.css"), "utf8");
check("Datum: Kalender und Ziffern fest vorgegeben (sonst Jahr 1405 auf Persisch, 2569 auf Thai)",
  /calendar:\s*"gregory"/.test(appJs) && /numberingSystem:\s*"latn"/.test(appJs));
// Dieselbe Formatierung wie in app.js, für jede Sprache der Seite: Das Jahr muss 2026 lauten.
const [yy, mm, dd] = C.EVENT.date.split("-").map(Number);
const wrongYear = C.LANGS.filter((l) => T[l] && T[l].meta).filter((l) => {
  const s = new Intl.DateTimeFormat(T[l].meta.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric",
    calendar: "gregory", numberingSystem: "latn" }).format(new Date(yy, mm - 1, dd));
  return !s.includes(String(yy)) || !s.includes(String(dd));
});
check("Datum: in jeder Sprache mit Jahr " + yy + " und Tag " + dd + " in lateinischen Ziffern", wrongYear.length === 0, wrongYear.join(","));
check("CSS ohne left/right (Seite läuft auch von rechts nach links)",
  !/(margin|padding|border)-(left|right)|text-align:\s*(left|right)|[^-\w](left|right):/.test(appCss));
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const wanted = [...appJs.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
check("jedes Element, das app.js per id holt, steht in index.html", wanted.every((id) => ids.has(id)), wanted.filter((id) => !ids.has(id)).join(","));
const i18nRefs = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
const tRefs = [...appJs.matchAll(/\bt\("([a-z_]+)"/g)].map((m) => m[1]);
const errRefs = [...appJs.matchAll(/"(err_[a-z_]+)"/g)].map((m) => m[1]);
const usedKeys = new Set(i18nRefs.concat(tRefs, errRefs));
check("jeder Text, den Seite und Script verwenden, steht in i18n-de.js", [...usedKeys].every((k) => k in T.de.ui), [...usedKeys].filter((k) => !(k in T.de.ui)).join(","));
check("i18n-de.js enthält keinen unbenutzten Text", keys.every((k) => usedKeys.has(k)), keys.filter((k) => !usedKeys.has(k)).join(","));

/* ---------- 5. Kalender-Erinnerung (ics.js) ---------- */
console.log("ics.js");
{
  const w = {};
  vm.runInNewContext(fs.readFileSync(path.join(PAGE, "ics.js"), "utf8"), { window: w });
  const ICS = w.KuchenIcs;
  const octets = (s) => Buffer.byteLength(s, "utf8");
  const unfold = (s) => s.replace(/\r\n /g, "");
  const field = (ics, name) => { const m = unfold(ics).match(new RegExp("^" + name + "(?:;[^:]*)?:(.*)$", "m")); return m ? m[1] : null; };
  // ganze Zeile aus dem Termin (die Zeitzonen-Beschreibung davor hat eigene DTSTART-Zeilen)
  const line = (ics, name) => { const ev = unfold(ics); const m = ev.slice(ev.indexOf("BEGIN:VEVENT")).match(new RegExp("^" + name + "[;:].*$", "m")); return m ? m[0] : null; };
  const unesc = (s) => s.replace(/\\(.)/g, (m, c) => (c === "n" ? "\n" : c));   // in einem Durchgang, sonst wird ein maskierter Backslash doppelt gelesen
  const R = C.REMINDER;
  check("REMINDER in config.js: volle Stunde, Dauer und Vorlauf des Alarms in ganzen Stunden",
    R && Number.isInteger(R.hour) && R.hour >= 0 && R.hour <= 23 && Number.isInteger(R.durationHours) && R.durationHours >= 1 &&
    Number.isInteger(R.alarmHoursBefore) && R.alarmHoursBefore >= 0, JSON.stringify(R));
  const sample = { uid: "test-1@babar-kuchen", stamp: new Date(Date.UTC(2026, 10, 12, 9, 5, 7)),
    date: C.EVENT.date, hour: R.hour, durationHours: R.durationHours, alarmHoursBefore: R.alarmHoursBefore,
    summary: "Kuchenverkauf Chinderhuus BABAR",
    description: "Du hast eingetragen: Sonstiges: Baklava (Nüsse/Mandeln, Andere); a\\b.\nZweite Zeile, mit Komma." };
  const ics = ICS.build(sample);
  const lines = ics.split("\r\n");
  check("Datei: beginnt und endet richtig, Zeilenenden CRLF", lines[0] === "BEGIN:VCALENDAR" && lines[lines.length - 2] === "END:VCALENDAR" && lines[lines.length - 1] === "" && !/[^\r]\n/.test(ics));
  check("Datei: genau ein Eintrag mit einem Alarm", (ics.match(/BEGIN:VEVENT/g) || []).length === 1 && (ics.match(/BEGIN:VALARM/g) || []).length === 1 && /ACTION:DISPLAY/.test(ics));
  check("Termin am Verkaufstag von 8 bis 9 Uhr, in Zürcher Zeit",
    line(ics, "DTSTART") === "DTSTART;TZID=Europe/Zurich:20261124T080000" && line(ics, "DTEND") === "DTEND;TZID=Europe/Zurich:20261124T090000",
    line(ics, "DTSTART") + " / " + line(ics, "DTEND"));
  check("Alarm 24 Stunden vor dem Beginn", line(ics, "TRIGGER") === "TRIGGER:-PT24H", line(ics, "TRIGGER"));
  {
    // Die Zeitzone, auf die sich der Termin bezieht, steht in der Datei, vor dem Termin, mit beiden Regeln.
    const tz = (unfold(ics).match(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE/) || [""])[0];
    check("Zeitzone Europe/Zurich ist in der Datei beschrieben (Winter +0100, Sommer +0200)",
      (ics.match(/BEGIN:VTIMEZONE/g) || []).length === 1 && /^TZID:Europe\/Zurich$/m.test(tz) &&
      /BEGIN:STANDARD[\s\S]*TZOFFSETTO:\+0100[\s\S]*END:STANDARD/.test(tz) && /BEGIN:DAYLIGHT[\s\S]*TZOFFSETTO:\+0200[\s\S]*END:DAYLIGHT/.test(tz) &&
      ics.indexOf("END:VTIMEZONE") < ics.indexOf("BEGIN:VEVENT"));
    // Der Termin hängt nicht von der Zeitzone des Geräts ab, und eine Dauer über Mitternacht rollt in den nächsten Tag.
    const late = ICS.build(Object.assign({}, sample, { date: "2026-12-31", hour: 23, durationHours: 2 }));
    check("Ende nach Mitternacht fällt auf den nächsten Tag", line(late, "DTEND") === "DTEND;TZID=Europe/Zurich:20270101T010000", line(late, "DTEND"));
  }
  check("Erstellungs-Stempel in Weltzeit", field(ics, "DTSTAMP") === "20261112T090507Z", field(ics, "DTSTAMP"));
  check("Titel und Notiz kommen unverändert zurück (Komma, Strichpunkt, Backslash, Zeilenumbruch maskiert)",
    unesc(field(ics, "SUMMARY")) === sample.summary && unesc(field(ics, "DESCRIPTION")) === sample.description, field(ics, "DESCRIPTION"));
  check("keine Zeile über 75 Bytes", lines.every((l) => octets(l) <= 75), String(Math.max(...lines.map(octets))));
  check("Adresse für den Download enthält die Datei", decodeURIComponent(ICS.dataUrl(ics).replace("data:text/calendar;charset=utf-8,", "")) === ics);
  // Jede Sprache: Titel und Notiz der Erinnerung ergeben eine gültige Datei, auch mit mehrbyteigen Zeichen.
  const bad = C.LANGS.filter((l) => T[l] && T[l].ui && T[l].ui.reminder_text).filter((l) => {
    const sub = (s, v) => Object.keys(v).reduce((a, k) => a.split("{" + k + "}").join(v[k]), s);
    const summary = T[l].title + " " + C.EVENT.org;
    const description = sub(T[l].ui.reminder_text, { cat: T[l].cat.sonstiges + ": Baklava (" + T[l].ing.nuss + T[l].ui.list_sep + T[l].ing.andere + ")", date: "24.11.2026" });
    const out = ICS.build(Object.assign({}, sample, { summary, description }));
    const ok = out.split("\r\n").every((x) => octets(x) <= 75) && unesc(field(out, "SUMMARY")) === summary && unesc(field(out, "DESCRIPTION")) === description &&
      !out.includes("�") && Buffer.from(out, "utf8").toString("utf8") === out;
    return !ok;
  });
  check("Erinnerung in jeder Sprache: gültige Datei, Text kommt unverändert zurück", bad.length === 0, bad.join(","));
  check("app.js entfernt die unsichtbaren Richtungszeichen aus dem Kalendertext", /function plain\(s\)/.test(appJs) && /description: plain\(/.test(appJs));
  check("Titel des Termins: Titel der Seite und Name der Kita, ohne Zusatz", /var event = \(T\[state\.lang\]\.title \|\| T\.de\.title\) \+ " " \+ C\.EVENT\.org;/.test(appJs) && /summary: event,/.test(appJs));
}

/* ---------- 6. Anmeldeschluss ---------- */
console.log("Anmeldeschluss");
{
  const E = C.SIGNUP_END;
  check("SIGNUP_END in config.js: Datum JJJJ-MM-TT, Uhrzeit HH:MM, Abstand zur Weltzeit ±HH:MM",
    E && /^\d{4}-\d{2}-\d{2}$/.test(E.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(E.time) && /^[+-]\d{2}:\d{2}$/.test(E.utcOffset), JSON.stringify(E));
  const end = Date.parse(E.date + "T" + E.time + ":00" + E.utcOffset) + 60000;   // wie signupEnd() in app.js
  // Der angegebene Abstand muss an diesem Tag wirklich der von Zürich sein (Winter- oder Sommerzeit).
  const zh = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(end - 60000)).reduce((a, x) => (a[x.type] = x.value, a), {});
  check("Anmeldeschluss in Zürcher Zeit wie angegeben (" + E.date + " " + E.time + ")",
    zh.year + "-" + zh.month + "-" + zh.day === E.date && zh.hour + ":" + zh.minute === E.time, JSON.stringify(zh));
  check("Anmeldeschluss 22.11.2026 23:59 (Zürich) = 22:59 Weltzeit, Formular zu ab 23:00 Weltzeit",
    new Date(end).toISOString() === "2026-11-22T23:00:00.000Z", new Date(end).toISOString());
  // Wer sich bis zum Schluss einträgt, bekommt den Alarm der Erinnerung noch: Alarm = Verkaufstag REMINDER.hour Uhr minus Vorlauf.
  const [y, m, d] = C.EVENT.date.split("-").map(Number);
  const startUtc = Date.UTC(y, m - 1, d, C.REMINDER.hour) - 60 * 60000;   // Winterzeit: Zürich = Weltzeit + 1 h (Test oben prüft den Tag)
  const alarm = startUtc - C.REMINDER.alarmHoursBefore * 3600000;
  check("Anmeldeschluss liegt vor dem Alarm der Erinnerung", end <= alarm, new Date(end).toISOString() + " / " + new Date(alarm).toISOString());
  check("app.js: Formular zu nach dem Schluss, auch beim Absenden und bei offener Seite",
    /el\.form\.hidden = !backendReady \|\| closed \|\| !el\.success\.hidden/.test(appJs) && /if \(isClosed\(\)\) \{ renderTexts\(\); return; \}/.test(appJs) && /setTimeout\(renderTexts, left \+ 1000\)/.test(appJs));
  check("index.html hat Platz für Schluss-Hinweis und Frist", /id="closedNote"[^>]*data-i18n="closed"/.test(html) && /id="deadline"/.test(html));
  const noTime = C.LANGS.filter((l) => !(T[l].ui.deadline.includes("{date}") && T[l].ui.deadline.includes("{time}")));
  check("Frist nennt in jeder Sprache Datum und Uhrzeit", noTime.length === 0, noTime.join(","));
}

console.log("\n" + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
