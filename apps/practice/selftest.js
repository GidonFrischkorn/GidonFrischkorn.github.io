/* selftest.js — the in-page self-test. Never loaded in normal use: common.js
   and app.js append this script after the page has loaded when the URL carries
   ?selftest=1, so a learner never fetches it. It re-runs, in the browser and
   against the scripts the page actually loaded, the cheap half of what
   local/*_test.mjs prove under Node — plus the things only a page can check:
   that every sibling script arrived, that the stylesheet applied, that the 3D
   cube is not inside an overflow:hidden ancestor, that nothing overflows
   sideways at this width. It is the check to run after editing a page without
   Node to hand; the Node suites remain the authority (they carry the Python
   oracle and the mutation sweeps).

   SELFTEST (between the sentinels) is pure: run(env) takes whichever modules
   the page has and returns a list of results. local/selftest_test.mjs slices
   it out, runs it under Node, and then breaks each module in memory to confirm
   the suite that names it goes red. The DOM part below the sentinels gathers
   the modules, adds the page checks, renders the panel, and exposes
   window.__selftest for the browser harness. */
/*== SELFTEST:BEGIN ==*/
const SELFTEST = (function(){
  /* Which globals each page must have loaded. A missing sibling script gives
     a blank or half-working page rather than an error, so this is the first
     thing checked. */
  const EXPECT = {
    "index.html":     ["CUBE", "ALGS", "renderOLL", "renderPLL", "LOG", "Store", "QUIZ"],
    "notation.html":  ["CUBE", "CUBE3D", "cube3d", "PAGE", "NOTATION"],
    "lastlayer.html": ["CUBE", "ALGS", "renderOLL", "renderPLL", "CUBE3D", "cube3d", "PAGE", "NOTATION", "STEPPER", "stepper"],
    "beginner.html":  ["CUBE", "CUBE3D", "cube3d", "PAGE", "NOTATION", "STEPPER", "stepper", "BEGINNER"]
  };
  const same = (a, b) => { if(a.length !== b.length) return false; for(let i=0;i<a.length;i++) if(a[i] !== b[i]) return false; return true; };
  const AUF = ["", "U", "U2", "U'"];

  function collector(){
    const results = [];
    let suite = "";
    return {
      results,
      section(name, fn){
        suite = name;
        try { fn(); }
        catch(e){ results.push({ suite, ok:false, msg:"threw: " + (e && e.message || e) }); }
      },
      ok(cond, msg){ results.push({ suite, ok: !!cond, msg }); }
    };
  }

  /* ---- engine: the tables, the group, the tokenizer -------------------- */
  function engine(C, T){
    const bases = Object.keys(C.PERM);
    T.ok(bases.length === 18, `18 move bases (got ${bases.length})`);
    for(const b of bases){
      const p = C.PERM[b];
      T.ok(p.length === 54 && new Set(p).size === 54 && p.every(v => v >= 0 && v < 54), `PERM.${b} is a permutation of the 54 facelets`);
      let c = C.SOLVED;
      for(let i=0;i<4;i++) c = C.applyPerm(c, p);
      T.ok(same(c, C.SOLVED), `${b}^4 is the identity`);
    }
    T.ok(["x","y","z"].every(m => C.isSolved(C.Cube.solved().apply(m))), "x, y and z leave a solved cube solved");
    T.ok(!C.isSolved(C.Cube.solved().apply("M")), "M alone does not leave the cube solved (centres move)");
    T.ok(C.isSolved(C.Cube.solved().apply("M M'")), "M M' is the identity");
    T.ok(C.ROT24.length === 24, `24 whole-cube orientations (got ${C.ROT24.length})`);
    const scr = C.Cube.solved().apply("R U R' F2 D B' L M E S");
    T.ok(!!scr && C.ROT24.every(g => C.Cube(C.applyPerm(scr.raw, g)).key === scr.key), "orient() absorbs all 24 rotations of a scrambled cube");
    /* Identities the notation page states in words. */
    const after = alg => C.Cube.solved().apply(alg).raw;
    for(const [a, b] of [["r","R M'"],["l","L M"],["f","F S"],["u","U E'"],["d","D E"],["b","B S'"],["x","r L'"],["y","U E' D'"],["z","F S B'"]])
      T.ok(same(after(a), after(b)), `${a} = ${b}`);
    /* Orders the algorithm notes state: six repetitions return to solved. */
    for(const alg of ["R U R' U'", "R U R' U R U2 R'", "R' F R F'"]){
      let c = C.Cube.solved(), n = 0;
      do { c = c.apply(alg); n++; } while(!C.isSolved(c) && n < 12);
      T.ok(n === 6, `(${alg}) has order 6 (got ${n})`);
    }
    /* The strict tokenizer. */
    for(const [txt, want] of [["Rw2 U", true], ["R U R'", true], ["y' R' U' R", true], ["Rw U", true], ["R·U·R'", true],
                              ["Q U", false], ["R5", false], ["", false], ["Mw", false], ["R U R'!", false]]){
      const r = C.parseMoves(txt);
      T.ok(r.ok === want, `parseMoves(${JSON.stringify(txt)}) is ${want ? "accepted" : "rejected"}`);
    }
    T.ok(C.parseMoves("Rw U").moves[0][0] === "r", "Rw normalises to r");
    T.ok(C.Cube.solved().apply("y' R' U' R").key !== C.Cube.solved().apply("R' U' R").key, "a leading y' is not dropped");
    T.ok(C.Cube.setup("R U Q") === null && C.Cube.solved().apply("R U Q") === null, "bad notation yields null, never a state");
    const p = C.parseMoves("R U2 F' D L2 B M' E S2 r u' x y2 z'");
    T.ok(p.ok && same(C.applyMoves(C.applyMoves(C.SOLVED, p.moves), C.invertMoves(p.moves)), C.SOLVED), "a sequence and its inverse cancel");
    T.ok(C.fmtMoves(C.parseMoves("R U2 F' Rw").moves) === "R U2 F' r", "fmtMoves writes the parsed moves back");
    T.ok(C.solvedUpToAUF(C.Cube.solved().apply("U")) >= 0 && C.solvedUpToAUF(C.Cube.solved().apply("R")) < 0, "solvedUpToAUF forgives a top-layer turn and nothing else");
  }

  /* ---- the algorithm table: each case is what its diagram says ---------- */
  function algorithms(C, A, T){
    const predOf = r => r.edges ? C.ollEdgesDone : r.stage === "oll" ? C.ollDone : (x => C.solvedUpToAUF(x) >= 0);
    const cases = [];
    for(const stage of ["oll", "pll"]) for(const r of A[stage].rows) cases.push(Object.assign({ stage }, r));
    T.ok(cases.length === 16, `16 two-look cases (got ${cases.length})`);
    for(const [k, g] of Object.entries(A)) for(const r of g.rows)
      T.ok(C.parseMoves(r.a).ok, `${k}: "${r.a}" parses`);
    const ids = new Set(), shorts = new Set();
    for(const r of cases){
      T.ok(/^(oll|pll)\.[a-z0-9][a-z0-9-]*$/.test(r.id) && !ids.has(r.id), `${r.id}: a well-formed, unique case id`);
      ids.add(r.id);
      T.ok(r.short && r.short.length <= 12 && !shorts.has(r.short), `${r.id}: a unique short name of at most 12 characters`);
      shorts.add(r.short);
    }
    for(const r of cases) for(const o of (r.confusable || []))
      T.ok(o !== r.id && ids.has(o), `${r.id}: confusable with a known case (${o})`);
    const sortPairs = x => x.map(p => p.join(">")).sort().join(" ");
    for(const r of cases){
      const s = C.Cube.setup(r.a);
      T.ok(s && C.f2lDone(s), `${r.id}: the case leaves the first two layers solved`);
      if(r.stage === "oll"){
        T.ok(C.ollEnc(s) === r.e, `${r.id}: the stored diagram is what the algorithm solves`);
        if(r.edges) T.ok(!C.ollEdgesDone(s), `${r.id}: an edge case starts with the cross unmade`);
        else T.ok(C.ollEdgesDone(s) && !C.ollDone(s), `${r.id}: a corner case starts with the cross made and the face unfinished`);
      } else {
        T.ok(C.ollDone(s) && C.solvedUpToAUF(s) < 0, `${r.id}: a PLL case starts oriented and unsolved`);
        T.ok(C.pllRing(s) === r.r, `${r.id}: the stored rim is what the algorithm solves`);
        T.ok(sortPairs(C.pllArrows(s)) === sortPairs(r.x), `${r.id}: the stored arrows are the piece movements`);
      }
      const v = C.solvesCase(s, r.a, predOf(r));
      T.ok(v.ok && v.hold === 0 && v.auf === 0, `${r.id}: solvesCase accepts the algorithm as written, from the diagram's hold`);
    }
    /* Another correct algorithm passes; a wrong one fails all sixteen holds. */
    const h = cases.find(r => r.id === "oll.h");
    if(h){
      const s = C.Cube.setup(h.a);
      T.ok(C.solvesCase(s, "R U2 R' U' R U R' U' R U' R'", C.ollDone).ok, "oll.h: the other common OLL 21 algorithm is accepted");
      T.ok(!C.solvesCase(s, "R U R' U R U2 R'", C.ollDone).ok, "oll.h: Sune is rejected on the H case");
    }
    for(const r of A.f2l.rows){
      const s = C.Cube.setup(r.a);
      const slots = ["FR","FL","BL","BR"].filter(k => C.f2lSlotSolved(s, k)).length;
      T.ok(s && C.crossSolved(s) && slots === 3, `f2l "${r.n}": one slot open, cross and the other three intact`);
    }
  }

  /* ---- the plan-view diagrams: they render, and the orbit is what the quiz assumes -- */
  function diagrams(C, A, renderOLL, renderPLL, T){
    const EXPECTED = { "oll.dot": 1, "oll.line": 2, "oll.h": 2 };
    const picture = (stage, r, st) => stage === "oll" ? renderOLL(C.ollEnc(st), !!r.edges) : renderPLL(C.pllRing(st), null);
    for(const stage of ["oll", "pll"]) for(const r of A[stage].rows){
      const pic = stage === "oll" ? renderOLL(r.e, !!r.edges) : renderPLL(r.r, r.x);
      T.ok(/^<svg/.test(pic) && /<\/svg>$/.test(pic), `${r.id}: renders an SVG`);
      const s = C.Cube.setup(r.a), pics = new Set();
      for(const a of AUF) pics.add(picture(stage, r, s.apply(a)));
      const want = EXPECTED[r.id] || 4;
      T.ok(pics.size === want, `${r.id}: ${pics.size} distinct pictures over the four AUFs (expected ${want})`);
    }
    const dot = A.oll.rows.find(r => r.id === "oll.dot");
    if(dot){
      const s = C.Cube.setup(dot.a), unmasked = new Set();
      for(const a of AUF) unmasked.add(renderOLL(C.ollEnc(s.apply(a)), false));
      T.ok(unmasked.size > 1, "oll.dot: without the corner masking it has more than one view, so the orbit counts above are not vacuous");
    }
    const ua = A.pll.rows.find(r => r.id === "pll.ua");
    if(ua) T.ok(renderPLL(ua.r, null) !== renderPLL(ua.r, ua.x), "pll.ua: the arrows change the picture, so a recognition item must omit them");
  }

  /* ---- the 3D geometry against the engine's tables ----------------------- */
  function cube3d(C, G, T){
    const seen = new Set();
    let outward = true, onCube = true, colours = true;
    for(const s of G.STICKERS){
      seen.add(G.key(s.pos, s.n));
      if(s.pos[0]*s.n[0] + s.pos[1]*s.n[1] + s.pos[2]*s.n[2] !== 1) outward = false;
      if(Math.abs(s.pos[0]) > 1 || Math.abs(s.pos[1]) > 1 || Math.abs(s.pos[2]) > 1) onCube = false;
      if(C.SOLVED[s.i] !== s.face) colours = false;
    }
    T.ok(G.STICKERS.length === 54 && seen.size === 54, `54 distinct sticker placements (got ${seen.size})`);
    T.ok(outward, "every sticker's normal points out of its cubie");
    T.ok(onCube, "every sticker sits on the cube");
    T.ok(colours, "a sticker's solved colour is the face its normal names");
    T.ok(G.CUBIES.length === 26, `26 cubies (got ${G.CUBIES.length})`);
    const agrees = (movedTo, bases) => {
      let bad = 0;
      for(const base of bases) for(let q=1;q<=3;q++){
        const p = C.powPerm(C.PERM[base], q);
        for(let i=0;i<54;i++){ const j = movedTo(i, base, q); if(j === undefined || p[j] !== i) bad++; }
      }
      return bad;
    };
    const bases = Object.keys(C.PERM);
    for(const base of bases){
      T.ok(agrees(G.movedTo, [base]) === 0, `${base}: the view moves every sticker where PERM says it lands, for all three quarter counts`);
      const t1 = G.turn(base, 1), t2 = G.turn(base, 2), t3 = G.turn(base, 3);
      T.ok(t1.deg === 90 && t2.deg === 180 && t3.deg === -90, `${base}: turn() takes the short way round`);
      const n = G.CUBIES.filter(G.LAYER[base]).length;
      const want = "UDRLFB".includes(base) ? 9 : "MES".includes(base) ? 8 : "rludfb".includes(base) ? 17 : 26;
      T.ok(n === want, `${base}: the layer carries ${want} cubies (got ${n})`);
    }
    /* Negative control: with the sense of rotation flipped the check must fail. */
    const flipped = (i, base, q) => {
      const s = G.STICKERS[i], a = G.AXIS[base].map(v => -v);
      if(!G.LAYER[base](s.pos)) return i;
      const pos = G.rotq(s.pos, a, q), n = G.rotq(s.n, a, q);
      const t = G.STICKERS.find(t => G.key(t.pos, t.n) === G.key(pos, n));
      return t && t.i;
    };
    T.ok(agrees(flipped, ["U", "R", "F", "M", "r", "x"]) >= 6 * 2 * 20, "negative control: a flipped axis breaks the geometry check");
  }

  /* ---- the notation table ------------------------------------------------ */
  function notation(C, N, T){
    const rows = N.rows(), tokens = new Set();
    T.ok(rows.length >= 28, `at least 28 notation rows (got ${rows.length})`);
    for(const r of rows){
      const p = C.parseMoves(r.demo);
      T.ok(p.ok && !tokens.has(r.token) && r.how.length > 20 && r.name.length > 0, `row ${r.token}: demo parses, token unique, words present`);
      tokens.add(r.token);
    }
    const demoBases = new Set(rows.map(r => { const p = C.parseMoves(r.demo); return p.ok ? p.moves[0][0] : null; }));
    for(const base of Object.keys(C.PERM)) T.ok(demoBases.has(base), `${base} is demonstrated by a row`);
    T.ok(rows.some(r => /Rw/.test(r.name) || /Rw/.test(r.token)), "the Rw spelling is mentioned");
    let described = true;
    for(const base of Object.keys(C.PERM)) for(let q=1;q<=3;q++) if(!(N.describeMove([base, q]).length > 8)) described = false;
    T.ok(described, "describeMove says something for all 18 bases x 3 quarter counts");
    T.ok(/the way L turns/.test(N.describeMove(["M", 1])) && /the way L' turns/.test(N.describeMove(["M", 3])), "M is described via L, M' via L'");
    T.ok(/the way D turns/.test(N.describeMove(["E", 1])) && /the way F turns/.test(N.describeMove(["S", 1])), "E is described via D, S via F");
    T.ok(/half turn/.test(N.describeMove(["U", 2])) && /anticlockwise/.test(N.describeMove(["R", 3])), "U2 is a half turn, R' anticlockwise");
    const after = m => C.Cube.solved().apply(m).raw;
    T.ok(after("M")[25] === 0, "M brings the top down the front");
    T.ok(after("E")[12] === 2, "E takes the front to the right");
    T.ok(after("S")[10] === 0, "S takes the top to the right");
    T.ok(after("y")[22] === 1 && after("x")[4] === 2 && after("z")[13] === 0, "y brings red to the front, x green to the top, z yellow to the right");
  }

  /* ---- the stepper's pure part ------------------------------------------ */
  function stepper(C, S, T){
    const p = C.parseMoves("R U R' U'").moves;
    const s = S.states(C, C.SOLVED.slice(), p);
    T.ok(s.length === 5 && S.same(s[0], C.SOLVED) && S.same(s[4], C.applyMoves(C.SOLVED.slice(), p)) && !S.same(s[1], s[0]), "states() lists start, every intermediate state and the end");
    T.ok(p.every(m => S.same(C.applyMoves(C.applyMoves(C.SOLVED.slice(), [m]), [S.inverse(m)]), C.SOLVED)), "inverse() undoes each move");
    T.ok(S.inverse(["U", 2])[1] === 2, "the inverse of a half turn is a half turn");
  }

  /* ---- the beginner data: every demo is a case its algorithm fixes ------- */
  function beginner(C, B, T){
    const P = B.predicates(C);
    T.ok(B.STAGES.length === 7 && P.length === 7, `7 stages and 7 predicates (got ${B.STAGES.length}, ${P.length})`);
    const POS = { UFR:[8,20,9], UFL:[6,18,38], UBR:[2,45,11], UBL:[0,47,36],
                  UF:[7,19], UR:[5,10], UB:[1,46], UL:[3,37], DF:[28,25], FR:[23,12] };
    const FACE_OF = i => "URFDLB"[Math.floor(i / 9)];
    const find = (raw, colours) => {
      for(const [name, idx] of Object.entries(POS)){
        if(idx.length !== colours.length) continue;
        if(idx.map(i => raw[i]).sort().join("") !== colours.slice().sort().join("")) continue;
        const white = idx.find(i => raw[i] === 3);
        return { at:name, whiteOn: white === undefined ? null : FACE_OF(white) };
      }
      return null;
    };
    const demo = (id, k) => { const s = B.STAGES.find(x => x.id === id); return B.build(C, s, s.demos[k]).before; };
    B.STAGES.forEach((stage, s) => {
      T.ok(stage.demos.length >= 1 && stage.goal && stage.cue && stage.why, `${stage.id}: has a goal, a cue, a why and at least one demo`);
      for(const d of stage.demos){
        const tag = `${stage.id} / ${d.name}`;
        const b = B.build(C, stage, d);
        T.ok(b !== null, `${tag}: builds`);
        if(!b) continue;
        T.ok(!P[s](b.before) && P[s](b.after), `${tag}: the stage is not done before and done after`);
        let earlier = true;
        for(let e=0;e<s;e++) if(!P[e](b.before) || !P[e](b.after)) earlier = false;
        T.ok(earlier, `${tag}: no earlier stage is disturbed`);
        T.ok(b.before.key !== b.after.key && (s === 6 || !P[6](b.after)), `${tag}: the algorithm does something, and the cube is not already solved afterwards`);
      }
    });
    /* The cues name what is on the cube. */
    const cross = [find(demo("cross", 0).raw, [3, 2]), find(demo("cross", 1).raw, [3, 2]), find(demo("cross", 2).raw, [3, 2])];
    T.ok(cross[0] && cross[0].at === "DF" && cross[0].whiteOn === "D", "cross/0: the white-green edge is at DF, white down");
    T.ok(cross[1] && cross[1].at === "FR" && cross[1].whiteOn === "F", "cross/1: the white-green edge is at FR, white front");
    T.ok(cross[2] && cross[2].at === "FR" && cross[2].whiteOn === "R", "cross/2: the white-green edge is at FR, white right");
    T.ok(demo("cross", 0).raw[4] === 3 && demo("cross", 0).raw[22] === 2, "cross demos hold white on top, green in front");
    ["R", "U", "F"].forEach((w, k) => {
      const c = find(demo("corners", k).raw, [3, 2, 1]);
      T.ok(c && c.at === "UFR" && c.whiteOn === w, `corners/${k}: the corner is at UFR with white facing ${w}`);
    });
    const shape = k => { const o = demo("ycross", k).o; return [1, 3, 5, 7].map(i => o[i] === 0 ? 1 : 0).join(""); };
    T.ok(shape(0) === "0110" && shape(1) === "1100" && shape(2) === "0000", "ycross: a line, an L at back-left, a dot");
    const home = (id, k, names) => { const p = C.llPermutation(demo(id, k)); return names.filter(n => p[n] === n).join(","); };
    T.ok(home("yedges", 0, ["UB","UR","UF","UL"]) === "UB,UR" && home("yedges", 1, ["UB","UR","UF","UL"]) === "UB,UF", "yedges: back+right, then front+back are home");
    T.ok(home("ycorners", 0, ["UBL","UBR","UFR","UFL"]) === "UFR" && home("ycorners", 1, ["UBL","UBR","UFR","UFL"]) === "", "ycorners: only UFR home, then none");
    const tw = demo("twist", 0).o;
    T.ok(["UBL","UBR","UFR","UFL"].filter(n => tw[POS[n][0]] !== 0).join(",") === "UBR,UFR", "twist: UBR and UFR are the twisted corners");
  }

  /* ---- the quiz region: orbit, plan, scoring -------------------------------- */
  function quiz(C, A, renderOLL, renderPLL, Q, T){
    const picture = (c, st) => c.stage === "oll" ? renderOLL(C.ollEnc(st), !!c.row.edges) : renderPLL(C.pllRing(st), null);
    const cases = Q.buildCases(A, { cube: C, picture });
    T.ok(cases.list.length === 16 && cases.ids.length === 16, `buildCases: 16 cases (got ${cases.list.length})`);
    const EXPECTED = { "oll.dot": 1, "oll.line": 2, "oll.h": 2 };
    for(const c of cases.list){
      const want = EXPECTED[c.id] || 4;
      const pics = c.orbit.map(p => picture(c, Q.stateFor(c, p.auf, C)));
      T.ok(c.orbit.length === want && new Set(pics).size === pics.length, `${c.id}: an orbit of ${want} distinct views (got ${c.orbit.length})`);
      T.ok(c.introDay !== null, `${c.id}: introduced on some day`);
      let inOrbit = true;
      for(const r of [0, 0.2, 0.4, 0.6, 0.8, 0.999]){
        const p = Q.presentation(c, () => r);
        if(!c.orbit.some(o => o.angle === p.angle && o.auf === p.auf)) inOrbit = false;
      }
      T.ok(inOrbit, `${c.id}: presentation() only ever draws from the orbit`);
    }
    T.ok(Q.plan(0) && Q.plan(0).kind === "T4" && Q.plan(0).mode === "execute" && !Q.gatesCross(0), "plan: day 1 executes crosses with the optimum available");
    T.ok([1,2,3,4,5,6].every(d => Q.plan(d) === null), "plan: days 2-7 have no quiz");
    T.ok([7,8,9,10,11,12,13,14,16,17,18,19].every(d => Q.plan(d) && Q.plan(d).kind === "T1"), "plan: days 8-15 and 17-20 are recognition drills");
    T.ok([21,22,23].every(d => Q.plan(d) && Q.plan(d).kind === "T4" && Q.plan(d).mode === "plan" && Q.gatesCross(d)), "plan: days 22-24 plan the cross and withhold the optimum");
    T.ok(Q.poolModeFor(13) === "blocked" && Q.poolModeFor(14) === "interleaved", "pool: blocked through day 14, interleaved from day 15");
    T.ok(JSON.stringify(Q.plan(10).newIds) === JSON.stringify(["oll.h", "oll.pi"]), "plan: day 11 introduces H and Pi");
    const rng = (() => { let a = 7; return () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; })();
    const s = Q.composeSession({ dayIndex: 16, cases, stats: {}, rand: rng });
    T.ok(s && s.items.length === s.n + s.reviewN && s.items.every(it => cases.byId.has(it.id)), "composeSession: day 17 yields n + review items, all known cases");
    T.ok(s && s.reviewN === Math.min(Math.round(0.3 * s.n), s.reviewPool.length), "composeSession: review adds to the prescription rather than eating it");
    const ev = t => ({ type:"recog", caseId:"oll.t", correct: t, ts: 1, latencyMs: 900 });
    const st = Q.statsFrom([ev(false), ev(false), ev(true), { type:"recog", caseId:"oll.h", correct:true, ts:2 }, { type:"cross", caseId:"cross.plan", correct:true, ts:3 }]);
    T.ok(st["oll.t"] && st["oll.t"].seen === 3 && Q.accuracyOf(st["oll.t"]) === 1/3 && !st["cross.plan"], "statsFrom folds recognition events per case and ignores the rest");
    T.ok(Q.rankForReview(["oll.h", "oll.t", "oll.pi"], st)[0] === "oll.pi" && Q.rankForReview(["oll.h", "oll.t"], st)[0] === "oll.t", "rankForReview: never seen first, then the weakest");
    const item = Q.makeRecogItem(cases.byId.get("oll.h"), { rand: rng, k: 4, pool: cases.ids, cases, poolMode:"interleaved" });
    T.ok(item.options.length === 4 && item.options.indexOf("oll.h") >= 0 && item.options.indexOf("oll.pi") >= 0, "makeRecogItem: four options including the answer and its confusable");
    T.ok(Q.scoreRecog(item, "oll.h").correct === true && Q.scoreRecog(item, item.options.find(o => o !== "oll.h")).correct === false, "scoreRecog judges the chosen option");
    const cross = (answer, optimum) => Q.scoreCross({ scramble: "F2 U R2", answer, optimum }, { cube: C });
    T.ok(cross("R U Q", 3).ok === false, "scoreCross rejects a typo instead of scoring it");
    T.ok(cross("R2 U' F2", 3).ok && cross("R2 U' F2", 3).solved === true && cross("R2 U' F2", 3).delta === 0, "scoreCross: the inverse of the scramble solves it at the optimum");
    T.ok(cross("R2 U' F2 M M'", 3).solved === true && cross("R2 U' F2 M M'", 3).comparable === false, "scoreCross: slices are judged but not compared");
    T.ok(!/solveCross|crossStateAfter/.test(String(Q.scoreCross)), "scoreCross has no path to the BFS solver (the typo-reads-as-solved trap)");
    const e = Q.eventFor(item, { day: 16, correct: true, latencyMs: 1234.4 });
    T.ok(e.type === "recog" && e.day === 16 && e.caseId === "oll.h" && e.view === "plan" && e.latencyMs === 1234, "eventFor builds a recog event from the item and the day it was mounted on");
  }

  /* ---- the event log and the storage wrapper ------------------------------ */
  function log(L, Store, T){
    let threw = false;
    try { L.normalise({ type:"nonesuch", day:0 }, 0); } catch(e){ threw = true; }
    T.ok(threw, "normalise rejects an unknown event type");
    const full = L.normalise({ ts: 1700000000123, day: 8, type:"recog", caseId:"oll.h", angle:0, auf:2, correct:false, latencyMs: 2100.6, view:"plan", extra:{ k:4 } }, 0);
    T.ok(JSON.stringify(L.dec(L.enc(full))) === JSON.stringify(full), "enc/dec round-trips a full event");
    const events = [full, L.normalise({ ts: 1700000000123, day: 8, type:"dayDone", correct:true }, 0), L.normalise({ ts: 1700000000200, day: 8, type:"dayDone", correct:false }, 0)];
    const profile = { id:"p1", name:"Self test" };
    const back = L.fromJSON(L.toJSON(profile, events, "2026-01-01T00:00:00.000Z"));
    T.ok(back.ok && back.profile.id === "p1" && JSON.stringify(back.events) === JSON.stringify(events), "toJSON/fromJSON round-trips events and profile");
    T.ok(L.fromJSON("{}").ok === false && L.fromJSON("not json").ok === false, "fromJSON refuses a foreign or broken file");
    T.ok(L.mergeEvents(events, events).added === 0 && L.mergeEvents([], events).events.length === 3, "mergeEvents keeps two events that share a millisecond and drops exact duplicates");
    T.ok(!L.doneFrom(events).has(8) && L.doneFrom(events.slice(0, 2)).has(8), "doneFrom: the last dayDone per day wins, so an undo unmarks");
    const csv = L.toCSV(profile, events);
    T.ok(csv.startsWith("event_id,ts_ms,ts_iso,") && csv.trim().split("\n").length === 4 && /,FALSE,/.test(csv), "toCSV: header plus one row per event, logicals as TRUE/FALSE");
    T.ok(typeof Store.ok === "boolean", "Store reports whether storage works");
    const k = "cfop.selftest";
    const wrote = Store.set(k, "1");
    T.ok(wrote === true && Store.get(k) === "1", "Store round-trips a value");
    Store.del(k);
    T.ok(Store.get(k) === null, "Store deletes a value");
  }

  function run(env){
    const T = collector();
    const C = env.CUBE;
    T.section("modules", () => {
      T.ok(!!C, "the cube engine is loaded");
    });
    if(!C) return T;
    T.section("engine", () => engine(C, T));
    if(env.ALGS) T.section("algorithms", () => algorithms(C, env.ALGS, T));
    if(env.ALGS && env.renderOLL && env.renderPLL) T.section("diagrams", () => diagrams(C, env.ALGS, env.renderOLL, env.renderPLL, T));
    if(env.CUBE3D) T.section("cube3d", () => cube3d(C, env.CUBE3D, T));
    if(env.NOTATION) T.section("notation", () => notation(C, env.NOTATION, T));
    if(env.STEPPER) T.section("stepper", () => stepper(C, env.STEPPER, T));
    if(env.BEGINNER) T.section("beginner", () => beginner(C, env.BEGINNER, T));
    if(env.QUIZ && env.ALGS && env.renderOLL && env.renderPLL) T.section("quiz", () => quiz(C, env.ALGS, env.renderOLL, env.renderPLL, env.QUIZ, T));
    if(env.LOG && env.Store) T.section("log", () => log(env.LOG, env.Store, T));
    return T;
  }
  return { run, EXPECT, collector, same };
})();
/*== SELFTEST:END ==*/

/* ---------------- the page part ----------------
   Gathers the modules by bare identifier — a top-level const in a classic
   script is not a window property — runs the pure suites, adds the checks only
   a page can make, and renders the panel above the page's own content. */
(function(){
  if(typeof document === "undefined") return;
  const $ = id => document.getElementById(id);
  const page = (location.pathname.split("/").pop() || "index.html");
  const g = (typeof globalThis !== "undefined" ? globalThis : window);
  const env = {
    CUBE:      typeof CUBE      !== "undefined" ? CUBE      : undefined,
    ALGS:      typeof ALGS      !== "undefined" ? ALGS      : undefined,
    renderOLL: typeof renderOLL !== "undefined" ? renderOLL : undefined,
    renderPLL: typeof renderPLL !== "undefined" ? renderPLL : undefined,
    LOG:       typeof LOG       !== "undefined" ? LOG       : undefined,
    Store:     typeof Store     !== "undefined" ? Store     : undefined,
    QUIZ:      typeof QUIZ      !== "undefined" ? QUIZ      : undefined,
    CUBE3D:    typeof CUBE3D    !== "undefined" ? CUBE3D    : undefined,
    cube3d:    typeof cube3d    !== "undefined" ? cube3d    : undefined,
    PAGE:      typeof PAGE      !== "undefined" ? PAGE      : undefined,
    NOTATION:  typeof NOTATION  !== "undefined" ? NOTATION  : undefined,
    STEPPER:   typeof STEPPER   !== "undefined" ? STEPPER   : undefined,
    stepper:   typeof stepper   !== "undefined" ? stepper   : undefined,
    BEGINNER:  typeof BEGINNER  !== "undefined" ? BEGINNER  : undefined
  };

  function pageChecks(T){
    const C = env.CUBE;
    T.section("page", () => {
      for(const name of (SELFTEST.EXPECT[page] || [])) T.ok(env[name] !== undefined, `${name} is loaded on ${page}`);
      T.ok(!!SELFTEST.EXPECT[page], `${page} is a page this self-test knows`);
      const theme = document.documentElement.getAttribute("data-theme");
      T.ok(theme === "light" || theme === "dark", `the theme attribute is set (${theme})`);
      const tb = $("themeToggle");
      T.ok(tb && (tb.textContent === "☀" || tb.textContent === "☾") && tb.getAttribute("aria-label"), "the theme toggle is labelled");
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
      T.ok(ink.length > 0, "app.css applied (--ink is defined)");
      const nav = [...document.querySelectorAll("nav.pages a")];
      const hrefs = nav.map(a => a.getAttribute("href"));
      T.ok(nav.length === 4 && ["index.html", "notation.html", "beginner.html", "lastlayer.html"].every(h => hrefs.indexOf(h) >= 0), "the page nav links all four pages");
      const current = nav.filter(a => a.getAttribute("aria-current") === "page");
      T.ok(current.length === 1 && current[0].getAttribute("href") === page, "exactly one nav link is marked current, and it is this page");
      T.ok(document.documentElement.scrollWidth <= window.innerWidth, `no horizontal overflow at ${window.innerWidth}px (scrollWidth ${document.documentElement.scrollWidth})`);
      const c3 = document.querySelector(".c3");
      if(c3){
        /* A coloured face carries the class "c0".."c5" as a whole token; the
           element class "c3-f" must not be read as colour 3. */
        const faces = [...c3.querySelectorAll(".c3-f")].map(f => (f.className.match(/(?:^|\s)c([0-5])(?=\s|$)/) || [])[1]).filter(v => v !== undefined);
        const counts = [0,0,0,0,0,0];
        faces.forEach(v => counts[Number(v)]++);
        T.ok(faces.length === 54 && counts.every(n => n === 9), `the 3D cube shows 54 stickers, nine of each colour (${counts.join(" ")})`);
        const scene = c3.querySelector(".c3-scene");
        T.ok(scene && getComputedStyle(scene).transformStyle === "preserve-3d", "cube3d.css applied (the scene preserves 3D)");
        let flat = null;
        for(let el = c3.parentElement; el && el !== document.documentElement; el = el.parentElement){
          const cs = getComputedStyle(el);
          if(cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden"){ flat = el; break; }
        }
        T.ok(!flat, "no ancestor of the 3D cube has overflow:hidden" + (flat ? ` (${flat.tagName.toLowerCase()}.${flat.className})` : ""));
        const cap = c3.querySelector(".c3-cap");
        T.ok(cap && /^Top \w+ · Front \w+ · Right \w+$/.test(cap.textContent), "the cube caption names top, front and right");
      }
      if(page === "index.html" && env.ALGS){
        T.ok(document.querySelectorAll(".sticker").length === 42 && document.querySelectorAll(".week").length === 6, "the grid shows 42 days in 6 weeks");
        T.ok(/of 42/.test(($("tally") || {}).textContent || ""), "the tally reads out of 42");
        T.ok(document.querySelectorAll(".tab").length === Object.keys(env.ALGS).length, "one tab per algorithm group");
        const sel = document.querySelector('.tab[aria-selected="true"]');
        const key = sel && Object.keys(env.ALGS).find(k => env.ALGS[k].label === sel.textContent);
        T.ok(key && document.querySelectorAll("#alist .arow").length === env.ALGS[key].rows.length, `the selected tab lists all its rows (${key})`);
        const ids = new Set([...env.ALGS.oll.rows, ...env.ALGS.pll.rows].map(r => r.id));
        const links = [...document.querySelectorAll(".stepl")];
        T.ok(links.length > 0 && links.every(a => { const m = a.getAttribute("href").match(/^lastlayer\.html\?case=(.+)$/); return m && ids.has(m[1]); }), "every step-through link names a known case");
        T.ok(!!$("quiz") && !!$("card") && !!$("scrambleMoves"), "the session card, scramble and trainer areas exist");
      }
      if(page === "notation.html" && env.NOTATION){
        const n = env.NOTATION.rows().length;
        T.ok(document.querySelectorAll(".nrow").length === n && document.querySelectorAll("[data-show]").length === n, `one row and one Show button per notation entry (${n})`);
        T.ok(["undo", "resetCube", "flip", "labels", "pstat", "cube"].every(id => !!$(id)), "the panel controls exist");
      }
      if(page === "lastlayer.html" && env.ALGS && C){
        const ids = [...env.ALGS.oll.rows, ...env.ALGS.pll.rows].map(r => r.id);
        const picks = [...document.querySelectorAll(".pick")];
        T.ok(picks.length === 16 && ids.every(id => picks.some(b => b.dataset.case === id)), "the picker offers all sixteen cases");
        const on = picks.filter(b => b.getAttribute("aria-pressed") === "true");
        const row = on.length === 1 && [...env.ALGS.oll.rows, ...env.ALGS.pll.rows].find(r => r.id === on[0].dataset.case);
        T.ok(!!row, "exactly one case is picked");
        if(row){
          const n = C.parseMoves(row.a).moves.length;
          T.ok(document.querySelectorAll(".strip li").length === n, `the strip has one item per move of ${row.id} (${n})`);
        }
        const hm = $("holdmsg");
        T.ok(hm && hm.classList.contains("ok") && /works as written/.test(hm.textContent), "the diagram's hold is reported as working");
        T.ok(($("pstat") || {}).textContent === "", "no verdict before the last move");
      }
      if(page === "beginner.html" && env.BEGINNER){
        const demos = env.BEGINNER.STAGES.reduce((n, s) => n + s.demos.length, 0);
        T.ok(document.querySelectorAll(".stage").length === 7 && document.querySelectorAll("[data-demo]").length === demos, `seven stage cards and ${demos} demo buttons`);
        T.ok(document.querySelectorAll('[data-demo][aria-pressed="true"]').length === 1 && document.querySelectorAll(".strip li").length >= 1, "one demo is selected and loaded into the strip");
        T.ok(/Stage \d of 7/.test(($("pprog") || {}).textContent || ""), "the progress line names the stage");
      }
    });
  }

  let box = null;
  function render(T){
    const failed = T.results.filter(r => !r.ok), total = T.results.length;
    if(!box){
      const style = document.createElement("style");
      style.textContent =
        `.selftest{margin:0 0 22px;padding:12px 14px;border:1px solid var(--hair,#ccc);border-radius:9px;background:var(--panel,#f4f4f4);color:var(--ink,#222);font:13px/1.5 var(--mono,ui-monospace,monospace);max-width:100%;overflow-wrap:anywhere}
         .selftest h2{font:700 14px var(--display,system-ui,sans-serif);margin:0 0 8px}
         .selftest.ok h2{color:var(--g,#090)} .selftest.bad h2{color:var(--r,#c00)}
         .selftest details{margin:3px 0} .selftest summary{cursor:pointer}
         .selftest ul{margin:2px 0 6px;padding:0} .selftest li{list-style:none;padding-left:1.6em;text-indent:-1.6em;margin:0}
         .selftest li.bad{color:var(--r,#c00)}`;
      document.head.appendChild(style);
      box = document.createElement("section");
      box.className = "selftest";
      box.setAttribute("role", "status");
      const wrap = document.querySelector(".wrap") || document.body;
      wrap.insertBefore(box, wrap.firstChild);
    }
    const bySuite = new Map();
    for(const r of T.results){ if(!bySuite.has(r.suite)) bySuite.set(r.suite, []); bySuite.get(r.suite).push(r); }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
    box.className = "selftest " + (failed.length ? "bad" : "ok");
    box.innerHTML =
      `<h2>${failed.length ? "✗" : "✓"} Self-test on ${esc(page)}: ${total} checks, ${failed.length} failed</h2>` +
      [...bySuite.entries()].map(([suite, rs]) => {
        const bad = rs.filter(r => !r.ok).length;
        return `<details${bad ? " open" : ""}><summary>${bad ? "✗" : "✓"} ${esc(suite)} — ${rs.length} checks${bad ? `, ${bad} failed` : ""}</summary><ul>` +
               rs.map(r => `<li class="${r.ok ? "ok" : "bad"}">${r.ok ? "✓" : "✗"} ${esc(r.msg)}</li>`).join("") + `</ul></details>`;
      }).join("");
    if(!/^[✓✗] /.test(document.title)) document.title = (failed.length ? "✗ " : "✓ ") + document.title;
    else document.title = (failed.length ? "✗" : "✓") + document.title.slice(1);
    if(failed.length) console.warn("selftest: " + failed.length + " failed", failed.map(f => f.suite + ": " + f.msg));
    else console.log("selftest: all " + total + " checks passed on " + page);
    return { page, total, failed: failed.length, results: T.results };
  }
  function runAll(){
    const T = SELFTEST.run(env);
    pageChecks(T);
    const summary = render(T);
    /* Live references, so the harness can break a module in place, rerun, and
       confirm the panel goes red — a negative control without editing files. */
    g.__selftest = Object.assign(summary, { env, rerun: runAll });
    return g.__selftest;
  }
  if(document.readyState === "complete") runAll();
  else window.addEventListener("load", runAll);
})();
