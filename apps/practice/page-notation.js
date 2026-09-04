/* page-notation.js — wiring for notation.html. One shared cube in the sticky
   panel; every row's Show button resets it to solved, turns the view so the
   moved layer is in sight, plays the move and leaves the result standing so the
   learner can hold their own cube next to it. Needs engine.js, cube3d.js,
   common.js and notation.js loaded first. */
(function(){
  const { $, esc } = PAGE;
  PAGE.bindTheme();

  const narrow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  const view = cube3d.mount($("cube"), { size: narrow ? 114 : 150, view: "front", labels: true, ms: PAGE.ms });
  const rows = NOTATION.rows();
  const stat = $("pstat");
  let last = null, busy = false, flipped = false, current = -1;
  const say = t => { stat.textContent = t; };

  function mark(k){
    current = k;
    $("groups").querySelectorAll(".nrow").forEach((r, j) => r.classList.toggle("on", j === k));
  }
  function setFlip(on){
    flipped = on;
    view.setView(on ? "back" : "front");
    $("flip").textContent = on ? "Show from the front" : "Show from behind";
    $("flip").setAttribute("aria-pressed", on ? "true" : "false");
  }

  async function show(k){
    if(busy) return;
    const row = rows[k];
    const p = CUBE.parseMoves(row.demo);
    if(!p.ok) return;
    busy = true;
    mark(k);
    view.set(CUBE.SOLVED.slice());
    setFlip(row.view === "back");
    if(row.view && row.view !== "back") view.setView(row.view);
    say(`${row.token} — ${NOTATION.describeMove(p.moves[0])}`);
    for(const m of p.moves) await view.play(m);
    last = p.moves;
    $("undo").disabled = false;
    say(`${row.token} done: ${NOTATION.describeMove(p.moves[0])}. Do it on your cube and compare, then Undo.`);
    busy = false;
  }
  async function undo(){
    if(busy || !last) return;
    busy = true;
    for(const m of CUBE.invertMoves(last)) await view.play(m);
    last = null;
    $("undo").disabled = true;
    say("Undone — back to solved.");
    busy = false;
  }
  function reset(){
    if(busy) return;
    view.set(CUBE.SOLVED.slice());
    last = null;
    $("undo").disabled = true;
    mark(-1);
    say("Solved. Pick a move on the right.");
  }

  $("groups").innerHTML = NOTATION.GROUPS.map(g =>
    `<section class="ngroup" id="${g.id}">
       <h3>${esc(g.h)}</h3>
       <p>${esc(g.p)}</p>
       <div class="nrows">` +
       g.rows.map(r => {
         const k = rows.indexOf(r);
         return `<div class="nrow">
                   <div class="ntok alg">${esc(r.token)}</div>
                   <div class="nname">${esc(r.name)}<small>${esc(r.how)}</small></div>
                   <button class="btn sbtn" data-show="${k}" aria-label="Show ${esc(r.token)}">Show</button>
                 </div>`;
       }).join("") +
    `  </div>
     </section>`).join("");

  $("groups").addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-show]");
    if(b) show(Number(b.dataset.show));
  });
  $("undo").addEventListener("click", undo);
  $("resetCube").addEventListener("click", reset);
  $("flip").addEventListener("click", () => setFlip(!flipped));
  $("labels").addEventListener("click", () => {
    const on = $("labels").getAttribute("aria-pressed") !== "true";
    $("labels").setAttribute("aria-pressed", on ? "true" : "false");
    view.setLabels(on);
  });

  if(PAGE.testing) window.__page = { view, rows, show, undo, reset, last: () => last, busy: () => busy, current: () => current };
})();
