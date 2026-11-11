/* =====================================================================
   ZENTRALE EINSTELLUNGEN – nur diese Datei muss man normalerweise ändern.
   (Anleitung: apps-script/kuchenverkauf/SETUP.md im Repository)
   ===================================================================== */
window.KUCHEN_CONFIG = {

  /* Web-App-URL aus Apps Script ("Bereitstellen" -> "Web-App"), endet auf /exec.
     Leer lassen, solange das Backend noch nicht existiert: Die Seite zeigt dann
     "noch nicht freigeschaltet". Zum Ausprobieren ohne Backend: ?demo=1 anhängen. */
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwG-cvjUsXvVRSmYkwNUgpT7KgX3KZKJoBNaAF7aakFL7viUcsGN1_OvMBilAGigUjP/exec",

  /* Veranstaltung. Der Titel ist pro Sprache angegeben, das Datum im Format JJJJ-MM-TT. */
  EVENT: {
    org: "Chinderhuus BABAR",
    title: {
      de: "Kuchenverkauf",
      en: "Bake sale",
      fr: "Vente de gâteaux",
      it: "Vendita di torte",
      ti: "መሸጣ ኬክ"
    },
    date: "2026-11-24"
  },

  /* Kuchen-Kategorien. Die "id" ist ein fester technischer Schlüssel.
     WICHTIG: Wer hier eine Kategorie hinzufügt, entfernt oder umbenennt, muss
     dieselbe Änderung in apps-script/kuchenverkauf/Code.gs (CATEGORIES) machen
     und das Script neu bereitstellen. label.de muss dort genau gleich lauten.
     Der Test (node apps-script/kuchenverkauf/test/run-tests.js) prüft das. */
  CATEGORIES: [
    { id: "schoko",
      label: { de: "Schokokuchen", en: "Chocolate cake", fr: "Gâteau au chocolat",
               it: "Torta al cioccolato", ti: "ኬክ ቸኮላታ" } },
    { id: "obst",
      label: { de: "Obstkuchen", en: "Fruit cake or tart", fr: "Gâteau ou tarte aux fruits",
               it: "Torta alla frutta", ti: "ኬክ ፍሩታ" } },
    { id: "kaese",
      label: { de: "Käsekuchen", en: "Cheesecake", fr: "Gâteau au fromage (cheesecake)",
               it: "Cheesecake", ti: "ቺዝ ኬክ" } },
    { id: "ruehr",
      label: { de: "Rührkuchen/Marmor", en: "Pound cake / marble cake", fr: "Cake / gâteau marbré",
               it: "Torta semplice / marmorizzata", ti: "ቀሊል ኬክ / ማርሞር ኬክ" } },
    { id: "muffins",
      label: { de: "Muffins/Cupcakes", en: "Muffins / cupcakes", fr: "Muffins / cupcakes",
               it: "Muffin / cupcake", ti: "ማፊን / ካፕኬክ" } },
    { id: "blech",
      label: { de: "Blechkuchen", en: "Tray bake", fr: "Gâteau sur plaque",
               it: "Torta in teglia", ti: "ኬክ ትሪ" } },
    { id: "torte",
      label: { de: "Torte", en: "Layer cake / gateau", fr: "Tourte (gâteau à la crème)",
               it: "Torta farcita", ti: "ቶርታ" } },
    { id: "sonstiges",
      label: { de: "Sonstiges", en: "Other", fr: "Autre",
               it: "Altro", ti: "ካልእ" } }
  ],

  /* Ab so vielen Einträgen in einer Kategorie erscheint der freundliche Hinweis
     "Davon gibt es schon einige …" (es wird nie blockiert). */
  HINT_THRESHOLD: 3,

  /* Beschreibungen (ohne Namen) öffentlich zeigen? Wirkt nur, wenn zusätzlich in
     Code.gs SHOW_DESCRIPTIONS = true gesetzt und neu bereitgestellt ist. */
  SHOW_DESCRIPTIONS: false,

  /* Längenbegrenzungen (müssen mit Code.gs übereinstimmen). */
  MAX_NAME: 60,
  MAX_DESC: 200,

  /* Nach so vielen Millisekunden gilt das Backend als nicht erreichbar. */
  TIMEOUT_MS: 15000
};
