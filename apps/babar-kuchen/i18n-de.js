/* Deutsch – die Ausgangssprache. Jede andere Sprachdatei (i18n-<Kürzel>.js) hat genau
   denselben Aufbau und dieselben Schlüssel.

   Für Übersetzerinnen und Übersetzer:
   - Leserinnen und Leser sind Eltern von Kita-Kindern. Kurze, einfache Sätze; freundlich.
   - Platzhalter in geschweiften Klammern ({n}, {name}, {cat}, {list}) bleiben unverändert stehen.
     Das Script setzt dort Zahlen, Namen oder Listen ein.
   - "Kuchen" meint hier jedes Gebäck für den Verkauf, auch Guetzli oder Zopf.
   - Die Kommentare an einzelnen Zeilen sagen, wo der Text steht. Sie werden nicht übersetzt. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).de = {

  /* name: Name der Sprache in der Sprache selbst (steht so in der Sprachauswahl).
     dir: Schreibrichtung, "ltr" oder "rtl". locale: für das Datum. */
  meta: { name: "Deutsch", dir: "ltr", locale: "de-CH" },

  /* Titel der Seite: der Anlass. */
  title: "Kuchenverkauf",

  ui: {
    lang_label: "Sprache",                       // unsichtbare Beschriftung der Sprachauswahl
    intro: "Trag hier bitte ein, welchen Kuchen du mitbringst. Die Übersicht zeigt, was schon eingetragen ist. So gibt es eine bunte Auswahl.",

    /* Übersicht der bisherigen Einträge */
    overview_h: "Das kommt schon",               // Überschrift
    overview_by_cat: "Nach Art",                 // Zwischentitel: Zahlen pro Kuchen-Art
    overview_by_ing: "Nach Hauptzutat",          // Zwischentitel: Zahlen pro Hauptzutat
    ing_none: "Noch keine Hauptzutaten angegeben.",
    loading: "Übersicht wird geladen …",
    load_error: "Die Übersicht konnte nicht geladen werden. Bitte prüf deine Internetverbindung.",
    retry: "Erneut versuchen",                   // Schaltfläche
    total: "Bisher eingetragen: {n}",            // {n} = Anzahl Kuchen
    empty: "Noch keine Einträge. Fang gerne an!",
    mark_legend: "Orange: Davon gibt es schon viele. Ähnliche Kuchen sind trotzdem willkommen.",
    mark_sr: "(schon gut vertreten)",            // nur für Vorleseprogramme, hinter einem orangen Eintrag

    /* Formular */
    form_h: "Kuchen eintragen",                  // Überschrift
    tip_h: "Tipp für den Verkauf",
    tip_text: "Am besten eignen sich Kuchen, die man gut aus der Hand essen kann, zum Beispiel Muffins, Blechkuchen, Rührkuchen oder Guetzli. Über Torten freuen wir uns auch. Bitte überleg dir aber, ob sich deine Torte gut transportieren, schneiden und aus der Hand essen lässt.",
    first_label: "Vorname des Kindes",
    last_label: "Familienname des Kindes",
    name_hint: "Den Namen sieht nur das Organisationsteam.",
    required: "Pflichtfeld",                     // nur für Vorleseprogramme, hinter einem Feld mit *
    cat_label: "Kuchen-Art",
    cat_placeholder: "Bitte auswählen",          // erster Eintrag der Auswahlliste
    other_label: "Bezeichnung des Gebäcks (freiwillig)",   // erscheint nur bei der Art «Sonstiges»
    other_hint: "z. B. «Baklava»",
    alg_legend: "Allergene und Ernährung (freiwillig)",    // Überschrift über drei Kästchen
    alg_hint: "Bitte kreuz an, was auf deinen Kuchen zutrifft.",
    alg_nut_note: "Du hast Nüsse/Mandeln als Hauptzutat gewählt. Darum ist bei den Allergenen das Kästchen für Nüsse/Mandeln angekreuzt.",
    ing_legend: "Hauptzutat (freiwillig)",       // Überschrift über den Zutaten-Kästchen
    ing_hint: "Du kannst bis zu {n} ankreuzen.", // {n} = Höchstzahl, zurzeit 2
    ing_other_note: "Du hast «Andere» gewählt. Schreib bitte in die Beschreibung, was du mitbringst.",
    desc_label: "Beschreibung (freiwillig)",
    desc_hint: "z. B. «Marmorkuchen»",
    chars_left: "Noch {n} Zeichen",              // {n} = verbleibende Zeichen im Textfeld
    hint_many: "{cat}: schon {n} eingetragen. Ähnliche Kuchen sind willkommen. Noch wenig gibt es von: {list}.",   // {cat} = gewählte Art, {list} = zwei andere Arten
    hint_many_ing: "Schon in vielen Kuchen: {list}. Das passt. Eine andere Zutat bringt mehr Abwechslung.",        // {list} = Zutaten
    list_and: " und ",                           // verbindet zwei Namen in {list}, mit Leerzeichen davor und danach
    submit: "Eintragen",                         // Schaltfläche zum Absenden
    sending: "Wird gesendet …",

    /* Fehlermeldungen */
    err_first: "Bitte gib den Vornamen deines Kindes ein.",
    err_last: "Bitte gib den Familiennamen deines Kindes ein.",
    err_name_long: "Der Name ist zu lang (höchstens {n} Zeichen).",
    err_cat: "Bitte wähl eine Kuchen-Art aus.",
    err_other_long: "Die Bezeichnung ist zu lang (höchstens {n} Zeichen).",
    err_ing: "Bitte kreuz höchstens {n} Hauptzutaten an.",
    err_desc_long: "Die Beschreibung ist zu lang (höchstens {n} Zeichen).",
    err_submit: "Das Eintragen hat leider nicht geklappt. Deine Angaben sind noch da. Bitte versuch es gleich noch einmal.",
    err_full: "Die Liste ist voll. Bitte melde dich beim Organisationsteam.",

    /* Bestätigung nach dem Absenden */
    success_h: "Danke!",
    success_text: "Wir haben «{cat}» für {name} eingetragen.",   // {cat} = Art und Zutaten, {name} = Name des Kindes
    again: "Weiteren Kuchen eintragen",          // Schaltfläche

    /* Datenschutz */
    privacy_h: "Datenschutz",
    privacy_p1: "Den Namen deines Kindes und deine Texte sieht nur das Organisationsteam. Öffentlich zeigt die Seite nur Zahlen: wie viele Kuchen pro Art und pro Hauptzutat eingetragen sind.",
    privacy_p2: "Die Angaben stehen in einer Google-Tabelle und werden nach dem Kuchenverkauf gelöscht. Beim Laden und Absenden verbindet sich dein Browser mit Google. Die Seite verwendet keine Cookies und kein Tracking. Sie merkt sich nur deine Sprache auf deinem Gerät.",

    /* Sonstiges */
    not_configured: "Die Eintragung ist noch nicht freigeschaltet.",
    demo_banner: "Testmodus: Nichts wird gespeichert.",
    descriptions_h: "Schon angekündigt",         // Überschrift über einer Liste von Beschreibungen
    hp_label: "Dieses Feld bitte leer lassen"    // Fangfeld gegen Spam, für Menschen unsichtbar
  },

  /* Kuchen-Arten. Schweizer Wörter (Guetzli, Wähe, Zopf) in anderen Sprachen umschreiben
     und das deutsche Wort in Klammern dazusetzen. */
  cat: {
    muffins: "Muffins/Cupcakes",
    blech: "Blechkuchen/Schnitten",              // flacher Kuchen vom Backblech, in Stücke geschnitten
    ruehr: "Rührkuchen/Cake",                    // einfacher Kuchen aus der Kastenform
    guetzli: "Guetzli/Weihnachtsgebäck",         // Guetzli = kleine Kekse
    hefe: "Hefegebäck (Zopf, Schnecken)",        // Zopf = geflochtenes Hefebrot; Schnecken = eingerolltes süsses Gebäck
    waehe: "Wähe/Tarte",                         // flacher Kuchen mit Früchten und Guss
    kaese: "Käsekuchen",
    torte: "Torte",                              // mehrschichtiger Kuchen mit Creme
    sonstiges: "Sonstiges"
  },

  /* Allergene und Ernährung: ganze Aussagen über den Kuchen. In anderen Sprachen die
     Begriffe verwenden, die dort auf Lebensmittel-Verpackungen üblich sind. */
  alg: {
    nuesse: "Enthält Nüsse/Mandeln",
    glutenfrei: "Glutenfrei",
    vegan: "Vegan"
  },

  /* Hauptzutaten. Ohne Komma und Strichpunkt (die trennen in der Tabelle die Einträge). */
  ing: {
    schoko: "Schokolade",
    nuss: "Nüsse/Mandeln",
    apfel: "Apfel",
    zwetschge: "Zwetschge/Pflaume",
    kirsche: "Kirsche",
    beeren: "Beeren",
    banane: "Banane",
    rueebli: "Rüebli/Karotte",
    zitrone: "Zitrone",
    gewuerz: "Zimt/Gewürze",
    natur: "Natur/Vanille",                      // ohne besondere Zutat
    andere: "Andere"                             // eine Zutat, die nicht in der Liste steht
  }
};
