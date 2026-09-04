/* page-lastlayer.js — wiring for lastlayer.html: the case picker, the hold
   and AUF controls, the stepper, and the check at the end. Every state shown
   is computed by the engine; the 3D view renders `.raw`, never the oriented
   state, which is what makes a y rotation visible. Needs engine.js, algs.js,
   diagram.js, cube3d.js, common.js, notation.js and stepper.js loaded first. */
(function(){
  const { $, esc } = PAGE;
  PAGE.bindTheme();

  const CASES = [];
  ALGS.oll.rows.forEach(r => CASES.push({ id:r.id, stage:"oll", row:r,
    group: r.edges ? "OLL, edges — make the yellow cross" : "OLL, corners — finish the yellow face" }));
  ALGS.pll.rows.forEach(r => CASES.push({ id:r.id, stage:"pll", row:r, group:"PLL — move the pieces home" }));
  const byId = Object.fromEntries(CASES.map(c => [c.id, c]));
  const goalOf = c => c.row.edges ? "the yellow cross is made" : c.stage === "oll" ? "the top face is all yellow" : "the last layer is solved";
  const predOf = c => c.row.edges ? CUBE.ollEdgesDone : c.stage === "oll" ? CUBE.ollDone : (x => CUBE.solvedUpToAUF(x) >= 0);
  const picture = c => c.stage === "oll" ? renderOLL(c.row.e, !!c.row.edges) : renderPLL(c.row.r, c.row.x);
  const AUF = ["", "U", "U2", "U'"];

  const narrow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  const view = cube3d.mount($("cube"), { size: narrow ? 114 : 150, view: "front", labels: true, ms: PAGE.ms });
  let cur = null, state0 = null, moves = [], hold = 0, auf = 0;
  const held = () => {
    const turned = CUBE.applyPerm(state0, CUBE.powPerm(CUBE.PERM.y, hold));
    return CUBE.applyPerm(turned, CUBE.powPerm(CUBE.PERM.U, auf));
  };
  const st = stepper.mount($("stepper"), {
    cube: CUBE, view, ms: PAGE.ms, describe: NOTATION.describeMove,
    startText: "The case, before the algorithm", onStep: onStep
  });

  /* The check at the end: the engine's verdict on the final state. */
  function onStep(i){
    const p = $("pstat");
    if(i < st.n){ p.textContent = ""; p.className = "pstat"; return; }
    const good = predOf(cur)(CUBE.Cube(view.state()));
    p.textContent = good ? `✓ Done — ${goalOf(cur)}.`
                         : `✗ Not there — ${goalOf(cur).replace(/^the /, "the ")} is not the result from this hold. Step back and compare your cube with each picture.`;
    p.className = "pstat " + (good ? "ok" : "bad");
  }

  /* For the current hold, which AUFs make the algorithm work. */
  function works(){
    const pred = predOf(cur), out = [];
    const turned = CUBE.applyPerm(state0, CUBE.powPerm(CUBE.PERM.y, hold));
    for(let a=0; a<4; a++){
      const s = CUBE.applyPerm(turned, CUBE.powPerm(CUBE.PERM.U, a));
      if(pred(CUBE.Cube(CUBE.applyMoves(s, moves)))) out.push(a);
    }
    return out;
  }
  function holdMsg(){
    const w = works(), el = $("holdmsg"), front = cube3d.NAME[held()[22]];
    let cls = "ok", text;
    if(w.indexOf(auf) >= 0)
      text = hold === 0 && auf === 0
        ? "Held as the diagram means it: green in front. The algorithm works as written."
        : `From this side (front ${front}) the algorithm works as written.`;
    else if(w.length){
      cls = "warn";
      const need = (w[0] - auf + 4) % 4;
      text = `From this side (front ${front}) it only works after ${AUF[need]} first: turn the top layer, then run it.`;
    } else {
      cls = "bad";
      text = `Does not work from this side: the front shows ${front}. Turn the whole cube (y) until green is in front, as in the diagram.`;
    }
    el.textContent = text;
    el.className = "holdmsg " + cls;
  }

  function select(id, push){
    cur = byId[id] || CASES[0];
    const r = cur.row;
    state0 = CUBE.Cube.setup(r.a).raw;
    moves = CUBE.parseMoves(r.a).moves;
    hold = 0; auf = 0;
    $("picker").querySelectorAll(".pick").forEach(b => b.setAttribute("aria-pressed", b.dataset.case === cur.id ? "true" : "false"));
    $("casebox").innerHTML =
      `<div class="casehead">
         <div class="acase" aria-hidden="true">${picture(cur)}</div>
         <div>
           <h3>${esc(r.n)}</h3>
           <p class="cue">${esc(r.s)}</p>
         </div>
       </div>
       <div class="alg">${esc(r.a)}</div>
       <p class="note">${r.note}</p>
       <div class="k">Hold it differently</div>
       <div class="prow left">
         <button class="btn sbtn" data-adj="y" title="Turn the whole cube the way U turns">y</button>
         <button class="btn sbtn" data-adj="y'" title="Turn the whole cube the other way">y'</button>
         <button class="btn sbtn" data-adj="U" title="Turn the top layer">U</button>
         <button class="btn sbtn" data-adj="U'" title="Turn the top layer the other way">U'</button>
         <button class="btn sbtn" id="rehold">Back to the diagram's hold</button>
       </div>
       <div class="holdmsg" id="holdmsg" role="status" aria-live="polite"></div>`;
    st.load(held(), moves);
    holdMsg();
    if(push && history.replaceState){
      const u = new URL(location.href); u.searchParams.set("case", cur.id); history.replaceState(null, "", u);
    }
  }
  /* y and U turns are applied to the case itself, animated, and the stepper
     restarts from the new hold. */
  async function adjust(text){
    if(st.busy || st.playing) return;
    const m = CUBE.parseMoves(text).moves[0];
    st.goto(0);
    if(m[0] === "y") hold = (hold + m[1]) % 4; else auf = (auf + m[1]) % 4;
    await view.play(m);
    st.load(held(), moves);
    holdMsg();
  }
  function rehold(){
    if(st.busy || st.playing) return;
    hold = 0; auf = 0;
    st.load(held(), moves);
    holdMsg();
  }

  /* picker */
  const groups = [...new Set(CASES.map(c => c.group))];
  $("picker").innerHTML = groups.map(g =>
    `<div class="pgroup"><div class="k">${esc(g)}</div><div class="picks">` +
    CASES.filter(c => c.group === g).map(c =>
      `<button class="pick" data-case="${c.id}" aria-pressed="false" aria-label="${esc(c.row.n)}">
         <span aria-hidden="true">${picture(c)}</span><span class="short">${esc(c.row.short)}</span>
       </button>`).join("") +
    `</div></div>`).join("");
  $("picker").addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".pick");
    if(b && !st.busy) select(b.dataset.case, true);
  });
  $("casebox").addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-adj]");
    if(b) adjust(b.dataset.adj);
    else if(e.target.id === "rehold") rehold();
  });

  const want = PAGE.params.get("case");
  select(byId[want] ? want : "oll.sune", false);

  if(PAGE.testing) window.__page = { view, stepper: st, select, adjust, rehold, works,
                                     caseId: () => cur.id, hold: () => hold, auf: () => auf,
                                     ids: CASES.map(c => c.id), state0: () => state0 };
})();
