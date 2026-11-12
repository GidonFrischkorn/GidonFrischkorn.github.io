/**
 * Kuchenverkauf Chinderhuus BABAR – Backend (Google Apps Script, an das Sheet gebunden).
 *
 * Einrichtung: siehe SETUP.md im selben Ordner.
 *
 *   doPost  hängt einen Eintrag als neue Zeile an:
 *           Zeitstempel | Name des Kindes | Kategorie | Beschreibung | Hauptzutaten |
 *           Allergene | Gebäck (bei Sonstiges)
 *           Der Name ist "Vorname Familienname" in einer Zelle.
 *   doGet   gibt NUR die Anzahl der Einträge pro Kategorie und pro Hauptzutat
 *           zurück – nie Namen, nie Allergene, nie die Bezeichnung bei Sonstiges.
 *           Beschreibungen (ohne Namen) nur, wenn SHOW_DESCRIPTIONS = true.
 *
 * Nach jeder Änderung an diesem Code: "Bereitstellen" -> "Bereitstellungen verwalten"
 * -> Stift -> Version "Neue Version" -> "Bereitstellen". Dann bleibt die URL gleich.
 */

/* ---------------- Einstellungen ---------------- */

/** Beschreibungen (ohne Namen) an die Seite ausliefern? Zusätzlich muss in
 *  config.js der Seite SHOW_DESCRIPTIONS: true stehen. */
var SHOW_DESCRIPTIONS = false;

/** Kuchen-Arten: id (wie in config.js) -> Text, der ins Sheet geschrieben wird.
 *  Gleiche ids und gleiche Reihenfolge wie CATEGORIES in config.js; der Text ist der
 *  deutsche Name aus i18n-de.js (Abschnitt cat). */
var CATEGORIES = {
  muffins: 'Muffins/Cupcakes',
  blech: 'Blechkuchen/Schnitten',
  ruehr: 'Rührkuchen/Cake',
  guetzli: 'Guetzli/Weihnachtsgebäck',
  hefe: 'Hefegebäck (Zopf, Schnecken)',
  waehe: 'Wähe/Tarte',
  kaese: 'Käsekuchen',
  torte: 'Torte',
  sonstiges: 'Sonstiges'
};

/** Bei dieser Art darf eine Bezeichnung des Gebäcks mitkommen (config.js -> OTHER_CATEGORY). */
var OTHER_CATEGORY = 'sonstiges';

/** Allergene und Ernährung, gleiche Regeln wie CATEGORIES (config.js -> ALLERGENS,
 *  i18n-de.js -> alg). Im Sheet mit Komma getrennt in einer Zelle. */
var ALLERGENS = {
  nuesse: 'Enthält Nüsse/Mandeln',
  glutenfrei: 'Glutenfrei',
  vegan: 'Vegan'
};

/** Hauptzutaten, gleiche Regeln wie CATEGORIES (config.js -> INGREDIENTS, i18n-de.js -> ing).
 *  Im Sheet stehen sie mit Komma getrennt in einer Zelle, z. B. "Schokolade, Banane". */
var INGREDIENTS = {
  schoko: 'Schokolade',
  nuss: 'Nüsse/Mandeln',
  apfel: 'Apfel',
  zwetschge: 'Zwetschge/Pflaume',
  kirsche: 'Kirsche',
  beeren: 'Beeren',
  banane: 'Banane',
  rueebli: 'Rüebli/Karotte',
  zitrone: 'Zitrone',
  gewuerz: 'Zimt/Gewürze',
  natur: 'Natur/Vanille',
  andere: 'Andere'
};

/** Wer diese Hauptzutat angibt, bekommt dieses Allergen immer dazu (config.js -> NUT_LINK). */
var NUT_INGREDIENT = 'nuss';
var NUT_ALLERGEN = 'nuesse';

var MAX_NAME = 60;     // Zeichen je Vorname und Familienname, wie MAX_NAME in config.js
var MAX_OTHER = 60;    // Zeichen der Bezeichnung bei Sonstiges, wie MAX_OTHER in config.js
var MAX_DESC = 200;    // Zeichen, wie MAX_DESC in config.js
var MAX_INGREDIENTS = 2;  // wie MAX_INGREDIENTS in config.js
var MAX_ROWS = 500;    // Obergrenze gegen massenhaften Spam
var SHEET_NAME = 'Einträge';
// Neue Spalten nur hinten anhängen, damit bestehende Zeilen nicht verrutschen.
var HEADER = ['Zeitstempel', 'Name des Kindes', 'Kategorie', 'Beschreibung', 'Hauptzutaten',
              'Allergene', 'Gebäck (bei Sonstiges)'];

/* ---------------- Web-App ---------------- */

