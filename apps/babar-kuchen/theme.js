/* Farbschema vor dem ersten Zeichnen setzen (kein Aufblitzen).
   Hat jemand auf gfrischkorn.org schon hell/dunkel gewählt, gilt diese Wahl
   (Quartos Schlüssel "quarto-color-scheme": "alternate" = dunkel, "default" = hell).
   Sonst folgt die Seite der Einstellung des Geräts (prefers-color-scheme, siehe app.css). */
(function () {
  var v = null;
  try { v = localStorage.getItem("quarto-color-scheme"); } catch (e) {}
  if (v === "alternate") document.documentElement.setAttribute("data-theme", "dark");
  else if (v === "default") document.documentElement.setAttribute("data-theme", "light");
})();
