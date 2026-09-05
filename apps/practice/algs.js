/* algs.js — the algorithm table, shared by index.html and lastlayer.html.
   Moved out of app.js verbatim; local/quiz_test.mjs slices on the sentinels. */
/* Diagrams are plan views of the last layer with the front face at the bottom.
   OLL `e` is 21 facelets: 3 back-rim, then (left, u0, u1, u2, right) per row,
   then 3 front-rim. 1 = yellow facing that way. Every string below was generated
   from a cube simulator by applying each algorithm's inverse to a solved cube,
   so the diagram always matches what the algorithm actually solves.
   PLL `r` is the 12 side stickers clockwise from the back-left corner, and `x`
   lists the piece movements as [from, to] over the 3x3 grid indexed 0-8. */
/*== ALGS:BEGIN ==*/
const ALGS = {
  cross: { label:"Cross", rows:[] },
  f2l: { label:"F2L", rows:[
    {id:"f2l.insert-right",short:"Insert R",n:"Basic insert · right",s:"Corner above the slot, edge on the right",a:"R U R'",
     note:"The atom of F2L. Everything else is a setup that turns your case into this one. Watch what it does: the corner drops in and the edge follows it."},
    {id:"f2l.insert-front",short:"Insert F",n:"Basic insert · front",s:"Corner above the slot, edge on the left",a:"y' R' U' R",
     note:"The mirror of the one above. Rotating with y' rather than learning a separate left-hand version keeps you carrying one idea instead of two."},
    {id:"f2l.pair-right",short:"Pair R",n:"Pair, then insert · right",s:"Both pieces up top, corner facing front",a:"U R U' R'",
     note:"Separate, pair, insert — the three-phase idea. The U at the front is the pairing move; the rest is the basic insert."},
    {id:"f2l.pair-left",short:"Pair L",n:"Pair, then insert · left",s:"Both pieces up top, mirrored",a:"y' U' R' U R",
     note:"Same three phases on the other side. If you find yourself hunting for a third and fourth variant, you're memorising instead of seeing."},
    {id:"f2l.sexy",short:"Sexy move",n:"Sexy move",s:"The trigger everything is built from",a:"R U R' U'",
     note:"Not an F2L case — a building block worth knowing by name, because tutorials and algorithms below are described in terms of it. Six repetitions on a solved cube return it to solved, which is a good way to feel how it works."},
    {id:"f2l.sledgehammer",short:"Sledge",n:"Sledgehammer",s:"The other common trigger",a:"R' F R F'",
     note:"The second piece of vocabulary. Once you can see sexy moves and sledgehammers inside longer algorithms, the last-layer set stops looking arbitrary."}
  ]},
  oll: { label:"OLL · 10", rows:[
    {id:"oll.line",short:"Line",n:"Line",s:"Edges — bar running left to right",a:"F R U R' U' F'",edges:true,
     e:"010100100111010010010",
     note:"Hold the bar horizontally, across your view. You are only orienting edges here, so the corners will still be a mess afterwards — that is correct, not a mistake. This is the algorithm every other edge case is built from."},
    {id:"oll.l-shape",short:"L-shape",n:"L-shape",s:"Edges — L occupying front and right",a:"f R U R' U' f'",edges:true,
     e:"010100101011010110000",
     note:"Hold the L so its two oriented edges sit at the front and the right. This holding is specific to this algorithm: the common variant F U R U' R' F' solves the same case held the opposite way, so don't mix an algorithm from one source with a picture from another."},
    {id:"oll.dot",short:"Dot",n:"Dot",s:"Edges — none oriented; run the other two in sequence",a:"F R U R' U' F' · f R U R' U' f'",edges:true,
     e:"011100001010110000011",
     note:"No separate algorithm needed and no separate holding either — this one works from any angle. Run the Line algorithm, which turns the dot into an L, then run the L algorithm. Don't memorise it as a third sequence."},
    {id:"oll.sune",short:"Sune",confusable:["oll.antisune"],n:"Sune",s:"Corners — one oriented, at the front left",a:"R U R' U R U2 R'",
     e:"100001010111001100001",
     note:"The backbone of the corner set. Hold the single oriented corner at the front left. It twists exactly three corners, which is why six repetitions on a solved cube bring it back to solved — a good drill that needs no scrambling."},
    {id:"oll.antisune",short:"Antisune",n:"Antisune",s:"Corners — one oriented, at the back right",a:"R U2 R' U' R U' R'",
     e:"000101100111000101100",
     note:"Sune's mirror, and the other one-corner case. Learn it immediately after Sune while the shape of that algorithm is still fresh; taken together they are much less than two algorithms' worth of work."},
    {id:"oll.t",short:"T",n:"T / Chameleon",s:"Corners — two oriented, both on the right",a:"r U R' U' r' F R F'",
     e:"100001100111000110100",
     note:"The lowercase r is a wide turn: it moves the right layer and the middle slice together. A wide turn that slips into a single-layer turn scrambles the cube in a confusing way, so check your grip before you start."},
    {id:"oll.bowtie",short:"Bowtie",n:"L / Bowtie",s:"Corners — two oriented, diagonally opposite",a:"F' r U R' U' r' F R",
     e:"000101100111001100001",
     note:"The other wide-turn case, and the only corner case with its two oriented corners diagonally across from each other. Some sources give this algorithm with a y rotation in front; the diagram here matches the algorithm as written."},
    {id:"oll.headlights",short:"Headlights",n:"Headlights",s:"Corners — two oriented, both at the back",a:"R2 D R' U2 R D' R' U2 R'",
     e:"000011100111000100101",
     note:"The odd one out with no mirror partner. It uses D, which no other last-layer algorithm here does, so it tends to feel unfamiliar for longer than the others — worth extra repetitions."},
    {id:"oll.h",short:"OLL H",confusable:["oll.pi"],n:"H",s:"Corners — none oriented; yellow on left and right",a:"R U R' U R U' R' U R U2 R'",
     e:"000101010111010101000",
     note:"Looks identical to Pi from directly above: a bare yellow cross either way. What separates them is the rim — H shows yellow in matching pairs on the left and right faces. It is essentially Sune done three times."},
    {id:"oll.pi",short:"Pi",n:"Pi",s:"Corners — none oriented; rim pattern differs from H",
     a:"R U2 R2 U' R2 U' R2 U2 R",
     e:"001101000111010100001",
     note:"The other no-corners case. Compare the rim against H before you commit: this is the one case pair where reading only the top face cannot possibly tell you which you have, and confusing them costs a whole extra algorithm to recover."}
  ]},
  pll: { label:"PLL · 6", rows:[
    {id:"pll.corners-3cycle",short:"3-cycle",confusable:["pll.corners-diagonal"],n:"Corner 3-cycle",s:"Corners — headlights at the back",a:"R' F R' B2 R F' R' B2 R2",
     r:"RBRGROBGGOOB",x:[[0,2],[2,8],[8,0]],
     note:"Not a two-corner swap — swapping just two corners is impossible on a cube. Three corners rotate positions and one stays put. Find the face showing two matching corner stickers (the headlights) and put it at the back. This one leaves the edges completely alone, which keeps the two-stage picture clean."},
    {id:"pll.corners-diagonal",short:"Diagonal",n:"Diagonal swap",s:"Corners — no headlights anywhere",a:"F R U' R' U' R U R' F' R U R' U' R' F R F'",
     r:"GOBRROBGGOBR",x:[[0,8],[8,0],[1,3],[3,1]],
     note:"The Y-perm. Recognition is the absence of a cue: check all four faces, and if none shows headlights, this is your case. Long but it works from any angle, so there is no holding to get wrong. It also swaps two edges, which is harmless because edges are the next step anyway."},
    {id:"pll.ua",short:"Ua",confusable:["pll.ub"],n:"Ua",s:"Edges — solved edge at the back, cycle runs one way",a:"M2 U M U2 M' U M2",
     r:"BBBRORGRGOGO",x:[[7,5],[5,3],[3,7]],
     note:"Three edges rotate positions; the fourth is already home and goes at the back. Ua and Ub move exactly the same three edges and differ only in direction, so the whole difficulty is telling them apart. Follow the arrows: here the front edge travels to the right."},
    {id:"pll.ub",short:"Ub",n:"Ub",s:"Edges — solved edge at the back, cycle runs the other way",a:"M2 U' M U2 M' U' M2",
     r:"BBBRGRGOGORO",x:[[7,3],[3,5],[5,7]],
     note:"The mirror of Ua, and the only difference in the algorithm is which way the U turns go. Here the front edge travels to the left. If you keep confusing the two, name the direction out loud before you start turning."},
    {id:"pll.h",short:"PLL H",n:"H",s:"Edges — both opposite pairs swap",a:"M2 U M2 U2 M2 U M2",
     r:"BGBRORGBGORO",x:[[1,7],[7,1],[3,5],[5,3]],
     note:"Front swaps with back, left swaps with right. Fully symmetrical, so there is no wrong angle to start from — the one last-layer case you never have to line up first. Also the easiest algorithm here to execute once the M slice is comfortable."},
    {id:"pll.z",short:"Z",n:"Z",s:"Edges — both adjacent pairs swap",a:"M2 U M2 U M' U2 M2 U2 M' U2",
     r:"BOBRGRGRGOBO",x:[[1,3],[3,1],[7,5],[5,7]],
     note:"The other swap case: neighbours trade rather than opposites. Some published versions of this algorithm finish a quarter turn out, needing a final U to line the layer up — if yours does, that is normal and not a mistake."}
  ]}
};
/*== ALGS:END ==*/
