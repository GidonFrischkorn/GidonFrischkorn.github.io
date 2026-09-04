/* engine.js — the cube engine, shared by every page under apps/practice/.
   Loaded as a classic script before app.js and the page scripts, so the
   top-level `CUBE` it declares is visible to them. Moved out of app.js
   verbatim; the sentinels are what local/engine_test.mjs and
   local/quiz_test.mjs slice on. */
/*== ENGINE:BEGIN ==*/
/* Facelet cube engine. Pure: no DOM, no storage, no globals beyond CUBE, so it
   can be extracted and tested headlessly (see local/engine_test.mjs).

   Ported from local/verify_algs.py. The permutation tables below were GENERATED
   by that module (`python3 local/verify_algs.py --json`) rather than written by
   hand, so they inherit its group-theoretic verification instead of needing
   their own.

   Layout: 54 stickers — U 0-8, R 9-17, F 18-26, D 27-35, L 36-44, B 45-53 —
   each face row-major in the conventions documented in verify_algs.py.
   Values are the sticker's home face: 0=U 1=R 2=F 3=D 4=L 5=B.

   Everything downstream compares cubes through `orient()`, which re-expresses a
   state in the frame its own centres define. That is what makes whole-cube
   rotations invisible and slice moves safe: a cube is "solved" if it looks
   solved to someone holding it, not if it matches a fixed colour table. */
