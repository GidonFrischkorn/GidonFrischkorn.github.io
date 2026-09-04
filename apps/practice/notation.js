/* notation.js — the move vocabulary, as data. notation.html renders it; the
   steppers on every page use describeMove() for their status line. Pure;
   local/notation_test.mjs checks each demo parses and every move base the
   engine knows has a row. */
/*== NOTATION:BEGIN ==*/
const NOTATION = (function(){
  /* One rule underlies all of it: a letter names a layer, and a bare letter is a
     quarter turn clockwise *as you look at that face*. Everything a learner
     gets wrong follows from forgetting the second half — D and B look
     anticlockwise from the front because you are not looking at them. */
  const GROUPS = [
    { id:"faces", h:"The six faces",
      p:"A capital letter is one of the six outer layers. On its own it means a quarter turn clockwise, judged as if you were looking straight at that face. That is why D and B seem to turn the wrong way when you watch them from the front: you are seeing them from behind.",
      rows:[
        { token:"U", name:"Up",    how:"The top layer, clockwise as seen from above.", demo:"U" },
        { token:"D", name:"Down",  how:"The bottom layer, clockwise as seen from below — which from above looks anticlockwise.", demo:"D", view:"bottom" },
        { token:"R", name:"Right", how:"The right layer, clockwise as seen from the right: the front goes up.", demo:"R" },
        { token:"L", name:"Left",  how:"The left layer, clockwise as seen from the left: the front goes down.", demo:"L", view:"left" },
        { token:"F", name:"Front", how:"The front layer, clockwise as you look at it: the top goes to the right.", demo:"F" },
        { token:"B", name:"Back",  how:"The back layer, clockwise as seen from behind — from the front it looks anticlockwise: the top goes to the left.", demo:"B", view:"back" }
      ]},
    { id:"modifiers", h:"Primes and doubles",
      p:"A prime (′, written as an apostrophe) reverses the direction: anticlockwise as you look at that face. A 2 is a half turn, and for a half turn the direction makes no difference.",
      rows:[
        { token:"U'", name:"U prime", how:"The top layer, anticlockwise as seen from above.", demo:"U'" },
        { token:"R'", name:"R prime", how:"The right layer, anticlockwise from the right: the front comes down.", demo:"R'" },
        { token:"F'", name:"F prime", how:"The front layer, anticlockwise: the top goes to the left.", demo:"F'" },
        { token:"U2", name:"U two",   how:"The top layer, a half turn. Either way round.", demo:"U2" },
        { token:"R2", name:"R two",   how:"The right layer, a half turn.", demo:"R2" }
      ]},
    { id:"slices", h:"Slice moves",
      p:"The three middle layers have their own letters. Each borrows its direction from one of the faces next to it, and that is the whole difficulty: M turns the way L turns, E the way D turns, S the way F turns.",
      rows:[
        { token:"M",  name:"Middle",   how:"The layer between L and R, turned the way L turns: the top comes down the front, towards you.", demo:"M" },
        { token:"M'", name:"M prime",  how:"The same layer the other way: the front goes up over the top. This is the one most algorithms use, so check which you are doing.", demo:"M'" },
        { token:"M2", name:"M two",    how:"A half turn of the middle layer. The M-slice PLL algorithms are mostly this.", demo:"M2" },
        { token:"E",  name:"Equator",  how:"The layer between U and D, turned the way D turns: the front goes to the right, which from above looks anticlockwise.", demo:"E" },
        { token:"S",  name:"Standing", how:"The layer between F and B, turned the way F turns: the top goes to the right.", demo:"S" }
      ]},
    { id:"wide", h:"Wide turns",
      p:"A lowercase letter, or the capital with a w, turns two layers together: the face and the slice next to it. So r is R and the middle layer moving as one, the same as R followed by M′. A wide turn that slips into a single-layer turn scrambles the cube in a confusing way, so check your grip before you start an algorithm that has one.",
      rows:[
        { token:"r",  name:"r, also written Rw", how:"The right two layers, clockwise from the right. Same result as R M'.", demo:"r" },
        { token:"r'", name:"r prime",  how:"The right two layers, anticlockwise from the right. Same as R' M.", demo:"r'" },
        { token:"l",  name:"l, also written Lw", how:"The left two layers, clockwise from the left. Same as L M.", demo:"l", view:"left" },
        { token:"f",  name:"f, also written Fw", how:"The front two layers, clockwise as you look at them. Same as F S. The L-shape OLL uses this one.", demo:"f" },
        { token:"u",  name:"u, also written Uw", how:"The top two layers, clockwise from above. Same as U E'.", demo:"u" },
        { token:"d",  name:"d, also written Dw", how:"The bottom two layers, clockwise from below.", demo:"d", view:"bottom" },
        { token:"b",  name:"b, also written Bw", how:"The back two layers, clockwise from behind.", demo:"b", view:"back" }
      ]},
    { id:"rotations", h:"Turning the whole cube",
      p:"x, y and z turn the cube in your hands without turning any layer. Nothing about the puzzle changes; only what counts as front and top. Each follows one face's direction: x turns the way R turns, y the way U turns, z the way F turns. The letters on the centres stay put in the picture, so after a y the F position shows a different colour — that is the point.",
      rows:[
        { token:"x",  name:"x rotation",  how:"The whole cube the way R turns: the front face comes to the top.", demo:"x" },
        { token:"x'", name:"x prime",     how:"The whole cube the other way: the top face comes to the front.", demo:"x'" },
        { token:"y",  name:"y rotation",  how:"The whole cube the way U turns: the right face comes to the front.", demo:"y" },
        { token:"y'", name:"y prime",     how:"The whole cube the other way: the left face comes to the front. Several F2L algorithms start with this.", demo:"y'" },
        { token:"z",  name:"z rotation",  how:"The whole cube the way F turns: the top face goes to the right.", demo:"z" },
        { token:"x2", name:"x two",       how:"The cube upside down, front still front. The beginner method does this between the first layer and the last.", demo:"x2" }
      ]}
  ];

  /* Words for a parsed move, for the steppers' status line. Face turns state
     the viewpoint; slices, wides and rotations state which face they copy. */
  const WORDS = {
    U:["the top layer","seen from above"],   D:["the bottom layer","seen from below"],
    R:["the right layer","seen from the right"], L:["the left layer","seen from the left"],
    F:["the front layer","as you look at it"],  B:["the back layer","seen from behind"],
    M:["the middle slice between L and R","L"], E:["the middle slice between U and D","D"],
    S:["the middle slice between F and B","F"],
    r:["the right two layers","seen from the right"], l:["the left two layers","seen from the left"],
    u:["the top two layers","seen from above"],     d:["the bottom two layers","seen from below"],
    f:["the front two layers","as you look at them"], b:["the back two layers","seen from behind"],
    x:["the whole cube","R"], y:["the whole cube","U"], z:["the whole cube","F"]
  };
  const COPIES = "MESxyz";
  function describeMove(move){
    const [base, q] = move, w = WORDS[base];
    if(!w) return "";
    if(q === 2) return `${w[0]}, a half turn`;
    if(COPIES.indexOf(base) >= 0) return `${w[0]}, the way ${w[1]}${q === 3 ? "'" : ""} turns`;
    return `${w[0]}, ${q === 3 ? "anticlockwise" : "clockwise"} ${w[1]}`;
  }
  const rows = () => GROUPS.flatMap(g => g.rows);
  return { GROUPS, WORDS, describeMove, rows };
})();
/*== NOTATION:END ==*/
