/* page-beginner.js — wiring for beginner.html: the stage cards, the demo
   picker, the stepper and the verdict at the end of each demo. Every demo
   state comes from BEGINNER.build, never from a hand-drawn picture. Needs
   engine.js, cube3d.js, common.js, notation.js, stepper.js and beginner.js
   loaded first. */
(function(){
  const { $, esc } = PAGE;
  PAGE.bindTheme();

  const STAGES = BEGINNER.STAGES, P = BEGINNER.predicates(CUBE);
  const DEMOS = [];
  STAGES.forEach((s, si) => s.demos.forEach((d, di) => DEMOS.push({ s, si, d, di })));

  const narrow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  const view = cube3d.mount($("cube"), { size: narrow ? 114 : 150, view: "front", labels: true, ms: PAGE.ms });
  let cur = 0, built = null;
  const st = stepper.mount($("stepper"), {
    cube: CUBE, view, ms: PAGE.ms, describe: NOTATION.describeMove,
    startText: "The example, before the moves", onStep: onStep
  });

  function onStep(i){
    const p = $("pstat"), { s, si } = DEMOS[cur];
    if(i < st.n){ p.textContent = ""; p.className = "pstat"; return; }
    const good = P[si](CUBE.Cube(view.state()));
    p.textContent = good ? `✓ Stage ${si + 1} done: ${s.goal.replace(/\.$/, "")}.`
                         : `✗ Not there — the stage's goal is not met. Step back and compare.`;
    p.className = "pstat " + (good ? "ok" : "bad");
  }

  function select(k, push){
    if(st.busy || st.playing) return;
    cur = Math.max(0, Math.min(DEMOS.length - 1, k));
    const { s, si, d, di } = DEMOS[cur];
    built = BEGINNER.build(CUBE, s, d);
    st.load(built.before.raw, built.moves);
    $("pprog").textContent = `Stage ${si + 1} of ${STAGES.length} · ${s.title} · example ${di + 1} of ${s.demos.length}`;
    $("prevDemo").disabled = cur === 0;
    $("nextDemo").disabled = cur === DEMOS.length - 1;
    $("stages").querySelectorAll(".stage").forEach((el, j) => el.classList.toggle("on", j === si));
    $("stages").querySelectorAll("[data-demo]").forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.demo) === cur ? "true" : "false"));
    $("stages").querySelectorAll(".demo-cue").forEach(el => { el.hidden = Number(el.dataset.for) !== cur; });
    if(push && history.replaceState){
      const u = new URL(location.href); u.searchParams.set("stage", s.id); u.searchParams.set("demo", String(di)); history.replaceState(null, "", u);
    }
    if(push){
      const card = $("stages").querySelectorAll(".stage")[si];
      if(narrow && card && card.scrollIntoView) card.scrollIntoView({ block: "nearest" });
    }
  }

  $("stages").innerHTML = STAGES.map((s, si) =>
    `<section class="stage" id="stage-${s.id}">
       <div class="stagehead"><span class="stnum">${si + 1}</span><h3>${esc(s.title)}</h3></div>
       <p class="goal"><b>Goal.</b> ${esc(s.goal)}</p>
       <p class="cue"><b>How to see it.</b> ${esc(s.cue)}</p>
       <p class="why">${esc(s.why)}</p>
       <div class="k">Worked examples</div>
       <div class="demos">` +
       s.demos.map((d, di) => {
         const k = DEMOS.findIndex(x => x.s === s && x.d === d);
         return `<button class="btn sbtn demo" data-demo="${k}" aria-pressed="false">${esc(d.name)}</button>`;
       }).join("") +
    `  </div>` +
       s.demos.map((d, di) => {
         const k = DEMOS.findIndex(x => x.s === s && x.d === d);
         return `<div class="demo-cue" data-for="${k}" hidden><p>${esc(d.cue)}</p><div class="alg">${esc(d.alg)}</div></div>`;
       }).join("") +
    `</section>`).join("");

  $("stages").addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-demo]");
    if(b) select(Number(b.dataset.demo), true);
  });
  $("prevDemo").addEventListener("click", () => select(cur - 1, true));
  $("nextDemo").addEventListener("click", () => select(cur + 1, true));

  const wantStage = PAGE.params.get("stage"), wantDemo = Number(PAGE.params.get("demo") || 0);
  const start = DEMOS.findIndex(x => x.s.id === wantStage && x.di === wantDemo);
  select(start >= 0 ? start : 0, false);

  if(PAGE.testing) window.__page = { view, stepper: st, select, cur: () => cur, demos: DEMOS.length,
                                     stage: () => DEMOS[cur].si, built: () => built, predicates: P };
})();
