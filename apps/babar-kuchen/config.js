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

  /* Kuchen-Arten (Pflichtfeld, eine Auswahl). Die "id" ist ein fester technischer Schlüssel.
     Reihenfolge = Reihenfolge auf der Seite; was sich gut aus der Hand essen lässt, steht oben.
     WICHTIG: Wer hier eine Art oder unten eine Hauptzutat hinzufügt, entfernt oder umbenennt,
     muss dieselbe Änderung in apps-script/kuchenverkauf/Code.gs (CATEGORIES bzw. INGREDIENTS)
     machen und das Script neu bereitstellen. label.de muss dort genau gleich lauten.
     Der Test (node apps-script/kuchenverkauf/test/run-tests.js) prüft das. */
  CATEGORIES: [
    { id: "muffins",
      label: { de: "Muffins/Cupcakes", en: "Muffins / cupcakes", fr: "Muffins / cupcakes",
               it: "Muffin / cupcake", ti: "ማፊን / ካፕኬክ" } },
    { id: "blech",
      label: { de: "Blechkuchen/Schnitten", en: "Tray bake / bars", fr: "Gâteau sur plaque / carrés",
               it: "Torta in teglia / quadrotti", ti: "ኬክ ትሪ / ቁራጽ" } },
    { id: "ruehr",
      label: { de: "Rührkuchen/Cake", en: "Loaf cake / pound cake", fr: "Cake / gâteau simple",
               it: "Plumcake / torta semplice", ti: "ቀሊል ኬክ" } },
    { id: "guetzli",
      label: { de: "Guetzli/Weihnachtsgebäck", en: "Biscuits / Christmas cookies", fr: "Biscuits / biscuits de Noël",
               it: "Biscotti / biscotti di Natale", ti: "ብሽኮቲ / ናይ ልደት ብሽኮቲ" } },
    { id: "hefe",
      label: { de: "Hefegebäck (Zopf, Schnecken)", en: "Yeast bakes (plaited bread, buns)",
               fr: "Pâte levée (tresse, escargots)", it: "Lievitati (treccia, girelle)",
               ti: "ብሕሚራ ዝተሰርሐ (ዞፕፍ፣ ጥቕላል)" } },
    { id: "waehe",
      label: { de: "Wähe/Tarte", en: "Tart (Swiss Wähe)", fr: "Tarte / gâteau aux fruits",
               it: "Crostata / torta di frutta", ti: "ታርት" } },
    { id: "kaese",
      label: { de: "Käsekuchen", en: "Cheesecake", fr: "Gâteau au fromage (cheesecake)",
               it: "Cheesecake", ti: "ቺዝ ኬክ" } },
    { id: "torte",
      label: { de: "Torte", en: "Layer cake / gateau", fr: "Tourte (gâteau à la crème)",
               it: "Torta farcita", ti: "ቶርታ" } },
    { id: "sonstiges",
      label: { de: "Sonstiges", en: "Other", fr: "Autre",
               it: "Altro", ti: "ካልእ" } }
  ],

  /* Hauptzutaten (freiwillig, bis zu MAX_INGREDIENTS Kästchen). Gleiche Regeln wie oben. */
  INGREDIENTS: [
    { id: "schoko",    label: { de: "Schokolade", en: "Chocolate", fr: "Chocolat", it: "Cioccolato", ti: "ቸኮላታ" } },
    { id: "nuss",      label: { de: "Nüsse/Mandeln", en: "Nuts / almonds", fr: "Noix / amandes", it: "Noci / mandorle", ti: "ለውዝ / ማንደርላ" } },
    { id: "apfel",     label: { de: "Apfel", en: "Apple", fr: "Pomme", it: "Mela", ti: "ቱፋሕ" } },
    { id: "zwetschge", label: { de: "Zwetschge/Pflaume", en: "Plum", fr: "Pruneau / prune", it: "Prugna / susina", ti: "ፕሩኛ" } },
    { id: "kirsche",   label: { de: "Kirsche", en: "Cherry", fr: "Cerise", it: "Ciliegia", ti: "ቸሪ" } },
    { id: "beeren",    label: { de: "Beeren", en: "Berries", fr: "Baies / petits fruits", it: "Frutti di bosco", ti: "በሪ" } },
    { id: "banane",    label: { de: "Banane", en: "Banana", fr: "Banane", it: "Banana", ti: "ባናና" } },
    { id: "rueebli",   label: { de: "Rüebli/Karotte", en: "Carrot", fr: "Carotte", it: "Carota", ti: "ካሮት" } },
    { id: "zitrone",   label: { de: "Zitrone", en: "Lemon", fr: "Citron", it: "Limone", ti: "ሎሚ" } },
    { id: "gewuerz",   label: { de: "Zimt/Gewürze", en: "Cinnamon / spices", fr: "Cannelle / épices", it: "Cannella / spezie", ti: "ቀረፋ / ቅመማት" } },
    { id: "natur",     label: { de: "Natur/Vanille", en: "Plain / vanilla", fr: "Nature / vanille", it: "Naturale / vaniglia", ti: "ተራ / ቫኒላ" } }
  ],

  /* Höchstens so viele Hauptzutaten pro Eintrag (muss mit Code.gs übereinstimmen). */
  MAX_INGREDIENTS: 2,

  /* Wann eine Art bzw. Hauptzutat als "schon gut vertreten" gilt (orange in der Übersicht und
     freundlicher Hinweis im Formular; es wird nie etwas blockiert). Es müssen BEIDE Bedingungen
     erfüllt sein: mindestens MIN Einträge UND mindestens SHARE (Anteil) aller eingetragenen
     Kuchen. So bleibt eine ausgewogene Liste ohne Markierung, auch wenn sie lang wird.
     Beispiel Arten: 5 Muffins von 15 Kuchen (33 %) -> markiert; 5 von 25 (20 %) -> nicht.
     Zutaten kommen öfter vor (bis zu zwei pro Kuchen), darum liegen ihre Werte höher. */
  MARK_MIN: 5,
  MARK_SHARE: 0.25,
  ING_MARK_MIN: 6,
  ING_MARK_SHARE: 0.35,

  /* Beschreibungen (ohne Namen) öffentlich zeigen? Wirkt nur, wenn zusätzlich in
     Code.gs SHOW_DESCRIPTIONS = true gesetzt und neu bereitgestellt ist. */
  SHOW_DESCRIPTIONS: false,

  /* Längenbegrenzungen (müssen mit Code.gs übereinstimmen). */
  MAX_NAME: 60,
  MAX_DESC: 200,

  /* Nach so vielen Millisekunden gilt das Backend als nicht erreichbar. */
  TIMEOUT_MS: 15000
};
