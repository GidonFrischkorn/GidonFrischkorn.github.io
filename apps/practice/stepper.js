/* stepper.js — step through a move sequence on a cube3d view. STEPPER (between
   the sentinels) is the pure part: the list of states a sequence passes
   through. stepper.mount (below) is the control strip and the keyboard
   handling. It never autoplays: a sequence is something to step through, not
   to watch. Needs engine.js, cube3d.js and common.js loaded first. */
/*== STEPPER:BEGIN ==*/
const STEPPER = (function(){
  /* The n+1 raw states from state0 through every move. */
  function states(cube, state0, moves){
    const out = [state0];
    let cur = state0;
    for(const m of moves){ cur = cube.applyMoves(cur, [m]); out.push(cur); }
    return out;
  }
  const inverse = m => [m[0], (4 - m[1]) % 4];
  const same = (a, b) => { if(a.length !== b.length) return false; for(let i=0;i<a.length;i++) if(a[i] !== b[i]) return false; return true; };
  return { states, inverse, same };
})();
/*== STEPPER:END ==*/

const stepper = (function(){
  function mount(el, opts){
    const o = Object.assign({ ms: 320, describe: () => "", onStep: () => {}, startText: "Start position" }, opts || {});
    const view = o.view, cube = o.cube;
    let moves = [], sts = [], i = 0, busy = false, playing = false, afterBusy = null;

    el.classList.add("stp");
    el.tabIndex = 0;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Step through the moves");
    el.innerHTML =
      `<ol class="strip"></ol>
       <div class="stp-ctl">
         <button class="btn sbtn" data-act="reset" title="Back to the start (Home)">⟲ Start</button>
         <button class="btn sbtn" data-act="prev" title="Previous move (←)">←</button>
         <button class="btn sbtn" data-act="next" title="Next move (→)">→</button>
         <button class="btn sbtn" data-act="play" title="Play the rest (space)">Play</button>
       </div>
       <div class="stp-status" role="status" aria-live="polite"></div>`;
    const strip = el.querySelector(".strip"), status = el.querySelector(".stp-status");
    const btn = act => el.querySelector(`[data-act="${act}"]`);

    function render(){
      [...strip.children].forEach((li, k) => {
        li.className = k < i ? "done" : (k === i - 1 ? "cur done" : "");
        if(k === i - 1) li.classList.add("cur");
      });
      const n = moves.length;
      status.textContent = i === 0
        ? (n ? `${o.startText} — press → for the first move` : o.startText)
        : `Move ${i} of ${n} · ${cube.fmtMoves([moves[i-1]])} · ${o.describe(moves[i-1])}` + (i === n ? " · done" : "");
      btn("prev").disabled = i === 0 || busy;
      btn("next").disabled = i >= n || busy;
      btn("reset").disabled = i === 0 && !busy;
      btn("play").disabled = n === 0 || (i >= n && !playing);
      btn("play").textContent = playing ? "Pause" : "Play";
    }
    function settle(){
      busy = false;
      if(afterBusy){ const f = afterBusy; afterBusy = null; f(); }
      render();
      o.onStep(i);
    }
    async function next(){
      if(busy || i >= moves.length) return;
      busy = true; render();
      await view.play(moves[i], o.ms);
      i++;
      settle();
    }
    async function prev(){
      if(busy || i <= 0) return;
      busy = true; render();
      await view.play(STEPPER.inverse(moves[i-1]), o.ms);
      i--;
      /* Defensive: the inverse must land on the recorded state. If it ever
         does not, the geometry and the engine disagree — repaint and say so. */
      if(!STEPPER.same(view.state(), sts[i])){ console.warn("stepper: inverse did not restore the state at", i); view.set(sts[i]); }
      settle();
    }
    function goto(k){
      if(busy){ afterBusy = () => goto(k); return; }
      i = Math.max(0, Math.min(moves.length, k));
      view.set(sts[i]);
      render();
      o.onStep(i);
    }
    async function play(){
      if(playing){ playing = false; render(); return; }
      if(i >= moves.length) return;
      playing = true; render();
      while(playing && i < moves.length) await next();
      playing = false; render();
    }
    function reset(){ playing = false; goto(0); }
    function load(state0, mv){
      playing = false;
      moves = mv.slice();
      sts = STEPPER.states(cube, state0, moves);
      strip.innerHTML = "";
      moves.forEach((m, k) => {
        const li = document.createElement("li");
        li.textContent = cube.fmtMoves([m]);
        li.title = o.describe(m);
        li.addEventListener("click", () => goto(k + 1));
        strip.appendChild(li);
      });
      goto(0);
    }

    el.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest("[data-act]");
      if(!b || b.disabled) return;
      ({ reset, prev, next, play })[b.dataset.act]();
    });
    el.addEventListener("keydown", e => {
      if(e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if(k === "ArrowRight") next();
      else if(k === "ArrowLeft") prev();
      else if(k === " ") play();
      else if(k === "Home") reset();
      else if(k === "End") goto(moves.length);
      else return;
      e.preventDefault();
    });

    if(o.state0) load(o.state0, o.moves || []);
    const api = { load, next, prev, goto, play, reset, get i(){ return i; }, get n(){ return moves.length; },
                  get busy(){ return busy; }, get playing(){ return playing; }, states: () => sts, el };
    if(typeof PAGE !== "undefined" && PAGE.testing) window.__stepper = api;
    return api;
  }
  return { mount };
})();
