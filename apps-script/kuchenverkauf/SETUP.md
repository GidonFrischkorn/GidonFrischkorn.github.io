# Kuchenverkauf Chinderhuus BABAR – Einrichtung

Diese Anleitung führt Schritt für Schritt von „nichts“ bis zur fertigen Eintragsseite.
Du brauchst dafür nur einen Browser und das Google-Konto, dem die Tabelle gehört.
Programmierkenntnisse sind nicht nötig.

**So funktioniert es:** Die Eltern öffnen die Seite
`https://www.gfrischkorn.org/apps/babar-kuchen/` (nirgends verlinkt, nur per Mail).
Sie geben **Vor- und Familienname** des Kindes an, wählen eine **Kuchen-Art** (Pflicht; bei
„Sonstiges“ mit freiem Textfeld) und freiwillig **Allergene** sowie bis zu zwei **Hauptzutaten**.
Was sie eintragen, landet über ein kleines Google-Programm (Apps Script) als neue Zeile
in der Google-Tabelle. Die Seite fragt dasselbe Programm nach den Zahlen pro Art und pro
Zutat und bekommt dabei nie Namen zu sehen.

| Was | Wo |
| --- | --- |
| Eintragsseite | `apps/babar-kuchen/` im Repository |
| Einstellungen der Seite (URL, Datum, Sprachen, Schlüssel der Arten, Allergene und Zutaten) | `apps/babar-kuchen/config.js` |
| Alle Texte einer Sprache, auch Titel und Namen der Arten, Allergene und Zutaten | `apps/babar-kuchen/i18n-<Sprache>.js`, z. B. `i18n-de.js` |
| Google-Programm | `apps-script/kuchenverkauf/Code.gs` (wird in Google eingefügt, nicht veröffentlicht) |

---

## 0. Vorher ausprobieren (ohne Google)

Die Seite hat einen Testmodus mit Beispieldaten. Dabei wird nichts gespeichert und
nichts verschickt.

- Datei `apps/babar-kuchen/index.html` im Browser öffnen und an die Adresse
  `?demo=1` anhängen, z. B. `file:///…/apps/babar-kuchen/index.html?demo=1`.
- Weitere Varianten: `?demo=empty` (keine Einträge), `?demo=error` (Google nicht
  erreichbar), `?demo=slow` (langsame Verbindung), `&lang=en` usw. für eine Sprache.
- Auch auf der veröffentlichten Seite funktioniert `?demo=1`, ohne dass etwas gespeichert wird.

## 1. Tabelle schützen (wichtig!)

Die Tabelle ist im Moment so freigegeben, dass **jede Person mit dem Link** sie lesen kann.
Sobald Kindernamen drinstehen, darf das nicht mehr so sein.

1. Die Tabelle öffnen, oben rechts auf **Freigeben** klicken.
2. Unter „Allgemeiner Zugriff“ von „Jeder, der über den Link verfügt“ auf **Eingeschränkt** umstellen.
3. Wer aus dem Organisationsteam die Einträge sehen soll, wird dort **namentlich** hinzugefügt
   (als „Betrachter“ oder „Bearbeiter“).
4. **Fertig** klicken.

Die Eintragsseite funktioniert trotzdem, denn das Programm läuft mit deinem Konto.

## 2. Programm in die Tabelle einfügen

1. In der Tabelle im Menü **Erweiterungen → Apps Script** wählen. Es öffnet sich ein
   neuer Tab mit einem Editor und einer Datei `Code.gs`.
2. Oben links auf „Unbenanntes Projekt“ klicken und z. B. `Kuchenverkauf` eintippen.
3. Den gesamten Inhalt von `Code.gs` im Editor löschen.
4. Den Inhalt von `apps-script/kuchenverkauf/Code.gs` aus dem Repository vollständig
   hineinkopieren. Auf GitHub geht das mit der Schaltfläche „Copy raw file“.
5. Speichern (Disketten-Symbol oder `Strg+S` / `Cmd+S`).

## 3. Einmal ausführen und Berechtigung erteilen

1. Oben in der Symbolleiste im Auswahlfeld neben „Debuggen“ die Funktion **setup** wählen.
2. Auf **Ausführen** klicken.
3. Google fragt nach einer Berechtigung: **Berechtigungen prüfen** → dein Konto wählen.
4. Es erscheint „Google hat diese App nicht überprüft“. Das ist bei eigenen Programmen
   normal. Auf **Erweitert** und dann **Zu Kuchenverkauf wechseln (unsicher)** klicken,
   danach auf **Zulassen**.
5. Unten im „Ausführungsprotokoll“ steht „Tabellenblatt "Einträge" ist bereit.“
   In der Tabelle gibt es jetzt ein neues Blatt **Einträge** mit Kopfzeile.

