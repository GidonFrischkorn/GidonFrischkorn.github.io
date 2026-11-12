# Kuchenverkauf Chinderhuus BABAR – Einrichtung

Diese Anleitung führt Schritt für Schritt von „nichts“ bis zur fertigen Eintragsseite.
Du brauchst dafür nur einen Browser und das Google-Konto, dem die Tabelle gehört.
Programmierkenntnisse sind nicht nötig.

**So funktioniert es:** Die Eltern öffnen die Seite
`https://www.gfrischkorn.org/apps/babar-kuchen/` (nirgends verlinkt, nur per Mail).
Sie wählen eine **Kuchen-Art** (Pflicht) und freiwillig bis zu zwei **Hauptzutaten**.
Was sie eintragen, landet über ein kleines Google-Programm (Apps Script) als neue Zeile
in der Google-Tabelle. Die Seite fragt dasselbe Programm nach den Zahlen pro Art und pro
Zutat und bekommt dabei nie Namen zu sehen.

| Was | Wo |
| --- | --- |
| Eintragsseite | `apps/babar-kuchen/` im Repository |
| Alle Einstellungen der Seite (URL, Titel, Datum, Arten, Zutaten) | `apps/babar-kuchen/config.js` |
| Texte in den fünf Sprachen | `apps/babar-kuchen/i18n.js` |
| Google-Programm | `apps-script/kuchenverkauf/Code.gs` (wird in Google eingefügt, nicht veröffentlicht) |

---

## 0. Vorher ausprobieren (ohne Google)

Die Seite hat einen Testmodus mit Beispieldaten. Dabei wird nichts gespeichert und
nichts verschickt.

- Datei `apps/babar-kuchen/index.html` im Browser öffnen und an die Adresse
  `?demo=1` anhängen, z. B. `file:///…/apps/babar-kuchen/index.html?demo=1`.
- Weitere Varianten: `?demo=empty` (keine Einträge), `?demo=error` (Google nicht
  erreichbar), `?demo=slow` (langsame Verbindung), `&lang=ti` usw. für eine Sprache.
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
   Darin stehen nur Zahlen, nie Namen.
   Erscheint stattdessen eine Google-Anmeldeseite, steht der Zugriff nicht auf „Jeder“
   (Schritt 4 prüfen).
2. **Seite:** `https://www.gfrischkorn.org/apps/babar-kuchen/` öffnen, am besten auf dem Handy.
   Einen Testeintrag machen, z. B. Name `TEST`, Kategorie „Sonstiges“.
3. Es erscheint „Danke!“, und in der Übersicht steht bei „Sonstiges“ eine 1.
4. In der Tabelle, Blatt „Einträge“, steht die neue Zeile.
5. Die Testzeile in der Tabelle löschen (Rechtsklick auf die Zeilennummer → **Zeile löschen**).
   Nach einem Neuladen der Seite steht wieder 0.
6. Optional: die Seite einmal mit `?lang=ti`, `?lang=fr` usw. ansehen.

Danach kann der Link verschickt werden. Für eine bestimmte Sprache lässt sich `?lang=…`
anhängen, z. B. `…/apps/babar-kuchen/?lang=ti`. Ohne Angabe ist die Seite deutsch, und
die Eltern können oben umschalten.

## Während der Aktion

- **Einträge korrigieren:** Direkt in der Tabelle ändern oder Zeilen löschen. Die Zahlen auf
  der Seite passen sich beim nächsten Laden an.
  - Spalte „Kategorie“ (C) muss genau einen der Namen der Arten enthalten (z. B. `Wähe/Tarte`),
    sonst wird die Zeile nicht mitgezählt.
  - Spalte „Hauptzutaten“ (E) enthält die Zutaten mit Komma getrennt, z. B. `Schokolade, Banane`.
    Unbekannte Wörter werden einfach nicht gezählt.
- **Ab wann der Hinweis erscheint:** `HINT_THRESHOLD` (Arten, derzeit 3) und
  `INGREDIENT_HINT_THRESHOLD` (Zutaten, derzeit 4) in `config.js`.
- **Spam:** Ein unsichtbares Fangfeld hält einfache Bots ab, und mehr als 500 Zeilen nimmt das
  Programm nicht an. Unsinnige Zeilen einfach in der Tabelle löschen.

## Etwas ändern

**Texte, Titel, Datum:** in `config.js` bzw. `i18n.js`. Danach nur committen und pushen,
an Google muss nichts geändert werden.

**Arten oder Hauptzutaten hinzufügen, entfernen oder umbenennen:** An **zwei** Stellen gleich ändern:

1. `apps/babar-kuchen/config.js` → `CATEGORIES` bzw. `INGREDIENTS` (mit allen fünf Übersetzungen)
2. `apps-script/kuchenverkauf/Code.gs` → `CATEGORIES` bzw. `INGREDIENTS`
   (gleiche `id`, gleiche Reihenfolge, Text = deutscher Name; Zutaten ohne Komma im Namen)

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

Die Spalte „Hauptzutaten“ ergänzt das Programm in einer bestehenden Tabelle selbst
(Kopfzeile, Spalte E). Bestehende Zeilen bleiben, wie sie sind.

**Code.gs geändert → neu bereitstellen, ohne dass sich die URL ändert:**
Apps Script → **Bereitstellen → Bereitstellungen verwalten** → Stift-Symbol →
bei „Version“ **Neue Version** wählen → **Bereitstellen**.
(„Neue Bereitstellung“ würde eine *neue* URL erzeugen, die dann in `config.js` nachgetragen werden müsste.)

**Beschreibungen öffentlich zeigen (ohne Namen):** Das braucht zwei Schalter, damit nicht
versehentlich etwas öffentlich wird:
`SHOW_DESCRIPTIONS = true` in `Code.gs` (neu bereitstellen) **und**
`SHOW_DESCRIPTIONS: true` in `config.js`. Bedenke: Eltern schreiben in die Beschreibung
manchmal Namen („von Lenas Mama“). Den Datenschutztext in `i18n.js` dann ebenfalls anpassen.

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

**Hinweis zur Sicherheit:** Die Web-App-URL steht im öffentlichen Repository. Wer sie findet,
kann darüber höchstens zusätzliche Einträge machen, aber nie Namen oder Beschreibungen lesen.
Die Antwort des Programms enthält nur Zahlen.
