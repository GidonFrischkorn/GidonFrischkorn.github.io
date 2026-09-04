/* beginner.js — the layer-by-layer beginner method as data: seven stages, each
   with a goal, a way to recognise it, and one or more worked demos. A demo is
   an algorithm plus the state it is meant for; the state is never drawn by
   hand. It is *computed*: start solved, apply the stage's hold, add `noise`
   that scrambles only what this stage is allowed to leave unsolved, then run
   the algorithm backwards. So every demo is, by construction, a case the
   algorithm fixes — and local/beginner_test.mjs checks that the stage's own
   predicate fails before and holds after, and that no earlier stage is
   disturbed. The method follows J Perm's beginner guide (jperm.net/3x3):
   white cross, white corners, middle edges, yellow cross, yellow edges,
   yellow corners in place, yellow corners turned. */
/*== BEGINNER:BEGIN ==*/
const BEGINNER = (function(){
  /* ---- predicates on an oriented cube: what each stage leaves true ---- */
  const CORNERS1 = [[29,3],[26,2],[15,1], [27,3],[24,2],[44,4], [33,3],[42,4],[53,5], [35,3],[17,1],[51,5]];
  const firstCorners = c => CORNERS1.every(([i,v]) => c.o[i] === v);
  /* Home up to a turn of the top layer: true if some U^k puts the named
     last-layer pieces where they belong. */
  function homeUpToAUF(cube, c, names){
    for(let k=0;k<4;k++){
      const p = cube.llPermutation(cube.Cube(cube.applyPerm(c.o, cube.powPerm(cube.PERM.U, k))));
      if(names.every(n => p[n] === n)) return true;
    }
    return false;
  }
  const EDGES = ["UB","UR","UF","UL"], ALL8 = ["UBL","UBR","UFR","UFL","UB","UR","UF","UL"];
  function predicates(cube){
    const cross    = c => cube.crossSolved(c);
    const corners  = c => cross(c) && firstCorners(c);
    const f2l      = c => cube.f2lDone(c);
    const ycross   = c => f2l(c) && cube.ollEdgesDone(c);
    const yedges   = c => ycross(c) && homeUpToAUF(cube, c, EDGES);
    const ycorners = c => yedges(c) && homeUpToAUF(cube, c, ALL8);
    const solved   = c => cube.solvedUpToAUF(c) >= 0;
    return [cross, corners, f2l, ycross, yedges, ycorners, solved];
  }

  /* Noise that preserves everything up to and including a stage, so a demo's
     "after" state looks like a real mid-solve rather than a finished cube. */
  const SEXY = "R U R' U'", SUNE = "R U R' U R U2 R'";
  const SECOND = "U R U' R' U' F' U F", SECOND_L = "U' L' U L U F U' F'";
  const TWIST2 = "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'";
  const CORNER3 = "R' F R' B2 R F' R' B2 R2";

  const STAGES = [
    { id:"cross", title:"The white cross", hold:"z2",
      goal:"Four white edges around the white centre, each one's other colour matching the centre it touches.",
      cue:"Hold the white centre on top, green towards you. Find an edge with a white sticker and look at its other colour: that tells you which side it belongs on. Get it under that centre, then bring it up.",
      why:"There is no algorithm for this stage and there should not be one — the four edges interact, and seeing that is the skill. Two or three moves per edge is normal.",
      demos:[
        { name:"White edge below its slot, white facing down",
          cue:"The white-green edge sits at the bottom of the front face with white facing the floor, and the green centre is directly above it. A half turn of the front brings it up.",
          noise:"R D R' D' L' D' L D F D F' D' B D B' D'", alg:"F2" },
        { name:"White edge in the middle layer, white facing front",
          cue:"The white-green edge is on the right of the front face, white facing you. Turn the top away (U') so the empty slot is on the right, lift the piece into it with R, and bring the top back with U.",
          noise:"R D R' D' L' D' L D B D B' D'", alg:"U' R U" },
        { name:"White edge in the middle layer, white facing right",
          cue:"Same place, but white faces right. Now a single anticlockwise turn of the front carries it straight up into the slot with white on top.",
          noise:"L' D' L D B D B' D' F D F' D'", alg:"F'" }
      ]},
    { id:"corners", title:"The white corners", hold:"",
      goal:"The white face complete, with the four corners matching the centres around it: the whole first layer done.",
      cue:"Turn the cube over: white cross on the bottom now, yellow centre on top. Find a corner with white on it in the top layer and turn the top until it sits above the slot whose two colours it carries. Then repeat R U R' U' until it drops in. One, three or five repetitions, depending on which way the white sticker faces.",
      why:"The four moves R U R' U' undo themselves after six repetitions, so nothing you do here can break the cross. That is why the beginner method uses them: you can keep going until it works.",
      demos:[
        { name:"White facing right — once",
          cue:"The white-green-red corner sits above its slot at the front-right, white facing right. One R U R' U' drops it in.",
          noise:SECOND + " " + SUNE, alg:SEXY },
        { name:"White facing up — three times",
          cue:"Same corner, same place, white on top. Three repetitions.",
          noise:SECOND + " " + SUNE, alg:SEXY + " " + SEXY + " " + SEXY },
        { name:"White facing front — five times",
          cue:"White facing you, at the front-right. Five repetitions. If a corner sits in its slot but twisted, do R U R' U' once to lift it out and start again.",
          noise:SECOND + " " + SUNE, alg:SEXY + " " + SEXY + " " + SEXY + " " + SEXY + " " + SEXY }
      ]},
    { id:"second", title:"The middle layer", hold:"",
      goal:"The second layer's four edges in place: two layers solved.",
      cue:"Find an edge in the top layer with no yellow on it. Turn the top until its front sticker matches the centre it sits over. Its top sticker tells you which way it goes: if it matches the right centre, use the right-hand sequence; if the left, the mirror.",
      why:"Both sequences are the same idea: move the edge out of the way, bring the corner out, put the edge back with the corner. If an edge is stuck in the middle layer the wrong way round, run the sequence once with any edge to knock it out, then place it properly.",
      demos:[
        { name:"Edge goes to the right",
          cue:"The green-red edge sits at the front of the top layer, green in front, red on top. Red is the right centre, so it goes down to the right.",
          noise:SUNE + " F R U R' U' F'", alg:SECOND },
        { name:"Edge goes to the left",
          cue:"The green-orange edge at the front of the top layer, green in front, orange on top. Orange is the left centre: the mirror sequence.",
          noise:"F R U R' U' F' " + SUNE, alg:SECOND_L }
      ]},
    { id:"ycross", title:"The yellow cross", hold:"",
      goal:"A yellow cross on top. The corners can be anything.",
      cue:"Look at the yellow edges on top and ignore the corners. You will see a dot, an L, a line, or the cross. Hold an L in the back-left (the two yellow edges at the back and on the left) and a line running left to right, then run F R U R' U' F'. From a dot, run it, hold the L it makes, run it again, hold the line, run it once more.",
      why:"This is the same algorithm as the Line case in the CFOP programme. The beginner method reaches every case by repeating it; two-look OLL adds one more algorithm so the L takes one go instead of two.",
      demos:[
        { name:"From a line",
          cue:"Yellow edges left and right, none front or back. Hold the line across your view.",
          noise:SUNE + " " + CORNER3, alg:"F R U R' U' F'" },
        { name:"From an L",
          cue:"Two yellow edges, at the back and on the left. Run the algorithm: the line it makes already lies across. Run it again.",
          noise:SUNE + " " + CORNER3, alg:"F R U R' U' F' F R U R' U' F'" },
        { name:"From a dot",
          cue:"No yellow edges on top at all. Run it once and an L appears at the front-right; a half turn of the top brings it to the back-left. Run it twice more, as for the L.",
          noise:SUNE + " " + CORNER3, alg:"F R U R' U' F' U2 F R U R' U' F' F R U R' U' F'" }
      ]},
    { id:"yedges", title:"The yellow edges", hold:"",
      goal:"The four yellow edges each matching the centre below it, so the top layer's edges are done.",
      cue:"Turn the top until two edges match their centres. If they are next to each other, hold them at the back and on the right; if they are opposite, hold either at the back. Then run R U R' U R U2 R' and turn the top to match. Opposite edges may need it twice.",
      why:"This is Sune from the CFOP list, doing a job the beginner method needs from it: it cycles three edges and leaves the corners' positions alone.",
      demos:[
        { name:"Two matching edges next to each other",
          cue:"The back and right edges match their centres; front and left are swapped round the wrong way. Hold the matched pair at the back and right.",
          noise:TWIST2 + " " + CORNER3, alg:SUNE + " U" },
        { name:"Two matching edges opposite each other",
          cue:"Front and back match; left and right are swapped. Run the algorithm from any side. Now two neighbouring edges match, at the front and right: turn the whole cube (y') so they sit at the back and right, run it once more, and turn the top to line up.",
          /* The composite carries a net cube rotation; putting its inverse in the
             noise means the example starts green-in-front and ends turned, which
             is how the cube is actually held after a y'. */
          noise:TWIST2 + " " + CORNER3 + " y'", alg:SUNE + " y' " + SUNE + " U" }
      ]},
    { id:"ycorners", title:"The yellow corners in place", hold:"",
      goal:"Every corner in its right position — its three colours matching the three centres around it — even if still twisted.",
      cue:"Find a corner whose colours match the centres around it (twisted or not). Hold it at the front-right and run U R U' L' U R' U' L; the other three corners cycle round. If none matches, run it from anywhere first, then one will.",
      why:"Swapping two corners alone is impossible on a cube, so a three-way cycle is the only tool there is. Holding the right corner still is the whole art of this step.",
      demos:[
        { name:"One corner already in place",
          cue:"The front-right corner is home; the other three need to cycle. One round does it.",
          noise:TWIST2, alg:"U R U' L' U R' U' L" },
        { name:"No corner in place",
          cue:"Nothing matches. Run the cycle once from any side; one corner now matches. Turn the top so that corner is at the front-right (here a U), and run it again.",
          noise:TWIST2, alg:"U R U' L' U R' U' L U U R U' L' U R' U' L" }
      ]},
    { id:"twist", title:"Turning the yellow corners", hold:"",
      goal:"Solved.",
      cue:"Hold a corner that needs turning at the front-right, yellow on top. Repeat R' D' R D until its yellow faces up — two or four rounds. The bottom layers will look wrecked meanwhile; ignore that completely. Then turn the top (U) to bring the next corner to the front-right and repeat. When the last one is done the bottom is back.",
      why:"Each pair of rounds twists one corner and shuffles the bottom in a way that undoes itself once the twists add up. The one thing that breaks it is turning the whole cube instead of the top layer between corners.",
      demos:[
        { name:"Two corners to turn",
          cue:"Front-right needs two rounds; the corner behind it, brought forward with U, needs four. Watch the bottom fall apart and come back.",
          noise:"", alg:TWIST2 }
      ]}
  ];

  /* The states a demo runs between. `hold` is applied to the raw state only,
     so the picture shows the cube the way the learner holds it while the
     predicates, which read the oriented state, are unaffected. */
  function build(cube, stage, demo){
    let after = cube.Cube.solved();
    if(stage.hold) after = after.apply(stage.hold);
    if(demo.noise) after = after.apply(demo.noise);
    const moves = cube.parseMoves(demo.alg);
    if(!after || !moves.ok) return null;
    const before = cube.Cube(cube.applyMoves(after.raw, cube.invertMoves(moves.moves)));
    return { before, after, moves: moves.moves };
  }
  return { STAGES, predicates, build };
})();
/*== BEGINNER:END ==*/
