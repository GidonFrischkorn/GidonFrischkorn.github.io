/* =====================================================================
   ZENTRALE EINSTELLUNGEN – nur diese Datei muss man normalerweise ändern.
   (Anleitung: apps-script/kuchenverkauf/SETUP.md im Repository)
   Alle Texte, auch die Namen der Arten und Zutaten, stehen pro Sprache in
   einer eigenen Datei: i18n-de.js, i18n-en.js, …
   ===================================================================== */
window.KUCHEN_CONFIG = {

  /* Web-App-URL aus Apps Script ("Bereitstellen" -> "Web-App"), endet auf /exec.
     Leer lassen, solange das Backend noch nicht existiert: Die Seite zeigt dann
     "noch nicht freigeschaltet". Zum Ausprobieren ohne Backend: ?demo=1 anhängen. */
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwG-cvjUsXvVRSmYkwNUgpT7KgX3KZKJoBNaAF7aakFL7viUcsGN1_OvMBilAGigUjP/exec",

  /* Veranstaltung. Der Titel steht in den Sprachdateien ("title"), das Datum im Format JJJJ-MM-TT. */
  EVENT: {
    org: "Chinderhuus BABAR",
    date: "2026-11-24"
  },

  /* Kalender-Erinnerung, die Eltern nach dem Eintragen herunterladen können: ein Termin am
     Verkaufstag ab dieser vollen Stunde (Zürcher Zeit), so viele Stunden lang, mit einem Alarm
     so viele Stunden vorher. 8, 1 und 24 heisst: Termin von 8 bis 9 Uhr, das Handy meldet sich
     am Vortag um 8 Uhr, damit Zeit zum Einkaufen und Backen bleibt. */
  REMINDER: { hour: 8, durationHours: 1, alarmHoursBefore: 24 },

  /* Sprachen in der Reihenfolge der Auswahl: Deutsch zuerst, danach wie in der Liste der Kita
     (Albanisch, Amharisch, Arabisch, Chinesisch, Englisch, Griechisch, Kurdisch, Mongolisch,
     Persisch, Somalisch, Spanisch, Thailändisch, Tigrinya, Türkisch, Vietnamesisch).
     Zu jedem Kürzel gehört eine Datei
     i18n-<Kürzel>.js und eine <script>-Zeile in index.html. Der Test prüft beides. */
  LANGS: ["de", "sq", "am", "ar", "zh", "en", "el", "ku", "mn", "fa", "so", "es", "th", "ti", "tr", "vi"],

  /* Kuchen-Arten (Pflichtfeld, eine Auswahl): feste technische Schlüssel.
     Reihenfolge = Reihenfolge auf der Seite; was sich gut aus der Hand essen lässt, steht oben.
     WICHTIG: Wer hier eine Art, unten ein Allergen oder eine Hauptzutat hinzufügt oder entfernt,
     muss dasselbe an zwei weiteren Stellen tun:
       1. in jeder Sprachdatei i18n-*.js (Abschnitt cat, alg bzw. ing),
       2. in apps-script/kuchenverkauf/Code.gs (CATEGORIES, ALLERGENS bzw. INGREDIENTS),
          danach das Script neu bereitstellen. Der Text dort ist der deutsche aus i18n-de.js.
     Der Test (node apps-script/kuchenverkauf/test/run-tests.js) prüft das. */
  CATEGORIES: ["muffins", "blech", "ruehr", "guetzli", "hefe", "waehe", "kaese", "torte", "sonstiges"],

  /* Bei dieser Art erscheint ein Textfeld für die Bezeichnung des Gebäcks. */
  OTHER_CATEGORY: "sonstiges",

  /* Allergene und Ernährung (freiwillig, beliebig viele Kästchen). */
  ALLERGENS: ["nuesse", "glutenfrei", "vegan"],

  /* Hauptzutaten (freiwillig, bis zu MAX_INGREDIENTS Kästchen). */
  INGREDIENTS: ["schoko", "nuss", "apfel", "zwetschge", "kirsche", "beeren", "banane",
                "rueebli", "zitrone", "gewuerz", "natur", "andere"],

  /* "Andere": Die Seite bittet dann um eine Beschreibung. Wird nie orange markiert. */
  OTHER_INGREDIENT: "andere",

  /* Wer diese Hauptzutat ankreuzt, bekommt dieses Allergen automatisch dazu
     (muss mit NUT_INGREDIENT / NUT_ALLERGEN in Code.gs übereinstimmen). */
  NUT_LINK: { ingredient: "nuss", allergen: "nuesse" },

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

  /* Längenbegrenzungen (müssen mit Code.gs übereinstimmen).
     MAX_NAME gilt je für Vorname und Familienname, MAX_OTHER für die Bezeichnung bei "Sonstiges". */
  MAX_NAME: 60,
  MAX_OTHER: 60,
  MAX_DESC: 200,

  /* Nach so vielen Millisekunden gilt das Backend als nicht erreichbar. */
  TIMEOUT_MS: 15000
};