## 4. Als Web-App bereitstellen

1. Oben rechts auf **Bereitstellen → Neue Bereitstellung** klicken.
2. Beim Zahnrad neben „Typ auswählen“ **Web-App** wählen.
3. Ausfüllen:
   - Beschreibung: z. B. `Kuchenverkauf 2026`
   - **Ausführen als: Ich** (deine E-Mail-Adresse)
   - **Zugriff: Jeder** (nicht „Jeder mit Google-Konto“, sonst müssten sich die Eltern anmelden)
4. **Bereitstellen** klicken. Falls Google noch einmal nach Berechtigungen fragt, wie in Schritt 3 bestätigen.
5. Die angezeigte **Web-App-URL** kopieren. Sie sieht so aus:
   `https://script.google.com/macros/s/AKfy…lange-Zeichenkette…/exec`

## 5. URL in die Seite eintragen

1. Im Repository die Datei `apps/babar-kuchen/config.js` öffnen
   (auf GitHub: Datei anklicken → Stift-Symbol „Edit“).
2. Die Zeile `WEB_APP_URL: "",` suchen und die URL zwischen die Anführungszeichen setzen:
   `WEB_APP_URL: "https://script.google.com/macros/s/AKfy…/exec",`
3. Speichern bzw. committen. Nach dem nächsten Veröffentlichen der Website
   (Push auf `main`) ist die Seite live.

## 6. Testen

1. **Programm direkt:** Die Web-App-URL im Browser öffnen. Es erscheint Text wie
   `{"ok":true,"counts":{"muffins":0,"blech":0,…},"ingredients":{"schoko":0,…},"total":0}`.
   Darin stehen nur Zahlen, nie Namen, Allergene oder freie Texte.
   Erscheint stattdessen eine Google-Anmeldeseite, steht der Zugriff nicht auf „Jeder“
   (Schritt 4 prüfen).
2. **Seite:** `https://www.gfrischkorn.org/apps/babar-kuchen/` öffnen, am besten auf dem Handy.
   Einen Testeintrag machen, z. B. Vorname `TEST`, Familienname `TEST`, Kategorie „Sonstiges“
   mit der Bezeichnung `Probe`, dazu „Vegan“ und die Hauptzutat „Nüsse/Mandeln“.
3. Es erscheint „Danke!“, und in der Übersicht steht bei „Sonstiges“ eine 1.
4. In der Tabelle, Blatt „Einträge“, steht die neue Zeile: Name `TEST TEST`, in Spalte F
   `Enthält Nüsse/Mandeln, Vegan` (die Nüsse ergänzt das Programm selbst), in Spalte G `Probe`.
5. Die Testzeile in der Tabelle löschen (Rechtsklick auf die Zeilennummer → **Zeile löschen**).
   Nach einem Neuladen der Seite steht wieder 0.
6. Optional: die Seite einmal mit `?lang=en` usw. ansehen.

Danach kann der Link verschickt werden. Für eine bestimmte Sprache lässt sich `?lang=…`
anhängen, z. B. `…/apps/babar-kuchen/?lang=tr`. Ohne Angabe nimmt die Seite die Sprache
des Geräts, falls es sie gibt, sonst Deutsch. Oben rechts (Weltkugel) lässt sie sich umschalten.

Die 16 Sprachen und ihre Kürzel:

| Kürzel | Sprache | Kürzel | Sprache |
| --- | --- | --- | --- |
| `de` | Deutsch | `mn` | Mongolisch |
| `sq` | Albanisch | `fa` | Persisch |
| `am` | Amharisch | `so` | Somalisch |
| `ar` | Arabisch | `es` | Spanisch |
| `zh` | Chinesisch (vereinfacht) | `th` | Thailändisch |
| `en` | Englisch | `ti` | Tigrinya |
| `el` | Griechisch | `tr` | Türkisch |
| `ku` | Kurdisch (Kurmandschi) | `vi` | Vietnamesisch |

Ausser Deutsch und Englisch sind alle Sprachen maschinell übersetzt und per Rückübersetzung
auf ihre Bedeutung geprüft, aber erst dann verlässlich, wenn eine Person mit dieser
Muttersprache sie gegengelesen hat. Eine Korrektur gehört in die Datei der Sprache
(`i18n-<Kürzel>.js`); danach den Test laufen lassen und veröffentlichen. Das Datum erscheint
in Sprachen, die der Browser nicht kennt, in Ziffern (24.11.2026).

## Während der Aktion

