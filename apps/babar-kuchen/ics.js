/* Kalender-Erinnerung als iCalendar-Datei (.ics), ganz im Browser erzeugt: Es wird nichts
   verschickt. Kalender-Apps auf dem Handy öffnen eine solche Datei und legen den Eintrag an.

   Der Eintrag ist ein Termin am Verkaufstag (Beginn und Dauer aus config.js) mit einem Alarm
   eine feste Zahl Stunden vorher, z. B. 24 Stunden: So bleibt am Vortag Zeit zum Einkaufen
   und Backen.

   Die Zeiten gelten in Zürcher Zeit (Europe/Zurich), auch wenn das Handy auf eine andere
   Zeitzone eingestellt ist. Die Regeln für Sommer- und Winterzeit stehen dazu in der Datei
   (VTIMEZONE), wie es der Standard verlangt. */
(function () {
  "use strict";

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  var TZID = "Europe/Zurich";
  /* Mitteleuropäische Zeit: Sommerzeit ab dem letzten Sonntag im März, Winterzeit ab dem
     letzten Sonntag im Oktober. */
  var VTIMEZONE = [
    "BEGIN:VTIMEZONE",
    "TZID:" + TZID,
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE"
  ];

  /* Uhrzeit an der Wand in Zürich -> "20261124T080000". Gerechnet wird in Weltzeit, damit die
     Zeitzone des Geräts keine Rolle spielt; Stunden über 23 rollen in den nächsten Tag. */
  function wall(year, month, day, hour) {
    var d = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
           pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
  }
  /* Date -> "20261112T101500Z" (Weltzeit, für den Erstellungs-Stempel) */
  function utc(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
           pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }

  /* Text für ein Feld: Sonderzeichen maskieren (RFC 5545, 3.3.11). */
  function esc(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function bytes(ch) {
    var c = ch.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  /* Zeilen dürfen höchstens 75 Bytes lang sein; längere werden umbrochen, die Fortsetzung
     beginnt mit einem Leerzeichen. Gezählt wird in Bytes, getrennt nur zwischen ganzen Zeichen
     (arabische, äthiopische oder chinesische Zeichen belegen mehrere Bytes). */
  function fold(line) {
    var out = [], cur = "", size = 0;
    Array.from(line).forEach(function (ch) {
      var b = bytes(ch);
      if (size + b > 75) { out.push(cur); cur = " "; size = 1; }
      cur += ch; size += b;
    });
    out.push(cur);
    return out.join("\r\n");
  }

  /* opts: { uid, stamp (Date), date ("JJJJ-MM-TT"), hour, durationHours, alarmHoursBefore,
             summary, description } */
  function build(opts) {
    var p = opts.date.split("-").map(Number);
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Chinderhuus BABAR//Kuchenverkauf//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ].concat(VTIMEZONE, [
      "BEGIN:VEVENT",
      "UID:" + opts.uid,
      "DTSTAMP:" + utc(opts.stamp),
      "DTSTART;TZID=" + TZID + ":" + wall(p[0], p[1], p[2], opts.hour),
      "DTEND;TZID=" + TZID + ":" + wall(p[0], p[1], p[2], opts.hour + opts.durationHours),
      "SUMMARY:" + esc(opts.summary),
      "DESCRIPTION:" + esc(opts.description),
      "TRANSP:TRANSPARENT",            // blockiert die Zeit im Kalender nicht
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + esc(opts.summary),
      "TRIGGER:-PT" + opts.alarmHoursBefore + "H",   // Alarm so viele Stunden vor dem Beginn
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ]);
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  /* Als Adresse für einen Download-Link. */
  function dataUrl(ics) {
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }

  window.KuchenIcs = { build: build, dataUrl: dataUrl };
})();
