/* Kalender-Erinnerung als iCalendar-Datei (.ics), ganz im Browser erzeugt: Es wird nichts
   verschickt. Kalender-Apps auf dem Handy öffnen eine solche Datei und legen den Eintrag an.

   Der Eintrag beginnt am Tag vor dem Verkauf (Uhrzeit aus config.js) und endet am Verkaufstag
   zur selben Uhrzeit, mit einem Alarm zum Beginn. Der Grund für diese Form: Manche Kalender
   (z. B. Google Kalender) übernehmen den Alarm aus einer Datei nicht und verwenden ihre eigene
   Standard-Erinnerung, und die bezieht sich auf den Beginn des Eintrags. Beginnt der Eintrag
   am Vortag, kommt die Erinnerung in beiden Fällen am Vortag.

   Zeiten ohne Zeitzone ("floating"): Sie gelten in der Zeitzone des Geräts. */
(function () {
  "use strict";

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Date -> "20261123T080000" (Ortszeit) */
  function local(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" +
           pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
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

  /* opts: { uid, stamp (Date), start (Date), end (Date), summary, description } */
  function build(opts) {
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Chinderhuus BABAR//Kuchenverkauf//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + opts.uid,
      "DTSTAMP:" + utc(opts.stamp),
      "DTSTART:" + local(opts.start),
      "DTEND:" + local(opts.end),
      "SUMMARY:" + esc(opts.summary),
      "DESCRIPTION:" + esc(opts.description),
      "TRANSP:TRANSPARENT",            // blockiert die Zeit im Kalender nicht
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + esc(opts.summary),
      "TRIGGER:PT0S",                  // Alarm zum Beginn des Eintrags
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  /* Als Adresse für einen Download-Link. */
  function dataUrl(ics) {
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }

  window.KuchenIcs = { build: build, dataUrl: dataUrl };
})();
