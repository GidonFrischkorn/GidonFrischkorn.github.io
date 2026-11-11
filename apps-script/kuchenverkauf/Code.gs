/**
 * Kuchenverkauf Chinderhuus BABAR – Backend (Google Apps Script, an das Sheet gebunden).
 *
 * Einrichtung: siehe SETUP.md im selben Ordner.
 *
 *   doPost  hängt einen Eintrag als neue Zeile an:
 *           Zeitstempel | Name des Kindes | Kategorie | Beschreibung
 *   doGet   gibt NUR die Anzahl der Einträge pro Kategorie zurück – nie Namen.
 *           Beschreibungen (ohne Namen) nur, wenn SHOW_DESCRIPTIONS = true.
 *
 * Nach jeder Änderung an diesem Code: "Bereitstellen" -> "Bereitstellungen verwalten"
 * -> Stift -> Version "Neue Version" -> "Bereitstellen". Dann bleibt die URL gleich.
 */

/* ---------------- Einstellungen ---------------- */

/** Beschreibungen (ohne Namen) an die Seite ausliefern? Zusätzlich muss in
 *  config.js der Seite SHOW_DESCRIPTIONS: true stehen. */
var SHOW_DESCRIPTIONS = false;

/** Kategorien: id (wie in config.js) -> Text, der ins Sheet geschrieben wird.
 *  Muss mit config.js übereinstimmen (gleiche ids, Text = label.de). */
var CATEGORIES = {
  schoko: 'Schokokuchen',
  obst: 'Obstkuchen',
  kaese: 'Käsekuchen',
  ruehr: 'Rührkuchen/Marmor',
  muffins: 'Muffins/Cupcakes',
  blech: 'Blechkuchen',
  torte: 'Torte',
  sonstiges: 'Sonstiges'
};

var MAX_NAME = 60;     // Zeichen, wie MAX_NAME in config.js
var MAX_DESC = 200;    // Zeichen, wie MAX_DESC in config.js
var MAX_ROWS = 500;    // Obergrenze gegen massenhaften Spam
var SHEET_NAME = 'Einträge';
var HEADER = ['Zeitstempel', 'Name des Kindes', 'Kategorie', 'Beschreibung'];

/* ---------------- Web-App ---------------- */

function doGet(e) {
  try {
    var counts = {};
    var descriptions = {};
    var ids = Object.keys(CATEGORIES);
    for (var i = 0; i < ids.length; i++) { counts[ids[i]] = 0; descriptions[ids[i]] = []; }

    var rows = readRows_(getSheet_());
    var total = 0;
    for (var r = 0; r < rows.length; r++) {
      var id = idForLabel_(rows[r][2]);
      if (!id) continue;                  // leere oder unbekannte Kategorie: nicht zählen
      counts[id]++;
      total++;
      var desc = String(rows[r][3] == null ? '' : rows[r][3]).trim();
      if (desc) descriptions[id].push(desc);
    }

    var out = { ok: true, counts: counts, total: total };
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

  var name = clean_(body.name);
  var category = typeof body.category === 'string' ? body.category : '';
  var description = clean_(body.description);

  if (!name) return json_({ ok: false, error: 'name_required' });
  if (name.length > MAX_NAME) return json_({ ok: false, error: 'name_too_long' });
  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
    return json_({ ok: false, error: 'category_invalid' });
  }
  if (description.length > MAX_DESC) return json_({ ok: false, error: 'description_too_long' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy' });
  try {
    var sheet = getSheet_();
    if (sheet.getLastRow() - 1 >= MAX_ROWS) return json_({ ok: false, error: 'full' });
    sheet.appendRow([new Date(), protect_(name), CATEGORIES[category], protect_(description)]);
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
