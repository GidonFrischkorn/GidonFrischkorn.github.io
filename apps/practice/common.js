/* common.js — shared chrome for the secondary pages (notation.html,
   beginner.html, lastlayer.html). index.html has its own copy of the theme
   logic inside app.js because it also owns storage; this one only needs the
   theme key. Loaded after engine.js and before the page script. */
const PAGE = (function(){
  const THEME_KEY = "quarto-color-scheme";     // Quarto's own, shared with the rest of the site
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  /* The browser harness loads pages with ?run=<phase>; pages then expose their
     internals on window and drop animation to zero so checks are instant. */
  const testing = params.has("run");

  function currentTheme(){
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem(THEME_KEY, mode === "dark" ? "alternate" : "default"); } catch(e){}
    const b = $("themeToggle");
    if(!b) return;
    b.textContent = mode === "dark" ? "☀" : "☾";
    const label = mode === "dark" ? "Switch to light" : "Switch to dark";
    b.setAttribute("aria-label", label);
    b.setAttribute("title", label);
  }
  function bindTheme(){
    const b = $("themeToggle");
    if(b) b.addEventListener("click", () => applyTheme(currentTheme() === "dark" ? "light" : "dark"));
    applyTheme(currentTheme());
  }
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  /* Animation length for this page: none under the harness or reduced motion. */
  const ms = (testing || reduced()) ? 0 : 320;
  /* Top-level const in a classic script is not a window property, so the
     harness could not otherwise reach the engine inside its iframe. */
  if(testing && typeof CUBE !== "undefined") window.__engine = CUBE;
  /* ?selftest=1 appends the in-page self-test once the page has loaded (see
     selftest.js), so a learner never fetches it. app.js carries the same lines
     for index.html, which does not load this file. */
  if(params.has("selftest")) window.addEventListener("load", () => {
    const s = document.createElement("script");
    s.src = "selftest.js";
    s.onerror = () => {
      const d = document.createElement("div");
      d.className = "notice warn show";
      d.textContent = "selftest.js did not load.";
      (document.querySelector(".wrap") || document.body).prepend(d);
    };
    document.body.appendChild(s);
  });
  return { $, params, testing, currentTheme, applyTheme, bindTheme, reduced, esc, ms };
})();