- **Einträge korrigieren:** Direkt in der Tabelle ändern oder Zeilen löschen. Die Zahlen auf
  der Seite passen sich beim nächsten Laden an.
  - Spalte „Kategorie“ (C) muss genau einen der Namen der Arten enthalten (z. B. `Wähe/Tarte`),
    sonst wird die Zeile nicht mitgezählt.
  - Spalte „Hauptzutaten“ (E) enthält die Zutaten mit Komma getrennt, z. B. `Schokolade, Banane`.
    Unbekannte Wörter werden einfach nicht gezählt.
  - Spalte „Allergene“ (F) enthält, was die Eltern angekreuzt haben, z. B.
    `Enthält Nüsse/Mandeln, Vegan`. Eine leere Zelle heisst „keine Angabe“, nicht „nussfrei“.
  - Spalte „Gebäck (bei Sonstiges)“ (G) enthält die Bezeichnung, die Eltern bei „Sonstiges“
    eingetippt haben. Die Spalten F und G erscheinen nie auf der Seite.
- **Wann etwas orange markiert wird und der Hinweis erscheint:** erst wenn eine Art bzw. Zutat
  eine Mindestzahl erreicht **und** einen Anteil an allen Kuchen. Derzeit: Arten ab 5 Einträgen
  und 25 % (`MARK_MIN`, `MARK_SHARE`), Zutaten ab 6 und 35 % (`ING_MARK_MIN`, `ING_MARK_SHARE`)
  in `config.js`. Eine ausgewogene Liste bleibt so ohne Markierung. Eine Markierung kann wieder
  verschwinden, wenn die anderen Arten aufholen. Blockiert wird nie etwas. Der Hinweis schlägt
  die zwei am wenigsten vertretenen Arten vor, nie Torte oder Sonstiges.
  Nur Website-Einstellung: `Code.gs` muss dafür nicht neu bereitgestellt werden.
- **Spam:** Ein unsichtbares Fangfeld hält einfache Bots ab, und mehr als 500 Zeilen nimmt das
  Programm nicht an. Unsinnige Zeilen einfach in der Tabelle löschen.

## Etwas ändern

**Texte, Titel:** in der Datei der jeweiligen Sprache (`i18n-de.js`, `i18n-en.js`, …).
**Datum:** in `config.js`. Danach nur committen und pushen, an Google muss nichts geändert werden.
Ausnahme: die deutschen Namen der Arten, Allergene und Zutaten, siehe nächster Punkt.

**Arten, Allergene oder Hauptzutaten hinzufügen, entfernen oder umbenennen:** An **drei** Stellen
gleich ändern:

1. `apps/babar-kuchen/config.js` → `CATEGORIES`, `ALLERGENS` bzw. `INGREDIENTS` (nur der Schlüssel)
2. jede Sprachdatei `apps/babar-kuchen/i18n-*.js` → Abschnitt `cat`, `alg` bzw. `ing` (der Name)
3. `apps-script/kuchenverkauf/Code.gs` → `CATEGORIES`, `ALLERGENS` bzw. `INGREDIENTS`
   (gleicher Schlüssel, gleiche Reihenfolge, Text = deutscher Name aus `i18n-de.js`; Zutaten
   und Allergene ohne Komma im Namen)

Danach `Code.gs` neu in den Apps-Script-Editor kopieren und **neu bereitstellen** (siehe unten).
**Reihenfolge:** zuerst `Code.gs` neu bereitstellen, dann die Seite veröffentlichen. Umgekehrt
würde das alte Programm neue Arten ablehnen. Wie viele Zutaten man ankreuzen darf, steht in
`MAX_INGREDIENTS` (ebenfalls an beiden Stellen).
Ob beide Listen zusammenpassen, prüft der Test:

```sh
node apps-script/kuchenverkauf/test/run-tests.js
```

Wichtig: Wird eine Art oder Zutat umbenannt, zählen bereits eingetragene Zeilen mit dem alten
Namen nicht mehr mit. Dann den Namen in der Tabelle von Hand anpassen.

Die Spalten „Hauptzutaten“, „Allergene“ und „Gebäck (bei Sonstiges)“ ergänzt das Programm in
einer bestehenden Tabelle selbst (Kopfzeile, Spalten E bis G). Bestehende Zeilen bleiben, wie
sie sind.

**Eine Sprache hinzufügen:**

1. `i18n-de.js` kopieren, als `i18n-<Kürzel>.js` speichern (z. B. `i18n-tr.js`), in der ersten
   Zeile `.de =` durch `.<Kürzel> =` ersetzen und alle Texte übersetzen. Die Kommentare in
   `i18n-de.js` sagen, wo jeder Text steht. Platzhalter wie `{n}` bleiben stehen.
2. Oben in der Datei `meta` anpassen: `name` (Name der Sprache in der Sprache selbst), `dir`
   (`"rtl"` für Arabisch und Persisch, sonst `"ltr"`), `locale` (das Kürzel).
