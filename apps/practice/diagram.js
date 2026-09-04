/* diagram.js — plan-view SVG renderers for the last layer, shared by
   index.html and lastlayer.html. Moved out of app.js verbatim;
   local/quiz_test.mjs slices on the sentinels. */
/*== DIAGRAM:BEGIN ==*/
/* ---------------- case diagrams ----------------
   A last-layer plan view: the 3x3 top face with a rim of 12 side stickers,
   drawn as a 5x5 grid with the corners left empty. Front face at the bottom.
   The geometry below is shared by both renderers.                        */
const D = { cell:11, gap:2, rim:4, pad:6, size:49 };
const uxy = (r,c) => [D.pad + c*(D.cell+D.gap), D.pad + r*(D.cell+D.gap)];
/* Rim slots run clockwise from the back-left: 0-2 back, 3-5 right,
   6-8 front, 9-11 left. Returns [x, y, width, height]. */
function rimRect(i){
  const s = D.pad + (i%3)*(D.cell+D.gap), e = D.size - D.rim;
  if(i<3)  return [s, 0, D.cell, D.rim];
  if(i<6)  return [e, D.pad + (i-3)*(D.cell+D.gap), D.rim, D.cell];
  if(i<9)  return [D.pad + (8-i)*(D.cell+D.gap), e, D.cell, D.rim];
  return [0, D.pad + (11-i)*(D.cell+D.gap), D.rim, D.cell];
}
const COLOUR = {B:"var(--b)",R:"var(--r)",G:"var(--g)",O:"var(--o)",Y:"var(--y)",W:"var(--w)"};
/* Custom properties resolve inside SVG presentation attributes, so the
   diagrams re-theme themselves with the rest of the page. */
const DULL = "var(--facelet-off)", DIM = "var(--facelet-dim)";
const svgOpen = `<svg viewBox="0 0 ${D.size} ${D.size}" role="img" focusable="false">`;
const rect = (x,y,w,h,fill,rx) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx||1.5}" fill="${fill}"/>`;

/* There is deliberately no holding-angle parameter here. Measured across all 16
   cases: rotating a plan view by a quarter turn produces exactly the picture
   some AUF already produces, so the two are not separable. The reason is that
   this view draws the U face and the 12 rim stickers but *not* the side
   centres — with no centre to be relative to, "the top layer turned" and "I am
   standing on a different side" are the same image. Turning the cube itself
   does not help either: orient() absorbs every whole-cube rotation by
   construction, so Cube.apply("y") cannot change the picture. Holding angle
   only becomes a real factor in a view that shows more than one face. */

/* OLL: `enc` is 21 chars — 3 back-rim, then (L,u0,u1,u2,R) per row, then 3
   front-rim. For the edge-orientation cases the corners are arbitrary, so we
   draw them dimmed rather than asserting a state that doesn't hold. */
function renderOLL(enc, edgesOnly){
  const u=[], rim=[];
  for(let r=0;r<3;r++){
    rim[r===0?11:(r===1?10:9)] = enc[3+r*5];
    for(let c=0;c<3;c++) u[r*3+c] = enc[4+r*5+c];
    rim[3+r] = enc[7+r*5];
  }
  for(let i=0;i<3;i++){ rim[i]=enc[i]; rim[8-i]=enc[18+i]; }
  const isCorner = i => i%2===0;                       // u-face corner indices 0,2,6,8
  const rimCorner = i => i%3!==1;                      // rim slots that touch a corner
  let out = svgOpen;
  for(let i=0;i<9;i++){
    if(i===4){ out += rect(...uxy(1,1), D.cell, D.cell, COLOUR.Y); continue; }  // centre is always yellow
    const arbitrary = edgesOnly && isCorner(i);
    out += rect(...uxy(Math.floor(i/3), i%3), D.cell, D.cell,
                arbitrary ? DIM : (u[i]==="1" ? COLOUR.Y : DULL));
  }
  for(let i=0;i<12;i++){
    const arbitrary = edgesOnly && rimCorner(i);
    const [x,y,w,h] = rimRect(i);
    out += rect(x,y,w,h, arbitrary ? DIM : (rim[i]==="1" ? COLOUR.Y : DULL), 1);
  }
  return out + "</svg>";
}

/* PLL: top face is fully yellow by this stage, so the rim carries the
   recognition and the arrows carry what the algorithm does. */
function renderPLL(ring, moves){
  let out = svgOpen;
  for(let r=0;r<3;r++) for(let c=0;c<3;c++)
    out += rect(...uxy(r,c), D.cell, D.cell, COLOUR.Y);   // fully oriented by this stage
  for(let i=0;i<12;i++){
    const [x,y,w,h] = rimRect(i);
    out += rect(x,y,w,h, COLOUR[ring[i]] || DULL, 1);
  }
  const centre = i => { const [x,y] = uxy(Math.floor(i/3), i%3);
                        return [x + D.cell/2, y + D.cell/2]; };
  const all = moves || [];
  const has = (a,b) => all.some(m => m[0]===a && m[1]===b);
  const head = (x,y,ux,uy) =>
    `<polygon points="${x.toFixed(1)},${y.toFixed(1)} ${(x-ux*3.4-uy*2.1).toFixed(1)},${(y-uy*3.4+ux*2.1).toFixed(1)} ${(x-ux*3.4+uy*2.1).toFixed(1)},${(y-uy*3.4-ux*2.1).toFixed(1)}" fill="var(--arrow)"/>`;
  const drawn = new Set();
  all.forEach(([a,b])=>{
    const swap = has(b,a);
    if(swap && drawn.has(b+"-"+a)) return;             // a mutual swap is one line
    drawn.add(a+"-"+b);
    const [x1,y1] = centre(a), [x2,y2] = centre(b);
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy) || 1;
    const ux = dx/len, uy = dy/len, back = 3.2;
    const sx = x1 + ux*back, sy = y1 + uy*back;
    const ex = x2 - ux*back, ey = y2 - uy*back;
    out += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--arrow)" stroke-width="1.6" stroke-linecap="round"/>`
         + head(ex,ey,ux,uy) + (swap ? head(sx,sy,-ux,-uy) : "");
  });
  return out + "</svg>";
}
/*== DIAGRAM:END ==*/
