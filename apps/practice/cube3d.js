/* cube3d.js — an animated 3D cube, hand-rolled in CSS transforms.
   Two parts. CUBE3D (between the sentinels) is pure geometry: where every
   facelet sits in space, which cubies a move takes with it, and about which
   axis they turn. local/cube3d_test.mjs proves that geometry against the
   engine's own permutation tables, so a sticker the view moves is a sticker the
   engine moves. cube3d (below the sentinels) is the DOM view. The engine's
   facelet array stays the source of truth: a turn is animated as a cosmetic
   rotation of the affected cubies, after which the whole cube is repainted from
   the post-move state. Needs engine.js loaded first. */
/*== CUBE3D:BEGIN ==*/
const CUBE3D = (function(){
  /* World frame: x right, y up, z towards the viewer (front). Cubies sit at
     integer positions in {-1,0,1}^3. Facelet i = base + 3*row + col, in the
     row/col conventions of verify_algs.py: U row 0 is the back, F row 0 is the
     top, R col 0 touches F, L col 2 touches F, B col 0 touches R, D row 0 is
     the front. */
  const FACE = [
    { base:0,  n:[0,1,0],  at:(r,c)=>[c-1, 1, r-1] },   // U
    { base:9,  n:[1,0,0],  at:(r,c)=>[1, 1-r, 1-c] },   // R
    { base:18, n:[0,0,1],  at:(r,c)=>[c-1, 1-r, 1] },   // F
    { base:27, n:[0,-1,0], at:(r,c)=>[c-1, -1, 1-r] },  // D
    { base:36, n:[-1,0,0], at:(r,c)=>[-1, 1-r, c-1] },  // L
    { base:45, n:[0,0,-1], at:(r,c)=>[1-c, 1-r, -1] }   // B
  ];
  const STICKERS = [];
  for(let f=0; f<6; f++)
    for(let r=0; r<3; r++)
      for(let c=0; c<3; c++)
        STICKERS[FACE[f].base + 3*r + c] = { i: FACE[f].base + 3*r + c, face:f, pos:FACE[f].at(r,c), n:FACE[f].n };
  const key = (pos, n) => pos.join(",") + "|" + n.join(",");
  const BY_KEY = new Map(STICKERS.map(s => [key(s.pos, s.n), s.i]));

  const CUBIES = [];
  for(let z=-1; z<=1; z++) for(let y=-1; y<=1; y++) for(let x=-1; x<=1; x++)
    if(x || y || z) CUBIES.push([x,y,z]);

  /* The face whose *direction* a move follows: M turns like L, E like D, S like
     F; a wide turn like its face; a rotation like the face on its axis. */
  const N = { U:[0,1,0], D:[0,-1,0], R:[1,0,0], L:[-1,0,0], F:[0,0,1], B:[0,0,-1] };
  const AXIS = { U:N.U, D:N.D, R:N.R, L:N.L, F:N.F, B:N.B,
                 M:N.L, E:N.D, S:N.F,
                 u:N.U, d:N.D, r:N.R, l:N.L, f:N.F, b:N.B,
                 x:N.R, y:N.U, z:N.F };
  /* Which cubies a move carries, by position. */
  const LAYER = {
    U: p => p[1]===1,  D: p => p[1]===-1, R: p => p[0]===1,  L: p => p[0]===-1,
    F: p => p[2]===1,  B: p => p[2]===-1,
    M: p => p[0]===0,  E: p => p[1]===0,  S: p => p[2]===0,
    u: p => p[1]>=0,   d: p => p[1]<=0,   r: p => p[0]>=0,   l: p => p[0]<=0,
    f: p => p[2]>=0,   b: p => p[2]<=0,
    x: () => true, y: () => true, z: () => true
  };

  /* One clockwise quarter turn about `a`, clockwise as seen from outside the
     face `a` points at. In a right-handed frame that is a rotation of -90°
     about a, which for a unit axis is v' = (v·a)a + v×a. */
  function rot90(v, a){
    const d = v[0]*a[0] + v[1]*a[1] + v[2]*a[2];
    return [ d*a[0] + (v[1]*a[2] - v[2]*a[1]),
             d*a[1] + (v[2]*a[0] - v[0]*a[2]),
             d*a[2] + (v[0]*a[1] - v[1]*a[0]) ];
  }
  const rotq = (v, a, q) => { let out = v; for(let k=0;k<q;k++) out = rot90(out, a); return out; };

  /* What the view needs to animate [base, q]: the axis, the cubies, and the
     signed angle. A prime turns -90° rather than +270°, so the picture turns
     the short way, which is the way a hand turns it. */
  function turn(base, q){
    return { axis: AXIS[base], sel: LAYER[base], deg: q===3 ? -90 : 90*q };
  }
  /* The facelet index sticker i occupies after the move, or undefined if the
     geometry is inconsistent — the test asserts it never is. */
  function movedTo(i, base, q){
    const s = STICKERS[i], a = AXIS[base];
    if(!LAYER[base](s.pos)) return i;
    return BY_KEY.get(key(rotq(s.pos, a, q), rotq(s.n, a, q)));
  }
  return { STICKERS, CUBIES, AXIS, LAYER, rot90, rotq, turn, movedTo, key };
})();
/*== CUBE3D:END ==*/