const CUBE = (function(){
  const N = 54;
  const SOLVED = new Uint8Array(N);
  for(let i=0;i<N;i++) SOLVED[i] = (i/9)|0;
  const LETTER = ["Y","R","G","W","O","B"];
  const CENTRE = [4, 13, 22, 31, 40, 49];          // U R F D L B

  const PERM = {
    U:  [6,3,0,7,4,1,8,5,2,45,46,47,12,13,14,15,16,17,9,10,11,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,18,19,20,39,40,41,42,43,44,36,37,38,48,49,50,51,52,53],
    D:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,24,25,26,18,19,20,21,22,23,42,43,44,33,30,27,34,31,28,35,32,29,36,37,38,39,40,41,51,52,53,45,46,47,48,49,50,15,16,17],
    R:  [0,1,20,3,4,23,6,7,26,15,12,9,16,13,10,17,14,11,18,19,29,21,22,32,24,25,35,27,28,51,30,31,48,33,34,45,36,37,38,39,40,41,42,43,44,8,46,47,5,49,50,2,52,53],
    L:  [53,1,2,50,4,5,47,7,8,9,10,11,12,13,14,15,16,17,0,19,20,3,22,23,6,25,26,18,28,29,21,31,32,24,34,35,42,39,36,43,40,37,44,41,38,45,46,33,48,49,30,51,52,27],
    F:  [0,1,2,3,4,5,44,41,38,6,10,11,7,13,14,8,16,17,24,21,18,25,22,19,26,23,20,15,12,9,30,31,32,33,34,35,36,37,27,39,40,28,42,43,29,45,46,47,48,49,50,51,52,53],
    B:  [11,14,17,3,4,5,6,7,8,9,10,35,12,13,34,15,16,33,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,36,39,42,2,37,38,1,40,41,0,43,44,51,48,45,52,49,46,53,50,47],
    M:  [0,52,2,3,49,5,6,46,8,9,10,11,12,13,14,15,16,17,18,1,20,21,4,23,24,7,26,27,19,29,30,22,32,33,25,35,36,37,38,39,40,41,42,43,44,45,34,47,48,31,50,51,28,53],
    E:  [0,1,2,3,4,5,6,7,8,9,10,11,21,22,23,15,16,17,18,19,20,39,40,41,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,48,49,50,42,43,44,45,46,47,12,13,14,51,52,53],
    S:  [0,1,2,43,40,37,6,7,8,9,3,11,12,4,14,15,5,17,18,19,20,21,22,23,24,25,26,27,28,29,16,13,10,33,34,35,36,30,38,39,31,41,42,32,44,45,46,47,48,49,50,51,52,53],
    r:  [0,19,20,3,22,23,6,25,26,15,12,9,16,13,10,17,14,11,18,28,29,21,31,32,24,34,35,27,52,51,30,49,48,33,46,45,36,37,38,39,40,41,42,43,44,8,7,47,5,4,50,2,1,53],
    l:  [53,52,2,50,49,5,47,46,8,9,10,11,12,13,14,15,16,17,0,1,20,3,4,23,6,7,26,18,19,29,21,22,32,24,25,35,42,39,36,43,40,37,44,41,38,45,34,33,48,31,30,51,28,27],
    u:  [6,3,0,7,4,1,8,5,2,45,46,47,48,49,50,15,16,17,9,10,11,12,13,14,24,25,26,27,28,29,30,31,32,33,34,35,18,19,20,21,22,23,42,43,44,36,37,38,39,40,41,51,52,53],
    d:  [0,1,2,3,4,5,6,7,8,9,10,11,21,22,23,24,25,26,18,19,20,39,40,41,42,43,44,33,30,27,34,31,28,35,32,29,36,37,38,48,49,50,51,52,53,45,46,47,12,13,14,15,16,17],
    f:  [0,1,2,43,40,37,44,41,38,6,3,11,7,4,14,8,5,17,24,21,18,25,22,19,26,23,20,15,12,9,16,13,10,33,34,35,36,30,27,39,31,28,42,32,29,45,46,47,48,49,50,51,52,53],
    b:  [11,14,17,10,13,16,6,7,8,9,32,35,12,31,34,15,30,33,18,19,20,21,22,23,24,25,26,27,28,29,37,40,43,36,39,42,2,5,38,1,4,41,0,3,44,51,48,45,52,49,46,53,50,47],
    x:  [18,19,20,21,22,23,24,25,26,15,12,9,16,13,10,17,14,11,27,28,29,30,31,32,33,34,35,53,52,51,50,49,48,47,46,45,38,41,44,37,40,43,36,39,42,8,7,6,5,4,3,2,1,0],
    y:  [6,3,0,7,4,1,8,5,2,45,46,47,48,49,50,51,52,53,9,10,11,12,13,14,15,16,17,29,32,35,28,31,34,27,30,33,18,19,20,21,22,23,24,25,26,36,37,38,39,40,41,42,43,44],
    z:  [42,39,36,43,40,37,44,41,38,6,3,0,7,4,1,8,5,2,24,21,18,25,22,19,26,23,20,15,12,9,16,13,10,17,14,11,33,30,27,34,31,28,35,32,29,47,50,53,46,49,52,45,48,51]
  };

  /* next[i] = cur[p[i]] */
  function applyPerm(a, p){
    const out = new Uint8Array(N);
    for(let i=0;i<N;i++) out[i] = a[p[i]];
    return out;
  }
  /* apply p, then q */
  function composePerm(p, q){
    const out = new Array(N);
    for(let i=0;i<N;i++) out[i] = p[q[i]];
    return out;
  }
  function invertPerm(p){
    const out = new Array(N);
    for(let i=0;i<N;i++) out[p[i]] = i;
    return out;
  }
  const IDENT = Array.from({length:N}, (_,i)=>i);
  function powPerm(p, n){
    let out = IDENT;
    for(let i=0;i<n;i++) out = composePerm(out, p);
    return out;
  }

  /* ---- the 24 orientations, generated by composing x and y ---- */
  const ROT24 = (function(){
    const seen = new Map([[IDENT.join(","), IDENT]]);
    const queue = [IDENT];
    while(queue.length){
      const g = queue.shift();
      for(const m of ["x","y"]){
        const h = composePerm(g, PERM[m]);
        const k = h.join(",");
        if(!seen.has(k)){ seen.set(k, h); queue.push(h); }
      }
    }
    return [...seen.values()];
  })();
  /* centre signature of a rotated solved cube -> the inverse rotation */
  const BY_SIG = (function(){
    const m = new Map();
    for(const g of ROT24){
      const rotated = applyPerm(SOLVED, g);
      const sig = CENTRE.map(i=>rotated[i]).join("");
      if(!m.has(sig)) m.set(sig, invertPerm(g));
    }
    return m;
  })();

  /* Re-express a state in the frame its own centres define. */
  function orient(raw){
    const sig = CENTRE.map(i=>raw[i]).join("");
    const inv = BY_SIG.get(sig);
    return inv ? applyPerm(raw, inv) : raw;
  }

  /* ---- notation ----
     Strict and anchored: the old regex scanned past anything it did not
     recognise, so `Rw U R'` silently became `R U R'` — a learner's correct wide
     move executed as a different algorithm and marked wrong with no
     explanation. This never throws; it reports where it failed. */
  const FACES6 = "UDRLFB", SLICES = "MES", WIDES = "rlufdb", ROTS = "xyz";
  const WIDE_OF = {U:"u",D:"d",R:"r",L:"l",F:"f",B:"b"};
  const SEP = " \t\n\r·,";

  function parseMoves(text){
    const moves = [];
    const s = String(text == null ? "" : text);
    let i = 0;
    while(i < s.length){
      if(SEP.indexOf(s[i]) >= 0){ i++; continue; }
      const start = i;
      let base = s[i];
      if(FACES6.indexOf(base) >= 0){
        i++;
        if(s[i] === "w" || s[i] === "W"){ base = WIDE_OF[base]; i++; }
      } else if(SLICES.indexOf(base) >= 0 || WIDES.indexOf(base) >= 0 || ROTS.indexOf(base) >= 0){
        i++;
        if(s[i] === "w" || s[i] === "W")
          return { ok:false, at:i, token:s.slice(start, i+1),
                   why:"only face turns take a w (Rw); " + base + " is already a slice or rotation" };
      } else {
        return { ok:false, at:start, token:base,
                 why:"not a move — expected one of U D R L F B M E S x y z, or a wide turn like Rw" };
      }
      let q = 1;
      if(s[i] === "2"){ q = 2; i++; if(s[i] === "'"){ q = 2; i++; } }
      else if(s[i] === "'"){ q = 3; i++; }
      else if(s[i] === "3"){ q = 3; i++; }
      if(s[i] && SEP.indexOf(s[i]) < 0 && !PERM[s[i]] && FACES6.indexOf(s[i]) < 0)
        return { ok:false, at:i, token:s.slice(start, i+1),
                 why:"unexpected '" + s[i] + "' after " + base };
      moves.push([base, q]);
    }
    if(!moves.length) return { ok:false, at:0, token:"", why:"no moves given" };
    return { ok:true, moves:moves };
  }

  function applyMoves(raw, moves){
    let out = raw;
    for(const [base, q] of moves) out = applyPerm(out, powPerm(PERM[base], q));
    return out;
  }
  function invertMoves(moves){
    return moves.slice().reverse().map(([b,q]) => [b, (4-q)%4]).filter(m => m[1] !== 0);
  }
  function fmtMoves(moves){
    return moves.map(([b,q]) => b + (q===2 ? "2" : q===3 ? "'" : "")).join(" ");
  }

  /* ---- facelet index lists, matching verify_algs.py's conventions ---- */
  const OLL_TOP = [47,46,45], OLL_BOT = [18,19,20];
  const OLL_L = [36,37,38], OLL_R = [11,10,9];
  const PLL_RING = [47,46,45, 11,10,9, 20,19,18, 38,37,36];
  const CROSS = [[28,3],[30,3],[32,3],[34,3],[25,2],[16,1],[52,5],[43,4]];
  const SLOTS = {
    FR:[[29,3],[26,2],[15,1],[23,2],[12,1]],
    FL:[[27,3],[24,2],[44,4],[21,2],[41,4]],
    BL:[[33,3],[42,4],[53,5],[39,4],[50,5]],
    BR:[[35,3],[17,1],[51,5],[14,1],[48,5]]
  };
  const LL_CORNERS = { UBL:[0,47,36], UBR:[2,45,11], UFR:[8,9,20], UFL:[6,18,38] };
  const LL_EDGES   = { UB:[1,46], UR:[5,10], UF:[7,19], UL:[3,37] };
  const HOME = { "0,4,5":"UBL", "0,1,5":"UBR", "0,1,2":"UFR", "0,2,4":"UFL",
                 "0,5":"UB", "0,1":"UR", "0,2":"UF", "0,4":"UL" };
  const GRID = { UBL:0, UB:1, UBR:2, UL:3, UR:5, UFL:6, UF:7, UFR:8 };

  function Cube(raw){
    let _o = null, _k = null;
    const api = {
      raw: raw,                                  // RENDERING ONLY
      get o(){ return _o || (_o = orient(raw)); },
      get key(){ return _k || (_k = Array.from(api.o).join("")); },
      /* Returns null on a parse error so callers can report it. An empty or
         separator-only string is the identity, not an error — parseMoves
         rejects it because blank *user input* is a mistake, but applying no
         moves is perfectly well defined. */
      apply(alg){
        if(typeof alg === "string" && !alg.trim()) return api;
        const p = typeof alg === "string" ? parseMoves(alg) : { ok:true, moves:alg };
        return p.ok ? Cube(applyMoves(raw, p.moves)) : null;
      }
    };
    return api;
  }
  Cube.solved = () => Cube(SOLVED.slice());
  /* The state an algorithm solves: run it backwards from solved. */
  Cube.setup = function(alg){
    const p = parseMoves(alg);
    return p.ok ? Cube(applyMoves(SOLVED.slice(), invertMoves(p.moves))) : null;
  };

  const at = (c, i) => c.o[i];
  const allAre = (c, pairs) => pairs.every(([i, v]) => c.o[i] === v);

  const crossSolved      = c => allAre(c, CROSS);
  const f2lSlotSolved    = (c, s) => allAre(c, SLOTS[s]);
  const f2lDone          = c => crossSolved(c) && Object.keys(SLOTS).every(s => f2lSlotSolved(c, s));
  const ollDone          = c => { for(let i=0;i<9;i++) if(c.o[i] !== 0) return false; return true; };
  const ollEdgesDone     = c => [1,3,5,7].every(i => c.o[i] === 0);
  const isSolved         = c => { const o = c.o; for(let i=0;i<N;i++) if(o[i] !== SOLVED[i]) return false; return true; };
  function solvedUpToAUF(c){
    for(let k=0;k<4;k++) if(isSolved(Cube(applyPerm(c.o, powPerm(PERM.U, k))))) return k;
    return -1;
  }

  const yn = v => v === 0 ? "1" : "0";
  function ollEnc(c){
    const o = c.o;
    let s = OLL_TOP.map(i => yn(o[i])).join("");
    for(let r=0;r<3;r++){
      s += yn(o[OLL_L[r]]);
      for(let cc=0;cc<3;cc++) s += yn(o[r*3+cc]);
      s += yn(o[OLL_R[r]]);
    }
    return s + OLL_BOT.map(i => yn(o[i])).join("");
  }
  const pllRing = c => PLL_RING.map(i => LETTER[c.o[i]]).join("");

  function llPermutation(c){
    const o = c.o, out = {};
    for(const [slot, idx] of Object.entries(LL_CORNERS))
      out[slot] = HOME[idx.map(i=>o[i]).sort((a,b)=>a-b).join(",")];
    for(const [slot, idx] of Object.entries(LL_EDGES))
      out[slot] = HOME[idx.map(i=>o[i]).sort((a,b)=>a-b).join(",")];
    return out;
  }
  function pllArrows(c){
    const p = llPermutation(c), out = [];
    for(const [slot, home] of Object.entries(p))
      if(home && home !== slot) out.push([GRID[slot], GRID[home]]);
    return out;
  }

  /* Does `alg` solve `state`? Sweep holding angle x AUF: a learner who knows a
     different-but-correct algorithm, or holds the cube a quarter turn round,
     is right. A wrong algorithm still fails all sixteen. */
  function solvesCase(state, alg, predicate){
    const p = parseMoves(alg);
    if(!p.ok) return { ok:false, parse:p };
    for(let hold=0; hold<4; hold++){
      for(let auf=0; auf<4; auf++){
        let c = Cube(applyPerm(state.o, powPerm(PERM.y, hold)));
        c = Cube(applyPerm(c.raw, powPerm(PERM.U, auf)));
        const end = Cube(applyMoves(c.raw, p.moves));
        if(predicate(end)) return { ok:true, hold, auf, end,
                                    quarters:p.moves.reduce((n,m)=>n+m[1],0) };
      }
    }
    return { ok:false, end:Cube(applyMoves(state.raw, p.moves)),
             quarters:p.moves.reduce((n,m)=>n+m[1],0) };
  }

  return { N, SOLVED, LETTER, PERM, ROT24, applyPerm, composePerm, invertPerm,
           powPerm, orient, parseMoves, applyMoves, invertMoves, fmtMoves, Cube,
           crossSolved, f2lSlotSolved, f2lDone, ollDone, ollEdgesDone, isSolved,
           solvedUpToAUF, ollEnc, pllRing, llPermutation, pllArrows, solvesCase };
})();
/*== ENGINE:END ==*/