function doGet(e) {
  try {
    var counts = {};
    var descriptions = {};
    var ingredients = {};
    var ids = Object.keys(CATEGORIES);
    for (var i = 0; i < ids.length; i++) { counts[ids[i]] = 0; descriptions[ids[i]] = []; }
    var ingIds = Object.keys(INGREDIENTS);
    for (var k = 0; k < ingIds.length; k++) ingredients[ingIds[k]] = 0;

    var rows = readRows_(getSheet_());
    var total = 0;
    for (var r = 0; r < rows.length; r++) {
      var id = idForLabel_(rows[r][2]);
      if (!id) continue;                  // leere oder unbekannte Kategorie: nicht zählen
      counts[id]++;
      total++;
      var desc = String(rows[r][3] == null ? '' : rows[r][3]).trim();
      if (desc) descriptions[id].push(desc);
      var ings = ingredientIdsFromCell_(rows[r][4]);
      for (var j = 0; j < ings.length; j++) ingredients[ings[j]]++;
    }

    var out = { ok: true, counts: counts, ingredients: ingredients, total: total };
    if (SHOW_DESCRIPTIONS === true) out.descriptions = descriptions;   // nie Namen
    return json_(out);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json_({ ok: false, error: 'bad_request' });
  }

  // Honeypot: Menschen sehen dieses Feld nicht. Bots bekommen "ok", es wird nichts gespeichert.
  if (clean_(body.website)) return json_({ ok: true });

  var firstName = clean_(body.firstName);
  var lastName = clean_(body.lastName);
  var category = typeof body.category === 'string' ? body.category : '';
  // Die Bezeichnung zählt nur bei "Sonstiges"; bei jeder anderen Art wird sie übergangen.
  var otherName = category === OTHER_CATEGORY ? clean_(body.otherName) : '';
  var description = clean_(body.description);
  var ingredients = parseIds_(body.ingredients, INGREDIENTS, MAX_INGREDIENTS);
  var allergens = parseIds_(body.allergens, ALLERGENS, Object.keys(ALLERGENS).length);

  if (!firstName) return json_({ ok: false, error: 'first_name_required' });
  if (firstName.length > MAX_NAME) return json_({ ok: false, error: 'first_name_too_long' });
  if (!lastName) return json_({ ok: false, error: 'last_name_required' });
  if (lastName.length > MAX_NAME) return json_({ ok: false, error: 'last_name_too_long' });
  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
    return json_({ ok: false, error: 'category_invalid' });
  }
  if (otherName.length > MAX_OTHER) return json_({ ok: false, error: 'other_too_long' });
  if (description.length > MAX_DESC) return json_({ ok: false, error: 'description_too_long' });
  if (ingredients === null) return json_({ ok: false, error: 'ingredients_invalid' });
  if (allergens === null) return json_({ ok: false, error: 'allergens_invalid' });
  // Nüsse/Mandeln als Hauptzutat heisst immer auch: enthält Nüsse/Mandeln.
  if (ingredients.indexOf(NUT_INGREDIENT) >= 0 && allergens.indexOf(NUT_ALLERGEN) < 0) {
    allergens.push(NUT_ALLERGEN);
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy' });
  try {
    var sheet = getSheet_();
    if (sheet.getLastRow() - 1 >= MAX_ROWS) return json_({ ok: false, error: 'full' });
    sheet.appendRow([new Date(), protect_(firstName + ' ' + lastName), CATEGORIES[category],
                     protect_(description), labels_(ingredients, INGREDIENTS),
                     labels_(allergens, ALLERGENS), protect_(otherName)]);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Einmal im Editor ausführen (Funktion "setup" wählen -> "Ausführen"):
 *  legt das Tabellenblatt an und fragt die nötigen Berechtigungen ab. */
function setup() {
  var sheet = getSheet_();
  console.log('Tabellenblatt "' + sheet.getName() + '" ist bereit.');
}

/* ---------------- Hilfsfunktionen ---------------- */

/** Text bereinigen: Steuerzeichen raus, Leerraum zusammenfassen, trimmen. */
function clean_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  var s = String(value);
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
}

/** Formel-Injection verhindern: Beginnt ein Wert mit = + - @ (oder einem
 *  Apostroph), wird ein Apostroph vorangestellt. Google Sheets speichert den
 *  Wert dann als reinen Text und zeigt den Apostroph nicht an. */
function protect_(s) {
  return /^[=+\-@']/.test(s) ? "'" + s : s;
}

/** Kästchen aus der Anfrage (Hauptzutaten oder Allergene): fehlt das Feld, gilt "keine
 *  Angabe". Sonst eine Liste bekannter ids aus "table", ohne Doppelte, höchstens "max".
 *  Ungültig -> null. */
function parseIds_(value, table, max) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  var out = [];
  for (var i = 0; i < value.length; i++) {
    var id = value[i];
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(table, id)) return null;
    if (out.indexOf(id) < 0) out.push(id);
  }
  return out;
}

/** ids -> deutsche Texte für die Zelle, mit Komma getrennt, in der Reihenfolge von "table". */
function labels_(ids, table) {
  var out = [];
  for (var id in table) {
    if (Object.prototype.hasOwnProperty.call(table, id) && ids.indexOf(id) >= 0) out.push(table[id]);
  }
  return out.join(', ');
}

/** Zelle "Schokolade, Banane" -> ['schoko', 'banane']. Unbekanntes wird übergangen,
 *  damit von Hand bearbeitete Zellen die Zählung nicht stören. */
function ingredientIdsFromCell_(cell) {
  var parts = String(cell == null ? '' : cell).split(/[,;]/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var v = parts[i].trim();
    if (!v) continue;
    for (var id in INGREDIENTS) {
      if (Object.prototype.hasOwnProperty.call(INGREDIENTS, id) && (INGREDIENTS[id] === v || id === v)) {
        if (out.indexOf(id) < 0) out.push(id);
        break;
      }
    }
  }
  return out;
}

function idForLabel_(cell) {
  var v = String(cell == null ? '' : cell).trim();
  if (!v) return null;
  for (var id in CATEGORIES) {
    if (Object.prototype.hasOwnProperty.call(CATEGORIES, id) && (CATEGORIES[id] === v || id === v)) return id;
  }
  return null;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  } else {
    // Bestehendes Blatt von früher: fehlende Spaltenüberschriften (z. B. "Allergene")
    // ergänzen. Was schon in der Kopfzeile steht, bleibt unverändert.
    var range = sheet.getRange(1, 1, 1, HEADER.length);
    var head = range.getValues()[0];
    var changed = false;
    for (var i = 0; i < HEADER.length; i++) {
      if (head[i] === '' || head[i] === null) { head[i] = HEADER[i]; changed = true; }
    }
    if (changed) range.setValues([head]);
  }
  return sheet;
}

function readRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADER.length).getValues();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