3. In `config.js` das Kürzel in `LANGS` eintragen.
4. In `index.html` unten eine Zeile `<script src="i18n-<Kürzel>.js"></script>` ergänzen, in
   derselben Reihenfolge wie in `LANGS`.
5. Den Test laufen lassen (siehe oben). Er meldet fehlende Texte, verlorene Platzhalter,
   Texte, die noch deutsch sind, und eine Datei, die nicht eingebunden ist.

An Google muss dafür nichts geändert werden.

**Code.gs geändert → neu bereitstellen, ohne dass sich die URL ändert:**
Apps Script → **Bereitstellen → Bereitstellungen verwalten** → Stift-Symbol →
bei „Version“ **Neue Version** wählen → **Bereitstellen**.
(„Neue Bereitstellung“ würde eine *neue* URL erzeugen, die dann in `config.js` nachgetragen werden müsste.)

**Beschreibungen öffentlich zeigen (ohne Namen):** Das braucht zwei Schalter, damit nicht
versehentlich etwas öffentlich wird:
`SHOW_DESCRIPTIONS = true` in `Code.gs` (neu bereitstellen) **und**
`SHOW_DESCRIPTIONS: true` in `config.js`. Bedenke: Eltern schreiben in die Beschreibung
manchmal Namen („von Lenas Mama“). Den Datenschutztext (`privacy_p1` in jeder Sprachdatei) dann ebenfalls anpassen.

## Nach dem Kuchenverkauf: alles löschen

1. **Daten löschen.** Google Tabellen hebt im *Versionsverlauf* auch gelöschte Zeilen auf.
   Am sichersten ist es deshalb, die **ganze Tabellen-Datei** zu löschen: in Google Drive
   Rechtsklick → **Entfernen**, danach im **Papierkorb** → **Endgültig löschen**.
   Das Apps-Script-Projekt hängt an der Tabelle und wird mit gelöscht.
   Nur das Blatt „Einträge“ zu löschen reicht nicht: Unter **Datei → Versionsverlauf**
   wären die Namen weiterhin zu sehen.
2. **Falls die Tabelle doch bleibt:** In Apps Script **Bereitstellen → Bereitstellungen verwalten →
   Archivieren**. Dann nimmt die URL keine Einträge mehr an.
3. **Seite entfernen** (im Repository, ein Commit):
   - Ordner `apps/babar-kuchen/` löschen
   - in `_quarto.yml` die Zeile `- apps/babar-kuchen/` (samt Kommentar darüber) löschen
   - in `.github/workflows/publish.yml` im Schritt „Check the unlisted pages shipped correctly“
     `apps/babar-kuchen` aus der Liste `for app in …` löschen
   - Optional: `apps-script/kuchenverkauf/` löschen
4. Allen, die Zugriff auf die Tabelle hatten, kurz Bescheid geben, dass die Daten gelöscht sind.

## Wenn etwas nicht klappt

| Anzeige auf der Seite | Ursache und Lösung |
| --- | --- |
| „Die Eintragung ist noch nicht freigeschaltet.“ | `WEB_APP_URL` in `config.js` ist leer (Schritt 5). |
| „Die Übersicht konnte nicht geladen werden.“ | URL falsch kopiert (muss auf `/exec` enden), Zugriff nicht auf „Jeder“, oder keine Internetverbindung. URL direkt im Browser testen (Schritt 6.1). |
| Eintragen klappt nicht, Übersicht schon | Code.gs nach einer Änderung nicht neu bereitgestellt, oder die Berechtigung (Schritt 3) fehlt. In Apps Script unter **Ausführungen** stehen die Fehler. |
| Zahl stimmt nicht mit Tabelle überein | In der Spalte „Kategorie“ steht ein Name, der nicht genau einer Art entspricht, bzw. in „Hauptzutaten“ ein unbekannter Zutatenname. |
| Neue Arten werden abgelehnt („Bitte wähl eine Kuchen-Art aus“), Zutaten fehlen in der Übersicht | `Code.gs` ist noch die alte Version. Neu einfügen und als **Neue Version** bereitstellen. |
| Jeder Eintrag endet mit „Das Eintragen hat leider nicht geklappt“, die Übersicht lädt aber | Seite und `Code.gs` passen nicht zusammen (die eine kennt Vor- und Familienname, die andere nur „Name“). `Code.gs` neu einfügen und als **Neue Version** bereitstellen. |

**Hinweis zur Sicherheit:** Die Web-App-URL steht im öffentlichen Repository. Wer sie findet,
kann darüber höchstens zusätzliche Einträge machen, aber nie Namen oder Beschreibungen lesen.
Die Antwort des Programms enthält nur Zahlen.