/* ---------------- the view ----------------
   Builds DOM, so it is not pure. One instance per mount; several on a page are
   fine, but each is 26 cubies x 6 faces of transformed divs, so a page with
   thirty of them is not — share one and repaint it instead. Never mount inside
   an ancestor with overflow:hidden: it flattens preserve-3d in Safari. */
const cube3d = (function(){
  /* Face divs sit on the +z side of their cubie and are rotated into place.
     CSS y points down, so world (x, y, z) is CSS (x, -y, z). */
  const FACE_CSS = { "1,0,0":"rotateY(90deg)", "-1,0,0":"rotateY(-90deg)",
                     "0,1,0":"rotateX(90deg)", "0,-1,0":"rotateX(-90deg)",
                     "0,0,1":"", "0,0,-1":"rotateY(180deg)" };
  const NORMALS = Object.keys(FACE_CSS).map(k => k.split(",").map(Number));
  const LABEL = { "0,1,0":"U", "1,0,0":"R", "0,0,1":"F", "0,-1,0":"D", "-1,0,0":"L", "0,0,-1":"B" };
  const NAME = ["yellow","red","green","white","orange","blue"];   // by facelet value, as CUBE.LETTER
  const VIEWS = { front:{rx:-25, ry:-35}, back:{rx:-25, ry:145}, bottom:{rx:30, ry:-35}, left:{rx:-25, ry:35} };
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function mount(el, opts){
    const o = Object.assign({ size:150, view:"front", labels:true, ms:320 }, opts || {});
    const s = Math.round(o.size / 3);
    el.classList.add("c3");
    el.classList.toggle("labels", !!o.labels);
    el.innerHTML = "";
    const vp = document.createElement("div");
    vp.className = "c3-viewport";
    vp.style.width = vp.style.height = Math.round(o.size * 1.7) + "px";
    const scene = document.createElement("div");
    scene.className = "c3-scene";
    vp.appendChild(scene);
    el.appendChild(vp);
    const cap = document.createElement("div");
    cap.className = "c3-cap";
    el.appendChild(cap);

    const baseT = pos => `translate3d(${pos[0]*s}px,${-pos[1]*s}px,${pos[2]*s}px)`;
    const cubies = new Map();
    for(const pos of CUBE3D.CUBIES){
      const c = document.createElement("div");
      c.className = "c3-cubie";
      c.style.width = c.style.height = s + "px";
      c.style.left = c.style.top = (-s/2) + "px";
      c.style.transform = baseT(pos);
      const faces = new Map();
      for(const n of NORMALS){
        const f = document.createElement("div");
        f.className = "c3-f";
        f.style.transform = FACE_CSS[n.join(",")] + ` translateZ(${s/2}px)`;
        c.appendChild(f);
        faces.set(n.join(","), f);
      }
      scene.appendChild(c);
      cubies.set(pos.join(","), { el:c, pos, faces });
    }
    const faceEl = CUBE3D.STICKERS.map(st => cubies.get(st.pos.join(",")).faces.get(st.n.join(",")));
    /* Letters on the six centre *positions*. They belong to the frame, not the
       colour: after a y the front position still reads F and shows whatever
       colour has arrived there — which is the holding angle made visible. */
    for(const st of CUBE3D.STICKERS){
      if(st.i % 9 !== 4) continue;
      const lab = document.createElement("span");
      lab.className = "c3-lab";
      lab.style.fontSize = Math.round(s * 0.5) + "px";
      lab.textContent = LABEL[st.n.join(",")];
      faceEl[st.i].appendChild(lab);
    }

    let cur = CUBE.SOLVED.slice();
    function paint(raw){
      cur = raw;
      for(let i=0;i<54;i++) faceEl[i].className = "c3-f c" + raw[i];
      cap.textContent = `Top ${NAME[raw[4]]} · Front ${NAME[raw[22]]} · Right ${NAME[raw[13]]}`;
    }
    function setView(v){
      const a = typeof v === "string" ? VIEWS[v] || VIEWS.front : v;
      scene.style.transform = `rotateX(${a.rx}deg) rotateY(${a.ry}deg)`;
    }
    const cssAxis = t => `${t.axis[0]},${-t.axis[1]},${t.axis[2]}`;
    const layerOf = t => [...cubies.values()].filter(c => t.sel(c.pos));

    /* Wait for the transition, or for a timer if it never fires: under
       prefers-reduced-motion app.css disables every transition with !important,
       and a background tab may not run them either. */
    function settled(node, ms){
      return new Promise(res => {
        let done = false;
        const fin = () => { if(done) return; done = true; node.removeEventListener("transitionend", fin); clearTimeout(tm); res(); };
        const tm = setTimeout(fin, ms + 80);
        node.addEventListener("transitionend", fin);
      });
    }
    let chain = Promise.resolve();
    async function doPlay(move, ms){
      const [base, q] = move;
      const t = CUBE3D.turn(base, q);
      const dur = ms == null ? o.ms : ms;
      const next = CUBE.applyMoves(cur, [[base, q]]);
      if(dur > 0 && !reduced()){
        const els = layerOf(t), a = cssAxis(t);
        for(const c of els){ c.el.style.transition = "none"; c.el.style.transform = `rotate3d(${a},0deg) ` + baseT(c.pos); }
        void scene.offsetHeight;
        for(const c of els){ c.el.style.transition = `transform ${dur}ms cubic-bezier(.3,.5,.3,1)`; c.el.style.transform = `rotate3d(${a},${t.deg}deg) ` + baseT(c.pos); }
        await settled(els[0].el, dur);
        for(const c of els){ c.el.style.transition = "none"; c.el.style.transform = baseT(c.pos); }
        paint(next);
        void scene.offsetHeight;
        for(const c of els) c.el.style.transition = "";
      } else {
        paint(next);
      }
      return cur;
    }
    /* Serialised: a second play() queues behind the first rather than
       interleaving two half-turned layers. */
    function play(move, ms){ chain = chain.then(() => doPlay(move, ms), () => doPlay(move, ms)); return chain; }
    /* A frozen mid-turn, for checking the sense of rotation by eye. Not
       repainted, not animated; the next paint() or play() clears it. */
    function pose(move, deg){
      const t = CUBE3D.turn(move[0], move[1]), a = cssAxis(t);
      for(const c of layerOf(t)){ c.el.style.transition = "none"; c.el.style.transform = `rotate3d(${a},${deg}deg) ` + baseT(c.pos); }
    }

    setView(o.view);
    paint(cur);
    return {
      el, set: paint, state: () => cur, play, pose, setView,
      setLabels(on){ el.classList.toggle("labels", !!on); },
      destroy(){ el.innerHTML = ""; el.classList.remove("c3", "labels"); }
    };
  }
  return { mount, VIEWS, NAME };
})();
