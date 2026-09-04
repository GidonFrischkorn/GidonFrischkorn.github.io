/* app.js — the 42-day programme page (index.html).
   Three pure regions that other pages share live in sibling files and are
   loaded before this one: engine.js (ENGINE, declares CUBE), algs.js (ALGS)
   and diagram.js (DIAGRAM: renderOLL, renderPLL). Everything here assumes
   they are already in scope. */

/*== LOG:BEGIN ==*/
/* ---------------- event log ----------------
   An append-only record of what the learner actually did. The completion grid
   is *derived* from it, never the reverse: `dayDone` events are the record and
   the Set is a projection of them.

   Pure by construction — no DOM, no globals, no direct localStorage. Storage
   arrives as an adapter `st = {get, set, del, now}` whose `set` returns false
   when the write did not land. local/store_test.mjs slices this region out by
   the sentinels and runs it against a fake store and an independent reference
   implementation of the same rules. Keep it free of page dependencies.       */
const LOG = (function(){

/* Event types, stored as the index into this array. APPEND-ONLY: reordering or
   removing an entry rewrites the meaning of every event already sitting in
   somebody's browser. */
const TYPES = ["","recog","recall","predict","cross","solve","reflect","dayDone","repeat"];
const CODE = {};
TYPES.forEach((t,i)=>{ if(t) CODE[t] = i; });

/* Types that survive compaction. Everything else is anonymous drill telemetry:
   informative in aggregate, reconstructible by drilling again, safe to drop.
   `dayDone` is none of those things — evicting it would silently roll the
   completion grid backwards, which is why eviction here is type-aware rather
   than the FIFO the cap seems to invite. */
const DURABLE = new Set(["dayDone","repeat","reflect"]);

const CHUNK = 500;        // events per storage key — ~22 KB rewritten per append
const CAP = 5000;         // events in the rolling log before compaction starts
const KEEP_CAP = 600;     // entries in the durable store (42 days + reflections)
const REFLECT_MAX = 1000; // characters of a written reflection kept
const FORMAT = "cfop-trainer/events-1";

/* Storage is short-keyed — a verbose event measures 146 bytes and 5000 of them
   is 718 KB per profile, against a ~5 MB origin quota this page shares with the
   rest of gfrischkorn.org. Export expands back to the readable schema, so the
   analysis artefact stays legible while the browser copy stays small. */
const K = {
  profiles: "cfop.profiles.v2",
  active:   "cfop.active.v2",
  idx:   id => "cfop.evx." + id,
  chunk: (id,n) => "cfop.ev." + id + "." + n,
  keep:  id => "cfop.keep." + id,
  /* Legacy, name-keyed. Read once by the migration below and never written:
     the page is still in development, so a stale cached tab losing progress is
     not worth a permanent second source of truth. */
  lProfiles: "cfop.profiles",
  lActive:   "cfop.active",
  lDone:     name => "cfop.done." + name
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

function readJSON(st, k, dflt){
  const raw = st.get(k);
  if(raw == null) return dflt;
  try { const v = JSON.parse(raw); return v == null ? dflt : v; }
  catch(e){ return dflt; }
}
function put(st, k, v){ return st.set(k, JSON.stringify(v)) !== false; }

/* Composite identity. Not `ts` alone: two events can share a millisecond — a
   reveal timeout and the requeue it triggers — and merging on the timestamp
   would drop one of them on every import. */
const idOf = e => e.ts + "|" + e.type + "|" + e.day + "|" + (e.caseId == null ? "" : e.caseId);
const sortEvents = list => list.slice().sort((a,b) => a.ts - b.ts);   // stable: ties keep insertion order

/* An unknown type would be stored as code 0 and read back as "", which is the
   silent-skip failure the notation parser already had once. Reject it here; the
   page only ever passes literals, and import validates before it gets this far. */
function normalise(ev, now){
  if(!ev || !CODE[ev.type]) throw new Error("LOG: unknown event type " + JSON.stringify(ev && ev.type));
  const day = Math.trunc(num(ev.day));
  const e = { ts: Number.isFinite(Number(ev.ts)) ? Math.round(Number(ev.ts)) : now, day, type: ev.type };
  if(ev.caseId != null) e.caseId = String(ev.caseId);
  /* Which rendering the learner was shown. A first-class field rather than an
     `extra` key because `extra` is one JSON blob in the CSV, and the point of
     the CSV is read_csv() with nothing to unpack — a planned stimulus
     manipulation has to arrive as its own column. */
  if(ev.view != null) e.view = String(ev.view);
  if(ev.angle != null) e.angle = Math.trunc(num(ev.angle));
  if(ev.auf != null) e.auf = Math.trunc(num(ev.auf));
  if(ev.correct != null) e.correct = !!ev.correct;
  if(ev.latencyMs != null) e.latencyMs = Math.round(num(ev.latencyMs));
  if(ev.extra && typeof ev.extra === "object" && Object.keys(ev.extra).length){
    e.extra = Object.assign({}, ev.extra);
    if(typeof e.extra.text === "string") e.extra.text = e.extra.text.slice(0, REFLECT_MAX);
  }
  return e;
}
/* ts is a millisecond epoch — well past 2^31, so no `|0` anywhere near it. */
function enc(e){
  const o = { t: e.ts, d: e.day, y: CODE[e.type] };
  if(e.caseId != null) o.c = e.caseId;
  if(e.view != null) o.v = e.view;
  if(e.angle != null) o.a = e.angle;
  if(e.auf != null) o.f = e.auf;
  if(e.correct != null) o.k = e.correct ? 1 : 0;
  if(e.latencyMs != null) o.l = e.latencyMs;
  if(e.extra != null) o.x = e.extra;
  return o;
}
function dec(o){
  const e = { ts: num(o.t), day: Math.trunc(num(o.d)), type: TYPES[o.y] || "" };
  if(o.c != null) e.caseId = o.c;
  if(o.v != null) e.view = o.v;
  if(o.a != null) e.angle = o.a;
  if(o.f != null) e.auf = o.f;
  if(o.k != null) e.correct = o.k === 1;
  if(o.l != null) e.latencyMs = o.l;
  if(o.x != null) e.extra = o.x;
  return e;
}

/* The grid, folded out of the log: for each day the last `dayDone` wins, and a
   `dayDone` with correct:false is how undo is recorded without deleting. */
function doneFrom(events){
  const last = new Map();
  for(const e of events) if(e.type === "dayDone") last.set(e.day, e.correct !== false);
  const s = new Set();
  last.forEach((v,d)=>{ if(v) s.add(d); });
  return s;
}

function readAll(st, id){
  const out = readJSON(st, K.keep(id), []).map(dec);
  const idx = readJSON(st, K.idx(id), null);
  if(idx) for(let n = num(idx.lo); n <= num(idx.hi); n++)
    for(const o of readJSON(st, K.chunk(id, n), [])) out.push(dec(o));
  return sortEvents(out);
}

/* Write a whole log from scratch. Every chunk but the last is exactly full,
   which is what makes the cap arithmetic in count() exact. */
function writeChunks(st, id, events){
  let hi = 0, buf = [], ok = true;
  for(const e of events){
    buf.push(enc(e));
    if(buf.length >= CHUNK){ ok = put(st, K.chunk(id, hi), buf) && ok; hi++; buf = []; }
  }
  ok = put(st, K.chunk(id, hi), buf) && ok;
  ok = put(st, K.idx(id), { lo:0, hi }) && ok;
  return ok;
}

function trimKeep(list){
  /* Latest dayDone per day wins — an earlier one says nothing the later one
     does not, and 42 days is the bound the durable store is sized for. Written
     reflections and repeat markers are all kept; if even those overflow, the
     oldest reflections go first and dayDone never does. */
  const sorted = list.slice().sort((a,b) => num(a.t) - num(b.t));
  const at = new Map(), out = [];
  for(const o of sorted){
    if(TYPES[o.y] === "dayDone"){
      if(at.has(o.d)){ out[at.get(o.d)] = o; continue; }
      at.set(o.d, out.length);
    }
    out.push(o);
  }
  let over = out.length - KEEP_CAP;
  if(over <= 0) return out;
  const kept = [];
  for(const o of out){
    if(over > 0 && TYPES[o.y] === "reflect"){ over--; continue; }
    kept.push(o);
  }
  return kept;
}

/* ---- a log, open on one profile ---- */
function open(st, id){
  let idx = readJSON(st, K.idx(id), null);
  if(!idx || !Number.isFinite(Number(idx.hi))) idx = { lo:0, hi:0 };
  idx = { lo: Math.trunc(num(idx.lo)), hi: Math.trunc(num(idx.hi)) };
  let tail = readJSON(st, K.chunk(id, idx.hi), []);
  const events = readAll(st, id);
  const done = doneFrom(events);
  let didCompact = false, quota = false;

  const count = () => (idx.hi - idx.lo) * CHUNK + tail.length;

  function resync(){
    /* Storage is the truth. Cheap enough at once per 500 events, and it makes
       the incrementally-maintained `done` agree with a fold over the log by
       construction rather than by hope. */
    const re = readAll(st, id);
    events.length = 0;
    for(const e of re) events.push(e);
    tail = readJSON(st, K.chunk(id, idx.hi), []);
    done.clear();
    doneFrom(re).forEach(d => done.add(d));
  }

  function compactOldest(){
    if(idx.lo >= idx.hi) return false;            // the tail chunk is never evicted
    const ch = readJSON(st, K.chunk(id, idx.lo), []);
    const durable = ch.filter(o => DURABLE.has(TYPES[o.y]));
    if(durable.length){
      const keep = readJSON(st, K.keep(id), []).concat(durable);
      /* If the durable store cannot be written, the chunk does not go. Dropping
         it anyway is the one move that turns "storage is full" into "your
         completed days are gone", so a full quota surfaces as a banner instead. */
      if(!put(st, K.keep(id), trimKeep(keep))) return false;
    }
    st.del(K.chunk(id, idx.lo));
    idx.lo++;
    put(st, K.idx(id), { lo: idx.lo, hi: idx.hi });
    didCompact = true;
    return true;
  }

  function flush(){
    /* On a refused write, evict oldest-first and retry. Compaction has already
       moved the durable types aside, so eviction under pressure costs drill
       telemetry and never the grid. */
    for(let attempt = 0; attempt < 16; attempt++){
      if(put(st, K.chunk(id, idx.hi), tail) && put(st, K.idx(id), { lo: idx.lo, hi: idx.hi })){
        quota = false;
        return true;
      }
      if(!compactOldest()) break;
    }
    quota = true;
    return false;
  }

  return {
    id,
    all: () => events.slice(),
    done: () => done,                 // the live Set — read-only to callers
    count,
    quotaHit: () => quota,
    append(ev){
      const e = normalise(ev, st.now());
      didCompact = false;
      events.push(e);
      if(e.type === "dayDone"){ if(e.correct === false) done.delete(e.day); else done.add(e.day); }
      tail.push(enc(e));
      const ok = flush();
      if(ok && tail.length >= CHUNK){
        idx.hi++; tail = [];
        put(st, K.idx(id), { lo: idx.lo, hi: idx.hi });
      }
      while(ok && count() > CAP && compactOldest()){ /* type-aware, not FIFO */ }
      if(ok && didCompact) resync();
      return ok;
    },
    replaceAll(list){
      for(let n = idx.lo; n <= idx.hi; n++) st.del(K.chunk(id, n));
      st.del(K.keep(id));
      const sorted = sortEvents(list.map(e => normalise(e, st.now())));
      const ok = writeChunks(st, id, sorted);
      idx = readJSON(st, K.idx(id), { lo:0, hi:0 });
      tail = readJSON(st, K.chunk(id, idx.hi), []);
      didCompact = false;
      while(count() > CAP && compactOldest()){ /* honour the cap on import too */ }
      resync();
      return ok;
    },
    wipe(){
      for(let n = idx.lo; n <= idx.hi; n++) st.del(K.chunk(id, n));
      st.del(K.keep(id));
      st.del(K.idx(id));
      idx = { lo:0, hi:0 };
      tail = [];
      events.length = 0;
      done.clear();
    }
  };
}

/* ---- profiles: raw typed name -> stable id ---- */
/* A profile added from the page gets a clock-minted id — nothing else could
   name it. */
function newId(st, existing){
  const base = "p" + Number(st.now()).toString(36);
  const taken = new Set((existing || []).map(p => p.id));
  for(let i = 0; ; i++){
    const id = base + "-" + i.toString(36);
    if(!taken.has(id)) return id;
  }
}
/* A *migrated* profile does not: its id is derived from the legacy name (FNV-1a),
   so re-running the migration lands on the same id every time. That is what makes
   the "a log already exists" guard below a live check rather than a formality —
   with clock-minted ids a second migration would mint a fresh id, find no log
   under it, and rebuild from the legacy mirror while orphaning the real event
   history under an id nothing references. Losing cfop.profiles.v2 to a refused
   write is exactly the case this block has to survive, so it must re-adopt. */
function hash36(s){
  let h = 0x811c9dc5;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function legacyId(name, taken){
  const base = "p" + hash36(name);
  if(!taken.has(base)) return base;
  for(let i = 1; ; i++) if(!taken.has(base + "-" + i.toString(36))) return base + "-" + i.toString(36);
}

/* The legacy format recorded only *which* days were done, never when. A
   backdated guess would put fabricated timestamps into an export meant for
   analysis in R, so these carry ts 0 and extra.migrated: unmistakably
   synthetic, and sorting before every real event. */
function migratedEvents(days){
  const seen = new Set(), out = [];
  if(Array.isArray(days)) for(const d of days){
    const n = Number(d);
    if(!Number.isInteger(n) || n < 0 || seen.has(n)) continue;
    seen.add(n);
    out.push({ ts: 0, day: n, type: "dayDone", correct: true, extra: { migrated: 1 } });
  }
  return out.sort((a,b) => a.day - b.day);
}

function migrate(st){
  const legacy = readJSON(st, K.lProfiles, null);
  const names = [];
  if(Array.isArray(legacy)) for(const n of legacy){
    const s = String(n).trim();
    if(s && names.indexOf(s) < 0) names.push(s);      // duplicates would fight over one id
  }
  if(!names.length) names.push("Me");
  const profiles = [], taken = new Set();
  for(const name of names){
    const id = legacyId(name, taken);
    taken.add(id);
    profiles.push({ id, name });
  }
  for(const p of profiles){
    if(st.get(K.idx(p.id)) != null) continue;          // idempotent: a log already exists
    writeChunks(st, p.id, migratedEvents(readJSON(st, K.lDone(p.name), [])));
  }
  return { profiles, migrated: true };
}

function loadProfiles(st){
  const v2 = readJSON(st, K.profiles, null);
  if(Array.isArray(v2) && v2.length && v2.every(p => p && p.id != null))
    return { profiles: v2.map(p => ({ id: String(p.id), name: String(p.name == null ? "" : p.name) })), migrated: false };
  return migrate(st);
}
function loadActive(st, profiles){
  const a = st.get(K.active);
  if(a && profiles.some(p => p.id === a)) return a;
  const byName = profiles.find(p => p.name === st.get(K.lActive));
  return byName ? byName.id : profiles[0].id;
}
function saveProfiles(st, profiles, active){
  put(st, K.profiles, profiles);
  st.set(K.active, active);
}

/* ---- export / import ---- */
const FIELDS = ["ts","day","type","caseId","angle","auf","correct","latencyMs","view","extra"];
const readable = e => {
  const o = {};
  for(const f of FIELDS) o[f] = e[f] === undefined ? null : e[f];
  return o;
};

function toJSON(profile, events, isoNow){
  return JSON.stringify({
    format: FORMAT,
    exported: isoNow,
    profile: { id: profile.id, name: profile.name },
    count: events.length,
    events: sortEvents(events).map(readable)
  }, null, 1);
}

/* Long format, one row per event, so readr::read_csv() gives a usable frame
   with no parsing step. `extra` stays a JSON string because its keys vary by
   event type; nothing else needs it to be read. */
const CSV_COLS = ["event_id","ts_ms","ts_iso","profile_id","profile_name",
                  "day_index","day_number","type","case_id","angle","auf",
                  "correct","latency_ms","view","extra"];
function cell(v){
  if(v === null || v === undefined) return "";
  if(typeof v === "boolean") return v ? "TRUE" : "FALSE";
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(profile, events){
  const rows = [CSV_COLS.join(",")];
  for(const e of sortEvents(events)) rows.push([
    idOf(e), e.ts, new Date(e.ts).toISOString(), profile.id, profile.name,
    e.day, e.day + 1, e.type,
    e.caseId == null ? null : e.caseId,
    e.angle == null ? null : e.angle,
    e.auf == null ? null : e.auf,
    e.correct == null ? null : e.correct,
    e.latencyMs == null ? null : e.latencyMs,
    e.view == null ? null : e.view,
    e.extra == null ? null : JSON.stringify(e.extra)
  ].map(cell).join(","));
  return rows.join("\n") + "\n";
}

function fromJSON(text){
  let o;
  try { o = JSON.parse(text); }
  catch(e){ return { ok:false, error:"That file isn't valid JSON." }; }
  if(!o || o.format !== FORMAT)
    return { ok:false, error:"That isn't a CFOP trainer export (expected format " + FORMAT + ")." };
  if(!o.profile || !o.profile.id || !Array.isArray(o.events))
    return { ok:false, error:"That export is missing its profile or event list." };
  const events = [];
  for(const raw of o.events){
    if(!raw || !CODE[raw.type]) return { ok:false, error:"That export contains an event with an unknown type." };
    try { events.push(normalise(raw, 0)); }
    catch(e){ return { ok:false, error:"That export contains an event this version can't read." }; }
  }
  return { ok:true, profile: { id: String(o.profile.id), name: String(o.profile.name || "Imported") }, events };
}

function mergeEvents(existing, incoming){
  const seen = new Set(existing.map(idOf));
  const out = existing.slice();
  let added = 0;
  for(const e of incoming){
    const k = idOf(e);
    if(seen.has(k)) continue;
    seen.add(k); out.push(e); added++;
  }
  return { events: sortEvents(out), added };
}

return { TYPES, CHUNK, CAP, FORMAT, K, open, newId, loadProfiles, loadActive,
         saveProfiles, migratedEvents, doneFrom,
         toJSON, toCSV, fromJSON, mergeEvents, idOf, enc, dec, normalise };
})();
/*== LOG:END ==*/

/*== STORE:BEGIN ==*/
/* ---------------- storage: localStorage with in-memory fallback ----------------
   Three states worth keeping straight: storage works; storage is blocked
   outright (preview panes, some private modes) and everything runs from memory
   for the session; storage works but is full, which is a per-write failure the
   caller has to hear about. local/store_test.mjs slices this out by the
   sentinels and checks all three. */
const Store = (() => {
  let ok = true;
  try {
    localStorage.setItem("__t","1");
    localStorage.removeItem("__t");
  } catch (e) { ok = false; }
  const mem = {};
  return {
    ok,
    get(k){ try { return ok ? localStorage.getItem(k) : (mem[k] ?? null); } catch(e){ return mem[k] ?? null; } },
    /* Returns false when the write did not reach localStorage — a full quota,
       almost always. It deliberately does *not* stash the value in `mem` as a
       consolation prize: `mem` is only ever read when storage is unavailable
       outright, so a copy written here would never be read by anything. The
       report is the useful part — LOG's eviction path keys off it. */
    set(k,v){
      if(!ok){ mem[k]=v; return true; }
      try { localStorage.setItem(k,v); return true; }
      catch(e){ return false; }
    },
    del(k){ try { if(ok) localStorage.removeItem(k); else delete mem[k]; } catch(e){ delete mem[k]; } }
  };
})();
/*== STORE:END ==*/
if (!Store.ok) document.getElementById("storageWarn").classList.add("show");

/* ---------------- program data ---------------- */
const WEEKS = [
  { n:1, name:"Cross and F2L",  color:"var(--wk1)", light:true  },
  { n:2, name:"Last layer",     color:"var(--y)", light:true  },
  { n:3, name:"Recognition",    color:"var(--g)", light:false },
  { n:4, name:"Removing pauses",color:"var(--r)", light:false },
  { n:5, name:"Look-ahead",     color:"var(--b)", light:false },
  { n:6, name:"Stress test",    color:"var(--o)", light:false }
];

const DAYS = [
  {t:"Cross on the bottom",m:15,f:"Solve the white cross with white on the bottom face, not the top. This is the biggest habit change from the beginner method and it will feel wrong for a few days.",d:"10 crosses only. Scramble, solve the cross, check all four side colours match their centres. Read the bottom from the side stickers — don't turn the cube over.",
   w:"The beginner method builds the cross on top so you can watch it, then flips the cube over. CFOP skips the flip, which means every F2L pair afterwards drops straight into a slot you can already see. The price is that you're solving four pieces you can't look at directly, so you learn to read them from their side stickers instead. Turning the cube over to check is the habit to kill — it's the one thing that stops this becoming automatic."},
  {t:"What an F2L pair is",m:20,f:"A pair is one corner plus its matching edge, inserted into a slot together. The three base cases are all the same idea: get them next to each other, then put them in.",d:"Solve the cross, then insert one pair. Eight times. Don't do all four yet.",
   w:"The beginner method solves all four corners, then all four edges, with a separate algorithm for each. F2L does both at once, and that halving is where most of the time saving in CFOP actually comes from. Treat the three cases as one idea with three starting positions rather than three sequences to memorise — if you learn them as sequences you'll be stuck the first time a scramble hands you something slightly different."},
  {t:"All four slots",m:20,f:"Same three cases, now for every slot. Rotate the whole cube with y to bring the working slot to the front-right instead of learning mirrored versions.",d:"5 full F2L solves, untimed. Finish the last layer with your beginner method.",
   w:"There are mirrored algorithms for the other slots, but learning them now quadruples what you're carrying for no benefit. A y rotation costs a fraction of a second and lets you keep exactly one mental model. Speedcubers do eventually drop the rotations; that's an optimisation for later, not a foundation. The trap this week is drilling the front-right slot until it's smooth and discovering in week 4 that the back-left feels like a different puzzle."},
  {t:"Splitting up pairs",m:20,f:"The awkward cases: a corner and edge stuck together wrongly in a slot. Pull them out into the top layer with R U R', then treat it as a normal case.",d:"6 solves, deliberately hunting for slots that are already occupied.",
   w:"An occupied slot is the case beginners freeze on, and the fix is deliberately boring: don't try to repair it in place, just eject the contents and solve it as a case you already know. Two extra moves, no new memory. Hunting for these on purpose today is the point — in a real solve they turn up often enough that hesitation here costs more than the moves do."},
  {t:"Both pieces up top",m:20,f:"The most common situation in a real solve. Join the corner and edge first, then insert the finished pair.",d:"6 full F2L solves, untimed. Practise joining with R U' R' before inserting.",
   w:"This is the case you'll meet most often, so it's worth the most reps. Join first, then insert: two short moves. The failure mode is inserting the corner on its own and then going looking for the edge, which is the beginner method wearing a disguise and costs you the whole advantage of pairing."},
  {t:"Consolidation",m:20,f:"Cross and F2L end to end, beginner last layer. You're checking whether the intuition has stuck, not how fast it is.",d:"5 solves. Write down every case that took more than ten seconds to read.",
   w:"First time through the whole first two layers without stopping to think about which drill you're on. The written list matters more than the solves: tomorrow is built from it, and a specific list of four cases you actually stalled on is worth more than another hour of general solving. Resist timing yourself today — a stopwatch this early tells you nothing you can act on."},
  {t:"Review your gaps",m:15,f:"Only the cases you wrote down yesterday. Repetition on your actual weak spots beats another round of general solving.",d:"Set each case up by hand and solve it five times.",
   w:"Setting a case up by hand — scrambling deliberately so the case you want appears — is the single most useful practice technique in this programme, and it comes back in weeks 3 and 6. It lets you get twenty reps of the thing you're bad at in the time a random solve would give you one."},

  {t:"Orient the edges",m:15,f:"Two algorithms, and you're only making a yellow cross — ignore the corners completely. Line, L-shape, dot.",d:"Drill each ten times. The dot is just the other two run back to back, so don't memorise it separately.",
   w:"Full OLL is 57 algorithms. Splitting it into edges-then-corners brings it down to ten, and that split is the whole idea behind 2-look. Today you only care about the four edge stickers — the corners will be a mess afterwards and that is correct, not a mistake. Trying to fix corners at the same time is what makes people think OLL is hard."},
  {t:"Sune and Antisune",m:20,f:"The two cases where exactly one corner is already oriented. They are mirror images of each other, so learn them together.",d:"Apply each one repeatedly on a solved cube until it returns to solved — Sune comes back after six. 15 reps each.",
   w:"Two algorithms a day is the ceiling worth respecting; people who take on four forget all four by the weekend. Mirror pairs are the cheapest way to spend that budget, because the second one is mostly the first one reflected. Sune is the backbone of the whole corner set — several of the cases still to come are Sune with something wrapped around it, so time spent here pays off three more times."},
  {t:"T and Bowtie",m:20,f:"Two cases with two corners already oriented. Both use the wide r turn, which moves two layers at once.",d:"15 reps each. Check that your r is turning two layers, not slipping into a single R.",
   w:"The wide turn is the new mechanical idea here, and it's worth a minute of deliberate attention — a wide turn that slips into a single-layer turn produces a scrambled cube and a confusing debugging session. These two also share a shape: both are the same insert-and-restore idea seen from different angles."},
  {t:"H and Pi",m:20,f:"The two cases where no corner is oriented at all. From directly above they look identical.",d:"15 reps each, and practise telling them apart before you turn.",
   w:"Both show a bare yellow cross with nothing else on top, so the only thing separating them is where the yellow side stickers sit — H has them facing left and right in pairs, Pi does not. This is the one case pair where looking only at the top face cannot possibly work, which is why the diagrams below draw the rim as well. Misreading H as Pi is among the most common recognition errors, and it costs a whole extra algorithm to recover from."},
  {t:"Headlights, then all seven",m:20,f:"The last corner case, then the full set together. After today you can orient any last layer that appears.",d:"15 reps of Headlights, then set up random corner cases and solve them. Beginner PLL to finish.",
   w:"Headlights is the odd one out with no mirror partner, so it gets a day mostly to itself and then the session turns into consolidation. Mixing all seven immediately is the point: drilling them one at a time builds execution but not recognition, and recognition is what you'll actually be short of."},
  {t:"Permute the corners",m:20,f:"Two cases. Look for headlights — a pair of matching corner colours on one side — and hold that side at the back.",d:"Drill the 3-cycle until it's automatic. The diagonal case is long but rare, so just know where to find it.",
   w:"Corners before edges, because the edge algorithms assume the corners are already home. The headlights are the recognition cue: exactly one face will show two matching corner stickers, and that face goes at the back. If no face shows headlights anywhere, you have the diagonal case — that absence is itself the recognition, and it's the only case where seeing nothing is the answer."},
  {t:"U-perms",m:20,f:"Three edges cycling. Find the edge that's already correct, hold it at the back, then work out whether the cycle runs clockwise or anticlockwise.",d:"M is the middle slice, turned the same direction as L. Drill Ua and Ub ten times each.",
   w:"Ua and Ub move exactly the same three edges and differ only in which direction they travel, so the whole difficulty is telling them apart, not executing them. Find the solved edge first, put it at the back, then read the remaining three — the arrows in the algorithm list show which way each one goes. If you learn the M slice with your left index finger rather than a full grip change, these stay fast for the rest of your cubing life."},

  {t:"H and Z perms",m:15,f:"The two cases where edges swap rather than cycle. All sixteen algorithms are now covered.",d:"Ten reps each. H is symmetrical, so you can start it from any angle.",
   w:"H swaps the two opposite pairs, Z swaps the two adjacent pairs. H being fully symmetrical means there is no wrong angle to start it from, which makes it the one last-layer case you never have to line up first. That completes the set: sixteen algorithms that between them solve any scramble you will ever be handed."},
  {t:"First full CFOP solves",m:20,f:"Everything together for the first time. Slow is correct here — the milestone is finishing without falling back on the beginner method, not the time.",d:"3 complete solves, notes allowed.",
   w:"Notes are allowed today on purpose. What's being tested is whether the pieces connect into one method, not whether you've finished memorising — that's the rest of this week. Expect this to feel slower than your beginner method and expect that to last a while. Everyone goes through a stretch where the new method is worse than the old one; it's a phase, not a signal to go back."},
  {t:"OLL recognition",m:15,f:"Almost every failed solve is a misread case, not a forgotten algorithm. So train the reading, not the turning.",d:"Set up a random OLL, name it out loud within three seconds, then execute. 15 reps.",
   w:"By now the algorithms are mostly in your hands and the bottleneck has moved to your eyes. Recognition and execution are separate skills, and practising full solves trains them together at whatever ratio the scramble happens to give you — which is far too little recognition. Naming the case out loud forces the recognition step to actually finish instead of blurring into the turning."},
  {t:"OLL recognition",m:15,f:"Same drill. You're building the reflex that turns a pattern into a name without conscious effort.",d:"15 reps. If you can't name it in three seconds, look it up and redo that case immediately.",
   w:"The three-second rule is the useful part. Sitting and puzzling it out eventually gets you the right answer and teaches you nothing, because in a real solve you won't have the time. Look it up, redo it straight away, and let the immediate correction do the work. The shift you want is from \"two corners point that way, so it must be...\" to simply seeing Sune."},
  {t:"PLL recognition",m:15,f:"Now the same for PLL, and from all four angles. The hard part is spotting a Ua while standing on the wrong side of it.",d:"Set up a case, rotate the cube to a random angle, name it. 15 reps.",
   w:"PLL recognition is harder than OLL because rotating the cube changes how the case looks without changing what it is, and there's no yellow-versus-not shortcut to fall back on. Rotating deliberately before you look is the whole drill. In a real solve the last layer arrives at whatever angle F2L happened to leave it, which is essentially random."},
  {t:"PLL recognition",m:15,f:"Corners first, then edges. Keep rotating before you look — recognising only from the front is the most common hidden weakness.",d:"15 reps, then 2 full solves.",
   w:"Front-only recognition hides well because it doesn't feel like a weakness: you read everything fine while practising, then stall in solves and blame execution. If one angle is consistently slower, drill that angle on its own rather than continuing to sample randomly. Check both stages explicitly — headlights or no headlights for the corners, then which edge is already home for the edges."},
  {t:"Notes closed",m:20,f:"The gate for the whole programme. If you can't get through a solve without opening your notes, repeat week 3 rather than moving on — nothing later works without this.",d:"4 full solves, notes shut. Mark which case sent you back to them.",
   w:"This is a real gate, not encouragement. Everything from week 4 onward trains speed and fluency, and neither is trainable while you're still looking things up — you'd be practising the lookup. Repeating a week here is much cheaper than pushing on and rebuilding later. Nobody is watching, and the programme is not a schedule you can fall behind on."},

  {t:"Plan the cross",m:20,f:"Take 30 seconds before each solve and plan all four cross edges before you touch the cube. Then execute without re-planning.",d:"5 solves. You're not racing, so use the full 30 seconds.",
   w:"In competition this is the 15-second inspection; here it's just a habit. Planning the cross in advance means the solve opens with continuous turning instead of a stop-start search, and it's the cheapest speed improvement available — no new algorithms, no faster hands. Use the whole 30 seconds even when you think you've got it; the goal is a complete plan, not a quick one."},
  {t:"Plan the cross",m:20,f:"Again. Most people can plan two edges immediately and stall on the third — that's the part worth the time.",d:"5 solves.",
   w:"Two edges is roughly what fits in visual memory without effort. The third and fourth need you to actually track pieces through the moves you've already planned, which is the skill being built. If you lose the plan halfway, start the planning again rather than solving what you can remember."},
  {t:"Plan the cross",m:20,f:"By the third session you should be finishing the cross without stopping to look for pieces.",d:"5 solves, then check: did you pause mid-cross at all?",
   w:"A pause mid-cross means the plan was incomplete, not that your hands were slow. That distinction matters because it tells you what to fix. Planning also sets up the next habit directly: with the cross already handled, your eyes are free during execution, which is what week 5 exploits."},
  {t:"Slot flexibility",m:20,f:"After the cross, solve the easiest pair you can see rather than always going to the front-right slot. This single habit is what stops you getting stuck.",d:"5 solves. Before each pair, scan all four slots and pick deliberately.",
   w:"Insisting on a fixed slot order means that on most scrambles you're solving a hard case when an easy one was sitting right there. Choosing costs nothing and removes most of the awkward cases from your solves entirely. This is probably the highest-value habit in the second half of the programme, and it's a decision, not a technique."},
  {t:"Slot flexibility",m:20,f:"Keep choosing. The goal is that no scramble ever presents you with a slot you feel obliged to solve.",d:"5 solves.",
   w:"The word to watch is \"obliged\". If you notice yourself going to a slot because it's next rather than because it's easiest, you've slipped back into a fixed order without deciding to."},
  {t:"Slot flexibility",m:20,f:"Last session on choice. You should be picking a slot without thinking of it as a decision.",d:"5 solves.",
   w:"Deliberate choice becoming automatic choice is the transition here. Once it's automatic you stop spending attention on it, which frees that attention for the tracking work in week 5."},
  {t:"Checkpoint",m:20,f:"A read on where the remaining friction lives before the last two weeks.",d:"5 full solves. Note where you paused longest — cross, F2L, or last layer.",
   w:"Diagnostic, not a test. Two weeks of specific work are coming and they'll be worth more if aimed at something real. Most people find the answer is F2L, simply because it's the longest phase and the least algorithmic — but check rather than assume, because if it's actually last-layer recognition then week 5's look-ahead work is aimed at the wrong problem."},

  {t:"Look-ahead",m:20,f:"While inserting one pair, keep your eyes on the next pair's pieces. Turn at half speed so your eyes can get ahead of your hands. This feels counterproductive and is the most effective drill in the programme.",d:"4 solves at deliberately slow turning speed. No fast turning today at all.",
   w:"Fast solving isn't fast turning — it's turning without stopping, and the pauses between phases cost far more than the moves themselves. You can only remove a pause by knowing what comes next before you arrive, which means looking ahead while your hands are busy. Slowing down is what makes room for that, which is why the drill feels wrong and works anyway. Almost every speedcuber names this as the thing that broke their plateau."},
  {t:"Look-ahead",m:20,f:"Still slow. If you catch yourself speeding up, you've stopped tracking and gone back to reacting.",d:"4 slow solves.",
   w:"Speeding up is the reliable symptom: turning fast is comfortable precisely because it needs no tracking. Treat the moment you notice it as information rather than a failure, slow back down, and carry on."},
  {t:"Look-ahead",m:20,f:"Third session. You should be finding the next pair before the current insertion finishes.",d:"4 slow solves, then 1 at normal speed to compare.",
   w:"The comparison solve at the end is the interesting one. Most people find their normal-speed time has improved even though they've spent three sessions deliberately turning slowly — which is the clearest evidence available that pauses, not turning speed, were the bottleneck."},
  {t:"No stopping",m:20,f:"Untimed solves with a single rule: never pause. Pausing is the thing you're trying to remove, so treat each one as a bug to fix.",d:"4 solves. If you pause, finish the solve, then set that exact case up and drill it five times.",
   w:"Same target as look-ahead, approached from the other end: instead of building the skill that prevents pauses, hunt the pauses that remain. The repair routine is what makes it work — a pause tells you exactly which case is underlearned, and drilling it immediately closes the gap while you still remember what it was."},
  {t:"No stopping",m:20,f:"Same rule. The list of cases that make you stop should be getting shorter each session.",d:"4 solves, same repair routine.",
   w:"A shrinking list is the measure of progress this week, and it's a better one than time because it points at something you can act on. If the list isn't shrinking, the cases on it are probably recognition problems rather than execution problems — go back to naming them out loud."},
  {t:"No stopping",m:20,f:"Last session under the rule. Any case still causing a pause goes on your shortlist for week 6.",d:"4 solves. Write down anything that still stops you.",
   w:"Whatever survives three sessions of targeted repair is genuinely stubborn and deserves the concentrated treatment in days 39 and 40. Keep the list short — two cases handled properly beats eight handled loosely."},
  {t:"Checkpoint",m:20,f:"Consistency measured properly: no notes, no pauses, any scramble.",d:"6 solves. Log how many were completely clean.",
   w:"Clean solves out of six is a better measure than average time, because at this stage your average is dominated by the one solve that went wrong. Consistency is also what actually improves from here — the ceiling on your good solves moves slowly, but the floor comes up fast."},

  {t:"Under distraction",m:20,f:"Consistency means the method survives conditions that aren't ideal. Put a timer on, or a podcast, or solve standing up.",d:"5 solves with something competing for your attention.",
   w:"A method that only works when you're concentrating is not finished being learned. Distraction is a cheap way to find out which parts still need conscious attention, because those are exactly the parts that break first. Anything that occupies you a bit works — the specific distraction doesn't matter."},
  {t:"Under distraction",m:20,f:"Again, with a different distraction than yesterday. You're testing the method, not your concentration.",d:"5 solves.",
   w:"Varying it stops you adapting to one particular kind of interference, which would defeat the point. A timer competes for attention differently than a conversation does."},
  {t:"Under distraction",m:20,f:"Final session. If accuracy holds here, it will hold anywhere.",d:"5 solves.",
   w:"Holding up under interference is a stronger result than a good time under ideal conditions, and it's the one that transfers to solving in front of other people."},
  {t:"Your weakest two",m:20,f:"Pick the two cases that have given you the most trouble across all six weeks. Nothing else today.",d:"20 reps of each, set up by hand.",
   w:"You've been keeping the list since day 6. Narrow, concentrated repetition is what actually fixes a stubborn case; general solving gives you one rep of it every few minutes and lets you avoid it the rest of the time. Two is the right number — the temptation is to pick six and give none of them enough attention."},
  {t:"Your weakest two",m:20,f:"The same two. Two days of narrow focus fixes things that six weeks of general solving didn't.",d:"20 reps each, then 2 full solves to check they hold in context.",
   w:"The full solves at the end matter: a case can be solid in isolation and still fall apart when it arrives unannounced after F2L. If that happens, the problem was recognition rather than execution, and it needs the naming drill rather than more reps."},
  {t:"Ten in a row",m:20,f:"The final test of the programme. Any scramble, no notes, no fallback to the beginner method.",d:"10 consecutive solves. Target is 10 out of 10 clean.",
   w:"Ten consecutive solves is long enough that you can't hold concentration throughout, which is the point — it measures the method rather than your focus on the day. Eight or nine clean is a genuine pass; if you get five, the programme still worked, and the fix is more solving rather than more learning."},
  {t:"Where next",m:20,f:"You have a complete method that solves any scramble. Stopping here is a perfectly good outcome. If you want more, full PLL is the natural next step — a few algorithms at a time, not all 21 at once.",d:"Free solving. Decide whether you're done or expanding.",
   w:"Two-look CFOP with good look-ahead comfortably beats one-look CFOP with pauses, so there is nothing embarrassing about staying here — plenty of people solve in well under a minute on exactly these sixteen algorithms. If you do expand, full PLL is the better next step than full OLL: 21 algorithms rather than 57, and it removes a whole recognition step from every solve. Learn them a few at a time and keep using the ones you know in between."}
];

const STAGES = {
  cross: {h:"Cross", p:[
    "Four white edges on the bottom face, each matching its side centre. It is the one part of CFOP with no algorithms at all, and the one people under-practise most.",
    "The break from the beginner method is that the cross goes on the <b>bottom</b>, not the top. The beginner method builds it where you can watch it and then flips the cube; CFOP skips the flip so that every F2L pair afterwards drops into a slot you can already see. The cost is that you solve four pieces you can't look at directly, reading them from their side stickers instead.",
    "Any cross can be solved in eight moves or fewer, so if you are using fifteen the problem is planning rather than technique. The skill worth building is planning all four edges before you touch the cube — that alone removes the longest pause in most solves."
  ], bad:[
    "Turning the cube over mid-solve to check the cross.",
    "Solving the four edges one at a time instead of looking at how they interact.",
    "Skipping cross practice because it feels too easy to be worth a session."
  ]},
  f2l: {h:"First two layers", p:[
    "Corner and edge together, four times, filling the four slots between the cross and the last layer. This is the longest phase of the solve and the one where the time actually goes.",
    "The beginner method solves all four corners and then all four edges, with a separate algorithm each time. F2L does both at once. That halving is where most of CFOP's advantage comes from — more than the last-layer algorithms, which get all the attention.",
    "The method is three phases: <b>separate</b> the corner and edge into the top layer, <b>pair</b> them so they sit together, then <b>insert</b> the pair in one trigger. Learn it as that idea rather than as a list of sequences, because the full case list runs to 41 and memorising it is neither necessary nor recommended at this stage.",
    "Fair warning: your times will get <em>worse</em> when you start F2L, typically for a week or two. Everyone goes through it. It is the single most common point at which people give up and go back to the beginner method, which is why it is worth naming in advance."
  ], bad:[
    "Inserting the corner first and then going to look for its edge — that is the beginner method wearing a disguise.",
    "Always solving the front-right slot, so the other three stay unfamiliar.",
    "Breaking up a pair you have already solved.",
    "Learning mirrored algorithms for every slot instead of rotating with y."
  ]},
  oll: {h:"Orienting the last layer", p:[
    "Make the whole top face yellow, without caring where any piece ends up. Full OLL is 57 algorithms; splitting it into edges first, then corners, brings it down to ten. That split is what 2-look means.",
    "Stage one uses two algorithms and ignores the corners completely — you are only making a yellow cross. Stage two uses seven and orients the corners without disturbing the cross you just made.",
    "The seven corner cases sort themselves by how many corners are already yellow: two cases with one corner (Sune, Antisune), three with two (T, Bowtie, Headlights), and two with none (H, Pi). Counting first turns recognition from a memory problem into a much smaller lookup."
  ], bad:[
    "Trying to fix corners during the edge step.",
    "Reading H and Pi off the top face alone — they are identical up there and only the side stickers separate them.",
    "Taking on more than two new algorithms in a session. It reliably produces four half-learned ones."
  ]},
  pll: {h:"Permuting the last layer", p:[
    "Everything is yellow on top; now move the pieces to where they belong. Full PLL is 21 algorithms, and the two-look split brings it to six: corners first, then edges.",
    "Corners come first because the edge algorithms assume the corners are already home. There are only two corner cases, and they are told apart by <b>headlights</b> — a face showing two matching corner stickers. Find headlights and hold that face at the back; find none anywhere and you have the diagonal case.",
    "The four edge cases split the same way: two where three edges cycle (Ua and Ub, distinguished only by direction) and two where pairs swap (H for opposites, Z for neighbours). All four are built from the M slice, so time spent on that finger trick pays back across the whole set."
  ], bad:[
    "Doing edges before corners.",
    "Recognising cases only from the front, then stalling when the last layer arrives at a different angle.",
    "Confusing Ua and Ub — they move the same three pieces and differ only in which way round."
  ]}
};

const READING = [
  {t:"J Perm",u:"https://jperm.net/3x3/cfop",d:"The clearest free CFOP tutorials anywhere, plus algorithm trainers. Start here if you want video."},
  {t:"CubeSkills",u:"https://www.cubeskills.com/",d:"Feliks Zemdegs' site. Printable algorithm sheets and good blog posts on how to practise."},
  {t:"Speedsolving wiki",u:"https://www.speedsolving.com/wiki/index.php/CFOP",d:"Reference rather than tutorial — case lists, terminology, and the full 41-case F2L set when you want it."},
  {t:"Full PLL",u:"https://www.speedsolving.com/wiki/index.php/PLL",d:"The natural next step after this programme. 21 algorithms; learn a few at a time."}
];

/*== QUIZ:BEGIN ==*/
/* ---------------- quiz ----------------
   The retrieval half of the trainer: case table, presentation sampling,
   scoring and session composition.

   Pure by construction — no DOM, no globals, no clock, no Math.random. The
   cube engine and the stimulus renderer arrive as a `deps` adapter; time and
   randomness arrive as arguments. local/quiz_test.mjs slices this region out
   together with ENGINE, ALGS and DIAGRAM and runs it against the *real*
   renderer, because the presentation orbit is defined on the rendered picture:
   a stub renderer would exercise the machinery without exercising the masking
   rule that makes the answer come out the way it does.                      */
const QUIZ = (function(){

const AUF = ["", "U", "U2", "U'"];          // apply("") is the identity
const ID_RE = /^(oll|pll)\.[a-z0-9][a-z0-9-]*$/;
const SHORT_MAX = 12;

/* Deadlines are per item type, with no shared object to fall through to. One
   3 s/5 s rule applied to everything would auto-reveal every cross-planning
   item before anyone could type an algorithm on a phone, and score the lot
   wrong — which would poison the ledger rather than merely annoy. */
const DEADLINES = {
  T1:         { softMs: 3000, revealMs: 5000, onDemand: false, requeueWithin: 3 },
  T4_execute: { planMs: 0,     softMs: 20000, revealMs: null, onDemand: true },
  T4_plan:    { planMs: 30000, softMs: 15000, revealMs: null, onDemand: true }
};

/* Which cases each day introduces, by 0-based day index. The only place
   curriculum knowledge lives; `introDay` is derived from it rather than
   authored on the rows, because a row is a fact about the cube and this is a
   fact about the programme. */
const INTRO = {
  7:  ["oll.line","oll.l-shape","oll.dot"],
  8:  ["oll.sune","oll.antisune"],
  9:  ["oll.t","oll.bowtie"],
  10: ["oll.h","oll.pi"],
  11: ["oll.headlights"],
  12: ["pll.corners-3cycle","pll.corners-diagonal"],
  13: ["pll.ua","pll.ub"],
  14: ["pll.h","pll.z"]
};

/* What each quiz day prescribes. Days 8–15 get a recognition warm-up that sits
   *alongside* the physical reps the text asks for — recognition and turning are
   different skills, which is the page's own argument, so the quiz does not
   stand in for the drill there. Days 17–20 are the other way round: the text
   already describes exactly this task, so the quiz is the drill. */
const PRESCRIPTION = {
  0:  { kind:"T4", n:10, mode:"execute" },          // "10 crosses only"
  7:  { kind:"T1", n:8  }, 8:  { kind:"T1", n:8  },
  9:  { kind:"T1", n:8  }, 10: { kind:"T1", n:10 },  // H vs Pi, the costly confusion
  11: { kind:"T1", n:8  }, 12: { kind:"T1", n:8  },
  13: { kind:"T1", n:8  }, 14: { kind:"T1", n:8  },
  16: { kind:"T1", n:15 }, 17: { kind:"T1", n:15 },  // "name it within three seconds"
  18: { kind:"T1", n:15 }, 19: { kind:"T1", n:15 },
  21: { kind:"T4", n:5, mode:"plan" },               // "plan all four cross edges"
  22: { kind:"T4", n:5, mode:"plan" },
  23: { kind:"T4", n:5, mode:"plan" }
};

/* Blocked while a day's own cases are the point; interleaved once there is a
   set to confuse. Days 0–6 have no INTRO entry at all, so they cannot produce a
   recognition item — that falls out of the data rather than out of a guard. */
const BLOCKED_UNTIL = 13;
const poolModeFor = day => day <= BLOCKED_UNTIL ? "blocked" : "interleaved";

const CROSS_CASE = "cross.plan";   // one stable pseudo-case; the seed goes in extra

/* ---- presentation ----------------------------------------------------------
   Two factors in the schema, `auf` and `angle`, but in the plan view only one
   of them exists. Measured over all 16 cases: a quarter turn of the picture
   reproduces a picture some AUF already gives, because this view draws no side
   centres and so offers nothing for a rotation to be relative to. Turning the
   cube instead does not help — orient() absorbs every whole-cube rotation by
   construction. So `angle` stays in the schema and stays 0, and the day 19–20
   instruction to rotate is for the cube in the learner's hands.

   The sweep below is written over both factors anyway. The renderer decides
   whether `angle` does anything: today's picture function ignores it and the
   orbit comes out AUF-sized, and a future view that shows more than one face
   would widen the orbit with no change here.                                */
function stateFor(caseObj, auf, cube){
  return caseObj.setupState.apply(AUF[((auf | 0) % 4 + 4) % 4]);
}

/* The distinct views of one case, computed on the rendered picture and never
   authored. Two cases that differ as cube states can render identically —
   the renderer dims the corners on the edge-orientation cases — and sampling
   angle/auf uniformly over 0..3 would then log four values for one identical
   stimulus, corrupting the very latency analysis the log exists to support. */
function orbitOf(caseObj, deps){
  const seen = new Set(), out = [];
  for(let angle = 0; angle < 4; angle++)
    for(let auf = 0; auf < 4; auf++){
      const pic = deps.picture(caseObj, stateFor(caseObj, auf, deps.cube), angle);
      if(seen.has(pic)) continue;
      seen.add(pic);
      out.push({ angle, auf });
    }
  return out;
}

/* Uniform over the orbit — never over 0..3. */
function presentation(caseObj, rand){
  return caseObj.orbit[Math.floor(rand() * caseObj.orbit.length) % caseObj.orbit.length];
}

/* ---- the case table -------------------------------------------------------- */
function buildCases(algs, deps){
  const list = [], byId = new Map(), shorts = new Set();
  for(const stage of ["oll","pll"]){
    const group = algs[stage];
    if(!group || !Array.isArray(group.rows)) throw new Error("QUIZ: no " + stage + " rows");
    for(const row of group.rows){
      if(!ID_RE.test(String(row.id))) throw new Error("QUIZ: bad case id " + JSON.stringify(row.id));
      if(byId.has(row.id)) throw new Error("QUIZ: duplicate case id " + row.id);
      if(!row.short || row.short.length > SHORT_MAX)
        throw new Error("QUIZ: " + row.id + " needs a short name of at most " + SHORT_MAX + " characters");
      if(shorts.has(row.short)) throw new Error("QUIZ: duplicate short name " + JSON.stringify(row.short));
      const setupState = deps.cube.Cube.setup(row.a);
      if(!setupState) throw new Error("QUIZ: the setup for " + row.id + " does not parse");
      shorts.add(row.short);
      const c = { id: row.id, stage, name: row.n, short: row.short, cue: row.s,
                  alg: row.a, setupState, confusable: [], introDay: null, row };
      c.orbit = orbitOf(c, deps);
      list.push(c);
      byId.set(c.id, c);
    }
  }
  /* Confusions are authored one way and symmetrised here, so "H looks like Pi"
     cannot drift out of step with "Pi looks like H". */
  for(const c of list) for(const other of (c.row.confusable || [])){
    if(other === c.id) throw new Error("QUIZ: " + c.id + " is confusable with itself");
    if(!byId.has(other)) throw new Error("QUIZ: " + c.id + " is confusable with unknown case " + other);
    if(c.confusable.indexOf(other) < 0) c.confusable.push(other);
    const back = byId.get(other);
    if(back.confusable.indexOf(c.id) < 0) back.confusable.push(c.id);
  }
  for(const day of Object.keys(INTRO)) for(const id of INTRO[day]){
    if(!byId.has(id)) throw new Error("QUIZ: day " + day + " introduces unknown case " + id);
    if(byId.get(id).introDay !== null) throw new Error("QUIZ: " + id + " is introduced twice");
    byId.get(id).introDay = Number(day);
  }
  const orphan = list.find(c => c.introDay === null);
  if(orphan) throw new Error("QUIZ: " + orphan.id + " is never introduced by any day");
  return { list, byId, ids: list.map(c => c.id) };
}

/* ---- what a day asks for --------------------------------------------------- */
function plan(dayIndex){
  const p = PRESCRIPTION[dayIndex];
  if(!p) return null;
  return { kind: p.kind, n: p.n, mode: p.mode || null, day: dayIndex,
           poolMode: poolModeFor(dayIndex), newIds: INTRO[dayIndex] || [] };
}
/* True only where withholding the optimum is the point: the cross-planning
   days. Everywhere else "Skip to F2L" stays exactly what it was. */
function gatesCross(dayIndex){
  const p = PRESCRIPTION[dayIndex];
  return !!(p && p.kind === "T4" && p.mode === "plan");
}

/* ---- session composition ---------------------------------------------------- */
function shuffle(list, rand){
  const a = list.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1)) % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* A fold over the raw log. Aggregate for display, never on write — the log
   stays raw so the questions worth asking later stay answerable. */
function statsFrom(events){
  const by = {};
  for(const e of events){
    if(e.type !== "recog" || e.caseId == null) continue;
    const s = by[e.caseId] || (by[e.caseId] = { seen:0, correct:0, last10:[], lastSeen:0, latencies:[] });
    s.seen++;
    if(e.correct) s.correct++;
    s.last10.push(e.correct ? 1 : 0);
    if(s.last10.length > 10) s.last10.shift();
    if(e.ts > s.lastSeen) s.lastSeen = e.ts;
    if(e.latencyMs != null) s.latencies.push(e.latencyMs);
  }
  return by;
}
const accuracyOf = s => (s && s.last10.length) ? s.last10.reduce((a,b)=>a+b,0) / s.last10.length : 0;

/* Weakest first: never seen, then worst recent accuracy, then longest ago. */
function rankForReview(ids, stats){
  return ids.slice().sort((a,b)=>{
    const sa = stats[a], sb = stats[b];
    if(!sa !== !sb) return sa ? 1 : -1;
    if(!sa && !sb) return 0;
    const d = accuracyOf(sa) - accuracyOf(sb);
    if(d) return d;
    return sa.lastSeen - sb.lastSeen;
  });
}

function composeSession(opts){
  const dayIndex = opts.dayIndex, cases = opts.cases, stats = opts.stats || {}, rand = opts.rand;
  const p = plan(dayIndex);
  if(!p || p.kind !== "T1") return null;

  const learned = cases.list.filter(c => c.introDay != null && c.introDay <= dayIndex).map(c => c.id);
  const isNew = p.newIds.length > 0;
  const mainPool = p.poolMode === "blocked" && isNew ? p.newIds.slice() : learned.slice();
  /* Review draws from what is NOT today's new material. On a day that
     introduces nothing, everything is reviewable — which is what days 17-20
     are: the whole session is recall of the full set. */
  const reviewPool = isNew ? learned.filter(id => p.newIds.indexOf(id) < 0) : learned.slice();

  /* Review ADDS to the day's prescription rather than being carved out of it.
     Day 17 says fifteen items; taking 30% for review would quietly make it
     eleven. */
  const reviewN = Math.min(Math.round(0.3 * p.n), reviewPool.length);

  const main = [];
  if(mainPool.length){
    /* Every case introduced today is guaranteed at least one slot, so a day
       that teaches two cases cannot spend all eight items on one of them. */
    const guaranteed = isNew ? p.newIds.filter(id => mainPool.indexOf(id) >= 0) : [];
    for(const id of guaranteed) if(main.length < p.n) main.push(id);
    let bag = [];
    while(main.length < p.n){
      if(!bag.length) bag = shuffle(mainPool, rand);
      main.push(bag.pop());
    }
  }
  const shortlist = rankForReview(reviewPool, stats).slice(0, Math.max(reviewN * 3, reviewN));
  const review = shuffle(shortlist, rand).slice(0, reviewN);

  const items = shuffle(
    main.map(id => ({ id, isReview:false })).concat(review.map(id => ({ id, isReview:true }))),
    rand);
  return { day: dayIndex, kind:"T1", n: p.n, reviewN, poolMode: p.poolMode,
           mainPool, reviewPool, items };
}

/* ---- recognition items ------------------------------------------------------- */
function optionsFor(caseObj, k, pool, cases, rand){
  if(k >= cases.list.length) return shuffle(cases.ids, rand);
  const picked = [caseObj.id];
  const add = ids => {
    for(const id of ids){
      if(picked.length >= k) return;
      if(picked.indexOf(id) < 0) picked.push(id);
    }
  };
  /* Confusable cases first — the confusions this programme actually warns
     about are the distractors worth offering. Random alternatives are rejected
     on sight and train nothing. */
  add(shuffle(caseObj.confusable.filter(id => pool.indexOf(id) >= 0), rand));
  add(shuffle(caseObj.confusable, rand));
  add(shuffle(pool.filter(id => id !== caseObj.id && cases.byId.get(id).stage === caseObj.stage), rand));
  add(shuffle(pool.filter(id => id !== caseObj.id), rand));
  add(shuffle(cases.ids.filter(id => id !== caseObj.id), rand));
  return shuffle(picked, rand);
}

function makeRecogItem(caseObj, ctx){
  const p = presentation(caseObj, ctx.rand);
  const options = optionsFor(caseObj, ctx.k, ctx.pool, ctx.cases, ctx.rand);
  return { kind:"T1", caseId: caseObj.id, angle: p.angle, auf: p.auf, view:"plan",
           options,
           extra: { k: options.length, options, isReview: !!ctx.isReview,
                    poolMode: ctx.poolMode } };
}

function scoreRecog(item, chosenId){
  if(!item || !item.options) throw new Error("QUIZ: scoreRecog needs an item with options");
  if(item.options.indexOf(chosenId) < 0)
    throw new Error("QUIZ: " + chosenId + " was never offered for this item");
  return { correct: chosenId === item.caseId, chosen: chosenId };
}

/* A timed-out item comes back, but never with the identical picture: re-showing
   the same one measures whether they remember the image, not whether they know
   the case. One requeue per case per session, so a hard case cannot spiral. */
function requeueAt(index, total, within, rand){
  const span = Math.min(within, total - index - 1);
  if(span <= 0) return -1;
  return index + 1 + (Math.floor(rand() * span) % span);
}

/* ---- scoring: cross planning ------------------------------------------------
   The optimum is supplied by the caller. This region has no reference to the
   BFS solver at all, and that is deliberate rather than tidy: the solver's
   front door is a trap. crossStateAfter() returns a *solved* cross whenever a
   move string fails to parse, so solveCross("R U Q") answers "already solved,
   0 moves" — feed it a typo and the page congratulates you. Learner input has
   to be parsed and rejected before anything is computed from it, and the
   surest way to guarantee that is for the scorer to be unable to reach the
   solver even by accident.                                                   */
function classifyMoves(moves){
  const c = { face:0, slice:0, wide:0, rotation:0 };
  for(const m of moves){
    const b = m[0];
    if("UDRLFB".indexOf(b) >= 0) c.face++;
    else if("MES".indexOf(b) >= 0) c.slice++;
    else if("xyz".indexOf(b) >= 0) c.rotation++;
    else c.wide++;                                   // r l u d f b
  }
  return c;
}
function scoreCross(item, deps){
  const p = deps.cube.parseMoves(item.answer);
  if(!p.ok) return { ok:false, why:p.why, token:p.token };
  const end = deps.cube.Cube.solved().apply(item.scramble).apply(p.moves);
  if(!end) return { ok:false, why:"that scramble could not be applied" };
  const n = classifyMoves(p.moves);
  const turns = n.face + n.slice + n.wide;           // a rotation is not a turn
  const opt = item.optimum | 0;
  return {
    ok: true,
    /* crossSolved reads the oriented state, so M M' comes out solved and M does
       not, and a y in front of an otherwise correct answer is accepted. Odd
       slice counts are judged, never rejected. */
    solved: deps.cube.crossSolved(end),
    moves: turns, opt, delta: turns - opt,
    /* The optimum is the shortest FACE-TURN cross. An answer using slices or
       wides is counted in a different currency — and measurably so: on a third
       of these scrambles a slice solution really is shorter. Printing a signed
       delta across the two would tell a learner they beat a solver they never
       competed against, so the display has to know they are not comparable. */
    comparable: (n.slice + n.wide) === 0,
    faceTurns: n.face, sliceTurns: n.slice, wideTurns: n.wide, rotations: n.rotation
  };
}

/* ---- the one place a quiz event is constructed -----------------------------
   `day` comes from the caller, which captured it when the item was mounted —
   never from whatever day the page is showing when the answer lands. */
function eventFor(item, outcome){
  if(!item || !item.kind) throw new Error("QUIZ: eventFor needs an item");
  if(!Number.isInteger(outcome.day)) throw new Error("QUIZ: eventFor needs the day the item was mounted on");
  return {
    day: outcome.day,
    type: item.kind === "T1" ? "recog" : "cross",
    caseId: item.caseId,
    angle: item.angle | 0,
    auf: item.auf | 0,
    correct: !!outcome.correct,
    latencyMs: Math.max(0, Math.round(outcome.latencyMs || 0)),
    view: item.view || "plan",
    extra: Object.assign({}, item.extra || {}, outcome.extra || {})
  };
}

return { DEADLINES, INTRO, PRESCRIPTION, CROSS_CASE, AUF,
         buildCases, orbitOf, presentation, stateFor,
         plan, gatesCross, poolModeFor, eventFor,
         scoreCross, classifyMoves, scoreRecog,
         statsFrom, composeSession, optionsFor, makeRecogItem, requeueAt,
         rankForReview, accuracyOf, shuffle };
})();
/*== QUIZ:END ==*/

/* ---------------- scrambles ----------------
   A seeded random-move scrambler. The same seed always produces the same
   scramble, so "day 12, solve 3" is the same cube today and next month, on any
   device, with nothing stored. Note this is random-MOVE, not the random-STATE
   scrambling the WCA uses for competition — that needs a full solver. Measured
   over 3000 seeds, 20 moves leaves on average 8.3 of the 48 non-centre stickers
   matching, which is what a genuinely random state gives, so it is more than
   good enough to practise on. */
function hashSeed(str){                       // FNV-1a
  let h = 2166136261;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFrom(str){                        // mulberry32
  let a = hashSeed(str);
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FACES = ["U","R","F","D","L","B"], SUFFIX = ["","'","2"];
const AXIS = {U:0,D:0,R:1,L:1,F:2,B:2};
function makeScramble(seed, n){
  const rnd = rngFrom(seed), out = [];
  let guard = 0;
  while(out.length < (n||20) && guard++ < 500){
    const f = FACES[Math.floor(rnd()*6)];
    if(out.length && out[out.length-1][0] === f) continue;              // no R then R'
    if(out.length > 1 && AXIS[out[out.length-1][0]] === AXIS[f]
       && AXIS[out[out.length-2][0]] === AXIS[f]) continue;             // no R L R
    out.push(f + SUFFIX[Math.floor(rnd()*3)]);
  }
  return out.join(" ");
}

/* ---------------- cross solver ----------------
   Only the four white edges matter, so the search space is tiny: 12 slots and a
   flip for each of 4 pieces. We breadth-first the whole thing once from solved,
   then walk downhill from the scrambled state, which yields a provably optimal
   cross (never more than 8 moves). Move tables were generated from a verified
   cube simulator rather than written by hand. */
const EMOVE = {
  U:[[1,2,3,0,4,5,6,7,8,9,10,11],[0,0,0,0,0,0,0,0,0,0,0,0]],
  R:[[11,1,2,3,8,5,6,7,0,9,10,4],[0,0,0,0,0,0,0,0,0,0,0,0]],
  F:[[0,8,2,3,4,9,6,7,5,1,10,11],[0,1,0,0,0,1,0,0,1,1,0,0]],
  D:[[0,1,2,3,7,4,5,6,8,9,10,11],[0,0,0,0,0,0,0,0,0,0,0,0]],
  L:[[0,1,9,3,4,5,10,7,8,6,2,11],[0,0,0,0,0,0,0,0,0,0,0,0]],
  B:[[0,1,2,10,4,5,6,11,8,9,7,3],[0,0,0,1,0,0,0,1,0,0,1,1]]
};
/* EMOVE above covers only the six faces, so a scramble or a learner-typed
   solution containing M, a wide turn or a rotation would throw. Derive the
   missing tables from the facelet engine, which knows all eighteen: for each
   edge slot, find where its stickers land and whether they swapped. The six
   face tables are re-derived too and asserted against the hand-generated ones
   above, so this cannot drift from the version the BFS was verified with. */
const EDGE_FACELETS = [[5,10],[7,19],[3,37],[1,46],[32,16],[28,25],
                       [30,43],[34,52],[23,12],[21,41],[50,39],[48,14]];
(function extendEdgeMoves(){
  const slotOf = new Map();
  EDGE_FACELETS.forEach(([a,b],s)=>{ slotOf.set(a,[s,0]); slotOf.set(b,[s,1]); });
  const derive = perm => {
    const dest = new Array(12), flip = new Array(12);
    EDGE_FACELETS.forEach(([a],j)=>{
      const [from, swapped] = slotOf.get(perm[a]);
      dest[from] = j; flip[from] = swapped;
    });
    return [dest, flip];
  };
  for(const m of Object.keys(CUBE.PERM)){
    const [dest, flip] = derive(CUBE.PERM[m]);
    if(EMOVE[m]){
      const same = EMOVE[m][0].every((v,i)=>v===dest[i]) && EMOVE[m][1].every((v,i)=>v===flip[i]);
      if(!same) console.error("edge table for " + m + " disagrees with the engine");
    } else {
      EMOVE[m] = [dest, flip];
    }
  }
})();

const CROSS_HOME = [4,5,6,7];                 // DR, DF, DL, DB
const SOLVED_CROSS = encodeCross([4,5,6,7],[0,0,0,0]);
function encodeCross(pos, flip){
  return ((((pos[0]*12 + pos[1])*12 + pos[2])*12 + pos[3]) << 4)
       | (flip[0] | (flip[1]<<1) | (flip[2]<<2) | (flip[3]<<3));
}
function turnCross(pos, flip, face, times){
  const [dest, fl] = EMOVE[face];
  for(let t=0;t<times;t++)
    for(let i=0;i<4;i++){ flip[i] ^= fl[pos[i]]; pos[i] = dest[pos[i]]; }
}
/* All 18 moves, as [face, quarter-turns, printed name]. Note the name is not
   SUFFIX[t-1]: two quarter turns prints "2" and three prints "'", so that
   parseAlg(name) round-trips back to t. */
const turnName = (f,t) => f + (t === 2 ? "2" : t === 3 ? "'" : "");
const MOVES18 = [];
FACES.forEach(f => [1,2,3].forEach(t => MOVES18.push([f, t, turnName(f,t)])));

let crossDist = null;
function buildCrossTable(){
  if(crossDist) return crossDist;
  const N = 12*12*12*12*16;
  const dist = new Uint8Array(N).fill(255);
  dist[SOLVED_CROSS] = 0;
  let frontier = [[[4,5,6,7],[0,0,0,0]]];
  for(let d=0; frontier.length; d++){
    const next = [];
    for(const [p,f] of frontier){
      for(const [face,times] of MOVES18){
        const np = p.slice(), nf = f.slice();
        turnCross(np, nf, face, times);
        const k = encodeCross(np, nf);
        if(dist[k] === 255){ dist[k] = d+1; next.push([np,nf]); }
      }
    }
    frontier = next;
  }
  crossDist = dist;
  return dist;
}
/* Read the four white edges out of an oriented cube.

   This used to walk the 4-edge model directly from solved, which was fine for
   generated scrambles but wrong the moment a whole-cube rotation appeared: the
   edge model has no centres, so it cannot be centre-relative, and after a `y`
   it disagrees with the facelet engine about whether the cross is solved. Going
   through `orient()` puts both models in the same frame. Verified identical to
   the old path on 500 face-only scrambles. */
const CROSS_COLOURS = [[3,1],[3,2],[3,4],[3,5]];        // DR, DF, DL, DB
function crossStateOf(cube){
  const o = cube.o, pos = [-1,-1,-1,-1], flip = [0,0,0,0];
  EDGE_FACELETS.forEach(([a,b], slot)=>{
    const ca = o[a], cb = o[b];
    for(let i=0;i<4;i++){
      const [w0,w1] = CROSS_COLOURS[i];
      if((ca===w0 && cb===w1) || (ca===w1 && cb===w0)){
        pos[i] = slot;
        flip[i] = ca === 3 ? 0 : 1;                     // white on the slot's first facelet
      }
    }
  });
  return [pos, flip];
}
function crossStateAfter(alg){
  const c = CUBE.Cube.solved().apply(alg);
  return c ? crossStateOf(c) : [CROSS_HOME.slice(), [0,0,0,0]];
}

/* Frame note: because crossStateOf reads an *oriented* cube, a solution is
   expressed in the canonical frame (white down, green front). For every input
   this page actually produces that is a distinction without a difference —
   makeScramble emits face turns only, which never move the centres, so orient()
   is the identity there. It matters only for a hand-typed algorithm containing
   a whole-cube rotation, and T4 grades those by execution rather than by
   comparing against this solver's output. */
function solveCross(alg){
  const dist = buildCrossTable();
  let [pos, flip] = crossStateAfter(alg);
  const out = [];
  let d = dist[encodeCross(pos, flip)];
  while(d > 0){
    for(const [face, times, name] of MOVES18){
      const np = pos.slice(), nf = flip.slice();
      turnCross(np, nf, face, times);
      const nd = dist[encodeCross(np, nf)];
      if(nd === d-1){ out.push(name); pos = np; flip = nf; d = nd; break; }
    }
  }
  return out;
}

/* ---------------- notation helpers ---------------- */
/* Both of these now delegate to the engine's strict tokenizer. The old regex
   here silently skipped anything it did not recognise, so `y' R' U' R` parsed
   as `R' U' R` — a whole-cube rotation dropped without a word. That was latent
   only because invertAlg is called just on rows that have a diagram, and the
   two rotation-bearing algorithms are F2L rows, which have none. */
function parseAlg(alg){
  const p = CUBE.parseMoves(alg);
  return p.ok ? p.moves : [];
}
/* The setup for a case is simply the algorithm run backwards: apply it to a
   solved cube and you get exactly the case the algorithm solves. */
function invertAlg(alg){
  const p = CUBE.parseMoves(alg);
  return p.ok ? CUBE.fmtMoves(CUBE.invertMoves(p.moves)) : "";
}

/* ---------------- case index ----------------
   The stimulus a quiz item shows. PLL gets no arrow list on purpose: the arrows
   say what the algorithm does, which is the answer, so a recognition item that
   drew them would be handing it over. The presentation orbit is computed on
   exactly this function's output, so the picture the learner sees and the
   picture the dedupe ran on cannot come apart. */
const quizPicture = (c, state) =>
  c.stage === "oll" ? renderOLL(CUBE.ollEnc(state), !!c.row.edges)
                    : renderPLL(CUBE.pllRing(state), null);

/* buildCases throws on malformed data rather than building a half-table — but
   that is a message for the test suite, not for somebody trying to read day 12
   on a phone. If the data is ever bad, the quiz stays off and the rest of the
   page works. local/quiz_test.mjs is where this is supposed to be loud. */
let CASES = null;
try { CASES = QUIZ.buildCases(ALGS, { cube: CUBE, picture: quizPicture }); }
catch(e){ CASES = null; if(window.console) console.error("quiz disabled:", e.message); }

/* ---------------- state ----------------
   `done` is a projection of the event log, not a stored value. Nothing writes
   it directly; marking a day appends an event and the Set follows.          */
const st = { get: k => Store.get(k), set: (k,v) => Store.set(k,v),
             del: k => Store.del(k), now: () => Date.now() };

let profiles = [];      // [{id, name}] — keyed by a stable id, not the typed name
let active = "";        // profile id
let log = null;         // LOG handle for the active profile
let done = new Set();
let view = 0;

function activeProfile(){ return profiles.find(p => p.id === active) || profiles[0]; }
function saveProfiles(){ LOG.saveProfiles(st, profiles, active); }

function loadProgress(){
  quizEpoch++;                 // the log underneath the panel is being replaced
  loadGridPref();              // the answer-mode preference is per solver
  log = LOG.open(st, active);
  done = log.done();
  view = firstUndone();
}

/* The one way progress changes. */
function logEvent(ev){
  const ok = log.append(ev);
  done = log.done();
  if(!ok) storageFull();
  return ok;
}
function storageFull(){
  const box = $("storageWarn");
  box.innerHTML = "<b>Browser storage is full.</b> Your completed days and written notes are safe — " +
    "the oldest drill measurements were dropped to make room. Export your data from the bottom of " +
    "this page if you want to keep it, then reset the solver to clear space.";
  box.classList.add("show");
}

function firstUndone(){
  for (let i=0;i<DAYS.length;i++) if(!done.has(i)) return i;
  return DAYS.length-1;
}
const weekOf = i => WEEKS[Math.floor(i/7)];

/* ---------------- rendering ---------------- */
const $ = id => document.getElementById(id);

function renderProfiles(){
  const sel = $("profile");
  sel.innerHTML = "";
  profiles.forEach(p=>{
    const o = document.createElement("option");
    o.value = p.id; o.textContent = p.name; if(p.id===active) o.selected = true;
    sel.appendChild(o);
  });
}

function renderSession(){
  const day = DAYS[view], wk = weekOf(view);
  $("eyebrow").innerHTML =
    `<span class="chip" style="background:${wk.color}"></span>Week ${wk.n} — ${wk.name}`;
  $("card").style.setProperty("--accent", wk.color);
  $("daynum").textContent = "Day " + String(view+1).padStart(2,"0") + " of 42";
  $("title").textContent = day.t;
  $("mins").textContent = day.m + " min";
  $("focus").textContent = day.f;
  $("drill").textContent = day.d;
  $("why").textContent = day.w;

  const isDone = done.has(view);
  const btn = $("mark");
  btn.textContent = isDone ? "Completed — undo" : "Mark day complete";
  btn.classList.toggle("done", isDone);

  $("prev").disabled = view === 0;
  $("next").disabled = view === DAYS.length-1;

  renderScramble();
  reconcileQuiz();          // must follow renderScramble: T4's stimulus is the scramble
}

/* ---------------- scramble panel ---------------- */
let solveN = 1, seedOverride = "", scrambleView = -1, crossCommitted = false;
/* The scramble the panel is currently showing. It used to live only as the
   textContent of #scrambleMoves; the cross trainer needs it in JS, and reading
   a stimulus back out of the DOM is how a display bug becomes a scoring bug. */
let scrambleText = "";
function currentSeed(){
  const custom = seedOverride.trim();
  return custom || ("day-" + String(view+1).padStart(2,"0") + "-" + solveN);
}
function renderScramble(){
  if(scrambleView !== view){ scrambleView = view; solveN = 1; seedOverride = ""; }
  const seed = currentSeed();
  scrambleText = makeScramble(seed, 20);
  $("scrambleMoves").textContent = scrambleText;
  if($("seedInput").value !== seed) $("seedInput").value = seed;
  $("crossOut").classList.remove("show");
  $("crossOut").innerHTML = "";

  /* Same button, opposite pedagogical effect. On the cross-planning days it
     hands over the answer to the exact task being trained, so there it stays
     shut until the learner has committed a plan. Everywhere else it is the
     practice affordance it has always been. */
  crossCommitted = false;
  const gated = QUIZ.gatesCross(view);
  const btn = $("crossBtn");
  btn.textContent = gated ? "Reveal the optimum" : "Skip to F2L";
  btn.disabled = gated;
  btn.title = gated ? "Available once you have committed a plan" : "";

  quizScrambleChanged();
}
function showCross(){
  const box = $("crossOut");
  if(QUIZ.gatesCross(view) && !crossCommitted) return;      // the reveal is earned here
  if(owns() && quiz.live) quiz.item.revealed = true;
  if(box.classList.contains("show")){ box.classList.remove("show"); return; }
  const moves = solveCross(scrambleText);
  box.innerHTML = moves.length
    ? `Cross: <b>${moves.join(" ")}</b><i>${moves.length} move${moves.length===1?"":"s"} — apply this after the scramble, then practise F2L from there. It is the shortest cross that exists for this scramble, so don't treat it as the one you should have found.</i>`
    : `Cross: <b>already solved</b><i>This scramble happens to leave the cross intact.</i>`;
  box.classList.add("show");
}

function renderGrid(){
  const host = $("weeks");
  host.innerHTML = "";
  WEEKS.forEach((wk,wi)=>{
    const row = document.createElement("div");
    row.className = "week";
    const lab = document.createElement("div");
    lab.className = "wlabel";
    lab.textContent = "Wk " + wk.n;
    lab.title = wk.name;
    row.appendChild(lab);
    for(let d=0; d<7; d++){
      const i = wi*7 + d;
      const b = document.createElement("button");
      b.className = "sticker";
      b.style.setProperty("--c", wk.color);
      if(done.has(i)) b.classList.add("done");
      if(!wk.light) b.classList.add("lightless");
      if(i === view) b.classList.add("today");
      b.innerHTML = `<span class="n">${i+1}</span>`;
      b.setAttribute("aria-label", `Day ${i+1}: ${DAYS[i].t}${done.has(i)?" (complete)":""}`);
      b.addEventListener("click", ()=>{ view = i; renderSession(); renderGrid(); });
      row.appendChild(b);
    }
    host.appendChild(row);
  });
  const n = done.size;
  $("tally").innerHTML = `<b>${n}</b> of 42 sessions · week ${Math.min(6,Math.floor(firstUndone()/7)+1)}`;
}


let tab = "oll";
function renderAlgs(){
  const t = $("tabs"); t.innerHTML = "";
  Object.entries(ALGS).forEach(([k,v])=>{
    const b = document.createElement("button");
    b.className = "tab"; b.setAttribute("role","tab");
    b.setAttribute("aria-selected", k===tab ? "true":"false");
    b.textContent = v.label;
    b.addEventListener("click", ()=>{ tab = k; renderAlgs(); });
    t.appendChild(b);
  });

  const primer = STAGES[tab], host = $("primer");
  if(primer){
    host.innerHTML =
      `<h4>${primer.h}</h4>` + primer.p.map(x=>`<p>${x}</p>`).join("") +
      `<div class="pitfalls"><div class="k">Where it goes wrong</div><ul>` +
      primer.bad.map(x=>`<li>${x}</li>`).join("") + `</ul></div>`;
    host.style.display = "";
  } else {
    host.style.display = "none";
  }

  const l = $("alist"); l.innerHTML = "";
  ALGS[tab].rows.forEach(r=>{
    const div = document.createElement("div");
    const diagram = r.e ? renderOLL(r.e, !!r.edges) : (r.r ? renderPLL(r.r, r.x) : null);
    div.className = "arow" + (diagram ? "" : " nodiagram");
    div.innerHTML =
      (diagram ? `<div class="acase" aria-hidden="true">${diagram}</div>` : "") +
      `<div class="aname">${r.n}<small>${r.s}</small></div>` +
      `<div class="alg${tab==="f2l"?" plain":""}">${r.a}` +
        (diagram ? `<span class="setup"><b>set up</b> ${invertAlg(r.a)}</span>` : "") +
        (r.id ? `<a class="stepl" href="lastlayer.html?case=${r.id}">step through it in 3D &rarr;</a>` : "") +
      `</div>` +
      (r.note ? `<details class="anote"><summary>What it does</summary><p>${r.note}</p></details>` : "");
    l.appendChild(div);
  });
  l.style.display = ALGS[tab].rows.length ? "" : "none";
}

function renderReading(){
  $("reading").innerHTML =
    `<div class="k">If you want to go further</div><ul>` +
    READING.map(r=>`<li><a href="${r.u}" rel="noopener noreferrer" target="_blank">${r.t}</a> <span>— ${r.d}</span></li>`).join("") +
    `</ul>`;
}

function renderAll(){ renderProfiles(); renderSession(); renderGrid(); renderAlgs(); renderReading(); }

/* Keydown targets are not always Elements — a synthetic event dispatched on
   document has no .matches, and calling it unguarded throws inside the handler
   and silently kills every later binding on that listener. */
const typing = e => !!(e.target && e.target.matches && e.target.matches("input,select,textarea"));

/* ---------------- the trainer panel ----------------
   The one genuinely dangerous thing in this file. Nothing inside #card is ever
   destroyed — renderSession only writes textContent into nodes that already
   exist — so a panel mounted here survives a day change with its DOM, its
   listeners and its pending timers entirely intact. A 5-second reveal armed on
   day 17 would otherwise fire while the learner is reading day 18 and log an
   event against the wrong day, and that does not look like a bug afterwards.
   It looks like data.

   Three guards, but they are not equals and it is worth being straight about
   which one does the work:

     1. LOAD-BEARING — one timers[] array, cleared by one unmountQuiz(), which
        reconcileQuiz calls whenever the ownership token changes. Plus the
        owns()/phase checks at the entry points (commitCross, endPlanning,
        tickPlan). Break either and local/mutate_quiz.sh goes red.
     2. Deliberate redundancy — each timer callback re-checks the token it was
        armed under, and quizCommit re-checks ownership before writing.
     3. Deliberate redundancy — quiz.day is captured at mount and every event
        is written against it, so nothing here reads the module-level `view` at
        write time.

   (2) and (3) cannot be falsified by the current suite: with (1) working, no
   stray callback ever reaches them. That is the point of defence in depth, not
   evidence that they are tested — they exist for the path somebody adds next
   year without noticing this comment. Do not delete them on the grounds that
   removing them breaks nothing.                                              */
let quizEpoch = 0;      // bumped whenever the log or profile underneath changes
let quiz = null;        // the live session, or null
const timers = [];

/* Three coordinates, not one. `view` alone is not enough: switching profile or
   importing a file can land on the same day, and resetting on day 0 changes
   neither of them — quizEpoch is what catches those. */
const quizToken = () => view + "|" + active + "|" + quizEpoch;
const owns = () => quiz !== null && quiz.token === quizToken();

function later(fn, ms){
  const token = quizToken();
  const id = setTimeout(()=>{
    const at = timers.indexOf(id);
    if(at >= 0) timers.splice(at, 1);
    if(quiz === null || quiz.token !== token) return;   // belt, as well as braces
    fn();
  }, ms);
  timers.push(id);
  return id;
}
function clearTimers(){ while(timers.length) clearTimeout(timers.pop()); }

/* Every quiz write goes through here. `quiz.day` was captured at mount, so even
   a callback that somehow escaped both guards above would write against the day
   it belonged to — and the ownership check means it does not write at all. */
function quizCommit(item, outcome){
  if(!owns()) return false;
  return logEvent(QUIZ.eventFor(item, Object.assign({ day: quiz.day }, outcome)));
}

function unmountQuiz(){
  clearTimers();
  quiz = null;
  $("qstim").textContent = "";
  $("qprompt").textContent = "";
  $("qprompt").classList.remove("urgent");
  $("qans").textContent = "";
  $("qfeed").textContent = "";
  $("qfeed").className = "qfeed";
  $("qprog").textContent = "";
}

/* Called at the end of renderSession — the single choke point every one of the
   eight `view` assignments funnels through, keyboard arrows included, since
   those synthesise clicks on #prev/#next. */
function reconcileQuiz(){
  if(owns()){ renderQuiz(); return; }    // same day, same solver, same log: leave it alone
  unmountQuiz();
  const p = CASES && QUIZ.plan(view);
  if(!p){ $("quiz").hidden = true; return; }
  quiz = { token: quizToken(), day: view, plan: p, kind: p.kind, phase: "idle",
           i: 0, live: false, hits: 0, item: null, items: [], session: null,
           attempt: 0, requeued: {} };
  $("quiz").hidden = false;
  renderQuiz();
}

/* renderScramble is also reached directly from #nextScramble and #seedInput,
   which do not go through renderSession. Changing the scramble under a live
   item abandons it: nothing is logged, because an abandoned item is not data,
   and the item counter does not move, so n items always means n commits. */
function quizScrambleChanged(){
  if(!owns() || !quiz.live) return;
  /* renderScramble runs on every renderSession, not only when the scramble
     actually moves — so this has to check rather than assume, or marking a day
     complete would silently abandon and restart the item the learner is in the
     middle of, taking their half-typed answer with it. */
  if(quiz.item && quiz.item.scramble === scrambleText) return;
  clearTimers();
  quiz.live = false;
  startCrossItem();
}

const fmtClock = ms => Math.max(0, Math.ceil(ms / 1000)) + "s";

/* ---- T1: recognition ---- */
const GRID_FROM_DAY = 14;        // day 15 onward: name it from all 16, not from 4
let gridPref = null;             // learner override: null = follow the day, else true/false

const gridKey = () => "cfop.grid." + active;
function loadGridPref(){
  const v = Store.get(gridKey());
  gridPref = v === "16" ? true : v === "4" ? false : null;
}
function setGridPref(v){
  gridPref = v;
  if(v === null) Store.del(gridKey()); else Store.set(gridKey(), v ? "16" : "4");
}

function learnedIds(dayIndex){
  return CASES.list.filter(c => c.introDay != null && c.introDay <= dayIndex).map(c => c.id);
}
function recogK(dayIndex){
  const learned = learnedIds(dayIndex).length;
  const want = gridPref === null ? (dayIndex >= GRID_FROM_DAY ? 16 : 4) : (gridPref ? 16 : 4);
  /* Never offer a case the learner has not met. On day 8 only three exist, so
     the item is a 3-way choice — logged as k:3, which is what keeps the two
     modes poolable in analysis later. */
  return Math.max(2, Math.min(want, learned));
}

function startRecogSession(){
  if(!owns()) return;
  quiz.attempt++;
  const session = QUIZ.composeSession({
    dayIndex: quiz.day, cases: CASES,
    stats: QUIZ.statsFrom(log.all()),
    /* Seeded by day and attempt, so a session is reproducible and a repeat is
       not the same session over again. */
    rand: rngFrom("t1-" + quiz.day + "-" + quiz.attempt + "-" + active)
  });
  if(!session) return;
  quiz.session = session;
  quiz.items = session.items.slice();
  quiz.i = 0; quiz.hits = 0; quiz.requeued = {};
  quiz.rand = rngFrom("t1p-" + quiz.day + "-" + quiz.attempt);
  startRecogItem();
}

function startRecogItem(){
  if(!owns()) return;
  if(quiz.i >= quiz.items.length){ finishSession(); return; }
  const slot = quiz.items[quiz.i];
  const caseObj = CASES.byId.get(slot.id);
  if(!caseObj){ quiz.i++; startRecogItem(); return; }
  quiz.item = QUIZ.makeRecogItem(caseObj, {
    k: recogK(quiz.day), pool: learnedIds(quiz.day), cases: CASES,
    rand: quiz.rand, isReview: slot.isReview, poolMode: quiz.session.poolMode
  });
  if(slot.requeue) quiz.item.extra.requeue = 1;
  quiz.live = true;
  quiz.phase = "ask";
  quiz.t0 = Date.now();
  const rules = QUIZ.DEADLINES.T1;
  later(()=>{
    if(!owns() || quiz.phase !== "ask") return;
    $("qprompt").textContent = "Name it.";
    $("qprompt").classList.add("urgent");
  }, rules.softMs);
  later(()=> revealRecog(), rules.revealMs);
  renderQuiz();
}

function answerRecog(chosenId){
  if(!owns() || quiz.phase !== "ask") return;
  clearTimers();
  const r = QUIZ.scoreRecog(quiz.item, chosenId);
  finishRecogItem(r.correct, { chosen: chosenId });
}

/* The 5-second rule from day 18, made automatic: look it up, redo it straight
   away. Logged as a wrong answer rather than as nothing, because "could not
   name it in five seconds" is exactly the measurement this drill exists for. */
function revealRecog(){
  if(!owns() || quiz.phase !== "ask") return;
  clearTimers();
  finishRecogItem(false, { timedOut: 1 });
  const id = quiz.item.caseId;
  if(!quiz.requeued[id]){
    const at = QUIZ.requeueAt(quiz.i - 1, quiz.items.length, QUIZ.DEADLINES.T1.requeueWithin, quiz.rand);
    if(at > 0){
      quiz.requeued[id] = 1;
      /* A fresh presentation on the way back: re-showing the identical picture
         would measure whether they remember the image, not the case. */
      quiz.items.splice(at, 0, { id, isReview: false, requeue: true });
    }
  }
}

function finishRecogItem(correct, extra){
  quiz.live = false;
  quiz.phase = "shown";
  quiz.i++;
  if(correct) quiz.hits++;
  quizCommit(quiz.item, {
    correct, latencyMs: Date.now() - quiz.t0,
    extra: Object.assign({ item: quiz.i, of: quiz.items.length,
                           session: quiz.attempt }, extra)
  });
  markOptions(correct ? extra.chosen : null);
  renderQuiz();
  later(()=>{ if(owns()){ quiz.phase = "ask"; startRecogItem(); } }, correct ? 550 : 1300);
}

function markOptions(chosen){
  const host = $("qans").querySelector(".qopts");
  if(!host) return;
  for(const b of host.querySelectorAll(".qopt")){
    b.disabled = true;
    if(b.dataset.id === quiz.item.caseId) b.classList.add("right");
    else if(b.dataset.id === chosen) b.classList.add("wrong");
  }
  const c = CASES.byId.get(quiz.item.caseId);
  $("qprompt").classList.remove("urgent");
  $("qprompt").textContent = c ? c.name + " — " + c.cue : "";
}

function finishSession(){
  quiz.live = false;
  quiz.phase = "done";
  clearTimers();
  renderQuiz();
}

function renderRecogItem(){
  const stim = $("qstim"), ans = $("qans");
  const c = CASES.byId.get(quiz.item.caseId);
  const state = QUIZ.stateFor(c, quiz.item.auf, CUBE);
  stim.innerHTML = `<div class="qcase" aria-hidden="true">${quizPicture(c, state)}</div>`;
  ans.textContent = "";
  const host = document.createElement("div");
  host.className = "qopts" + (quiz.item.options.length > 6 ? " wide" : "");
  quiz.item.options.forEach((id, n)=>{
    const o = CASES.byId.get(id);
    const b = document.createElement("button");
    b.className = "qopt";
    b.dataset.id = id;
    b.innerHTML = `<span class="tag">${o.stage.toUpperCase()}</span>${esc(o.short)}`;
    b.setAttribute("aria-label", o.name + (quiz.item.options.length <= 4 ? ", key " + (n+1) : ""));
    b.addEventListener("click", ()=> answerRecog(id));
    host.appendChild(b);
  });
  ans.appendChild(host);
}

function startCrossItem(){
  if(!owns()) return;
  const mode = quiz.plan.mode === "plan" ? "T4_plan" : "T4_execute";
  const rules = QUIZ.DEADLINES[mode];
  quiz.item = { kind:"T4", caseId: QUIZ.CROSS_CASE, angle:0, auf:0, view:"plan",
                scramble: scrambleText, seed: currentSeed(), mode: quiz.plan.mode,
                revealed: false, planTimedOut: false };
  quiz.live = true;
  quiz.t0 = Date.now();
  quiz.phase = rules.planMs > 0 ? "plan" : "type";
  quiz.planEnds = rules.planMs > 0 ? Date.now() + rules.planMs : 0;
  quiz.planMs = 0;
  /* Build the 331,776-entry BFS table now rather than at commit. It costs about
     300ms of blocked main thread, which is invisible while the learner is
     staring at a scramble and very visible at the one moment they are waiting
     for an answer. Memoised, so this happens once per page load. */
  later(()=>{ buildCrossTable(); }, 400);
  if(quiz.phase === "plan") tickPlan();
  else later(()=>softPrompt(), rules.softMs);
  renderQuiz();
}
function tickPlan(){
  if(!owns() || quiz.phase !== "plan") return;
  const left = quiz.planEnds - Date.now();
  if(left <= 0){ quiz.item.planTimedOut = true; endPlanning(); return; }
  const el = $("qclock");
  if(el){ el.textContent = fmtClock(left); el.classList.toggle("low", left <= 5000); }
  later(tickPlan, 250);
}
function endPlanning(){
  if(!owns() || quiz.phase !== "plan") return;
  clearTimers();
  quiz.planMs = Date.now() - quiz.t0;
  quiz.phase = "type";
  later(()=>{ buildCrossTable(); }, 50);
  later(()=>softPrompt(), QUIZ.DEADLINES.T4_plan.softMs);
  renderQuiz();
  const box = $("qinput");
  if(box) box.focus();
}
function softPrompt(){
  if(!owns() || quiz.phase !== "type") return;
  $("qprompt").textContent = "Type what you planned — a partial cross still tells you something.";
  $("qprompt").classList.add("urgent");
}

function commitCross(){
  if(!owns() || quiz.phase !== "type") return;
  const box = $("qinput");
  const answer = box ? box.value : "";
  /* Parse before anything else touches this string. solveCross reports
     "already solved" for input it cannot read, so an unvalidated typo would be
     scored as a perfect cross. */
  const optimum = solveCross(quiz.item.scramble).length;
  const r = QUIZ.scoreCross({ scramble: quiz.item.scramble, answer, optimum }, { cube: CUBE });
  if(!r.ok){
    $("qfeed").className = "qfeed show wrong";
    $("qfeed").innerHTML = `That isn't notation I can read: ${esc(r.why)}` +
      (r.token ? ` <b>${esc(r.token)}</b>` : "") +
      `<i>Nothing was recorded — fix it and commit again.</i>`;
    return;                                   // deliberately no event
  }
  clearTimers();
  quiz.live = false;
  quiz.phase = "feedback";
  quiz.i++;
  if(r.solved) quiz.hits++;
  crossCommitted = true;
  $("crossBtn").disabled = false;

  quizCommit(quiz.item, {
    correct: r.solved,
    latencyMs: Date.now() - quiz.t0,
    extra: { mode: quiz.item.mode, item: quiz.i, of: quiz.plan.n, seed: quiz.item.seed,
             scramble: quiz.item.scramble, answer: answer.trim(),
             opt: r.opt, moves: r.moves, delta: r.delta, comparable: r.comparable,
             faceTurns: r.faceTurns, sliceTurns: r.sliceTurns,
             wideTurns: r.wideTurns, rotations: r.rotations,
             planMs: quiz.planMs, planTimedOut: quiz.item.planTimedOut ? 1 : 0,
             revealed: quiz.item.revealed ? 1 : 0 }
  });
  showCrossFeedback(r, optimum);
  renderQuiz();
}

function showCrossFeedback(r, optimum){
  const best = solveCross(quiz.item.scramble).join(" ") || "nothing — it was already solved";
  const box = $("qfeed");
  let html;
  if(!r.solved){
    html = `Not solved. The shortest cross here is ${optimum}: <b>${esc(best)}</b>` +
           `<i>Set the scramble up again and follow it through — the gap is usually one edge, not the whole plan.</i>`;
  } else if(!r.comparable){
    /* The optimum counts face turns only, so a slice answer is measured in a
       different currency. Printing "−1" here would tell the learner they beat a
       solver they never competed against. */
    const kind = r.sliceTurns ? "slice" : "wide";
    html = `Solved in ${r.moves}, using ${r.sliceTurns + r.wideTurns} ${kind} turn${r.sliceTurns + r.wideTurns === 1 ? "" : "s"}. ` +
           `The reference is the shortest cross using face turns only, which is ${optimum}: <b>${esc(best)}</b>` +
           `<i>Those are two different counts rather than a score to beat — slice moves can genuinely be shorter.</i>`;
  } else if(r.delta === 0){
    html = `Solved in ${r.moves}. That is the shortest cross that exists here.` +
           `<i>Nothing to improve on this one.</i>`;
  } else {
    html = `Solved in ${r.moves}. The shortest is ${optimum}: <b>${esc(best)}</b>` +
           `<i>${r.delta} move${r.delta === 1 ? "" : "s"} longer. Worth setting up again to see where the shorter route starts.</i>`;
  }
  box.className = "qfeed show " + (r.solved ? "right" : "wrong");
  box.innerHTML = html;
}

const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function renderQuiz(){
  if(!quiz) return;
  if(quiz.kind === "T1"){ renderRecogQuiz(); return; }
  const n = quiz.plan.n;
  const planning = quiz.plan.mode === "plan";
  $("qprog").textContent = quiz.phase === "idle"
    ? (planning ? `plan the cross · ${n} scrambles` : `${n} crosses`)
    : `item ${Math.min(quiz.i + (quiz.live ? 1 : 0), n)} of ${n}` +
      (quiz.i ? ` · ${quiz.hits}/${quiz.i} solved` : "");
  $("qStart").hidden = quiz.phase !== "idle" && quiz.phase !== "done";
  $("qStart").textContent = quiz.phase === "done" ? "Run it again" : "Start";
  $("qEnd").hidden = quiz.phase === "idle" || quiz.phase === "done";

  const stim = $("qstim"), ans = $("qans");
  /* Only rebuild the answer area when the phase actually changes. renderSession
     runs on every mark-complete, and a wholesale rebuild here would throw away
     a half-typed cross solution while the learner was looking at it. */
  const rebuild = quiz.rendered !== quiz.phase || !ans.firstChild;
  quiz.rendered = quiz.phase;
  if(!rebuild && quiz.phase !== "idle" && quiz.phase !== "done") return;
  ans.textContent = "";
  if(quiz.phase === "idle"){
    stim.textContent = planning
      ? "Plan all four cross edges from the scramble above before you touch the cube, then type the solution. The optimum stays hidden until you commit."
      : "Solve the cross from the scramble above, then type what you did. You can reveal the shortest cross at any time.";
    $("qprompt").textContent = "";
    return;
  }
  if(quiz.phase === "done"){
    stim.textContent = `Drill finished — ${quiz.hits} of ${quiz.i} solved.`;
    $("qprompt").textContent = "";
    return;
  }
  stim.textContent = planning
    ? "Plan the cross for the scramble above."
    : "Solve the cross for the scramble above, then type what you did.";

  if(quiz.phase === "plan"){
    const row = document.createElement("div");
    row.className = "qrow";
    const clock = document.createElement("span");
    clock.className = "qclock"; clock.id = "qclock";
    clock.textContent = fmtClock(quiz.planEnds - Date.now());
    const btn = document.createElement("button");
    btn.className = "btn sbtn"; btn.textContent = "I've planned it";
    btn.addEventListener("click", endPlanning);
    row.appendChild(clock); row.appendChild(btn);
    ans.appendChild(row);
    $("qprompt").textContent = "Work out all four edges before the clock runs out. Don't turn anything yet.";
    $("qprompt").classList.remove("urgent");
  } else if(quiz.phase === "type"){
    const box = document.createElement("input");
    box.className = "qinput"; box.id = "qinput";
    box.setAttribute("spellcheck","false"); box.setAttribute("autocomplete","off");
    box.setAttribute("aria-label","Your cross solution, in cube notation");
    box.placeholder = "e.g. F R' D2 L";
    box.addEventListener("keydown", e => { if(e.key === "Enter") commitCross(); });
    const row = document.createElement("div");
    row.className = "qrow";
    const go = document.createElement("button");
    go.className = "btn sbtn"; go.textContent = "Commit";
    go.addEventListener("click", commitCross);
    row.appendChild(go);
    ans.appendChild(box); ans.appendChild(row);
    if(!$("qprompt").classList.contains("urgent")) $("qprompt").textContent = "";
  } else if(quiz.phase === "feedback"){
    const row = document.createElement("div");
    row.className = "qrow";
    const next = document.createElement("button");
    next.className = "btn sbtn";
    next.textContent = quiz.i >= quiz.plan.n ? "Finish" : "Next scramble";
    next.addEventListener("click", nextCrossItem);
    row.appendChild(next);
    ans.appendChild(row);
    $("qprompt").textContent = "";
    $("qprompt").classList.remove("urgent");
  }
}

function renderRecogQuiz(){
  const total = quiz.items.length || quiz.plan.n;
  const k = recogK(quiz.day);
  $("qprog").textContent = quiz.phase === "idle"
    ? `name the case · ${quiz.plan.n} items${quiz.plan.n !== total && total ? "" : ""}`
    : `item ${Math.min(quiz.i + (quiz.live ? 1 : 0), total)} of ${total}` +
      (quiz.i ? ` · ${quiz.hits}/${quiz.i} named` : "");
  $("qStart").hidden = quiz.phase !== "idle" && quiz.phase !== "done";
  $("qStart").textContent = quiz.phase === "done" ? "Run it again" : "Start";
  $("qEnd").hidden = quiz.phase === "idle" || quiz.phase === "done";

  /* Four choices and sixteen are different tasks with different chance levels,
     so the learner can pick — and `k` is logged on every event, which is what
     keeps the two separable afterwards rather than silently pooled. */
  const mode = $("qMode"), learned = learnedIds(quiz.day).length;
  mode.hidden = learned <= 4;
  if(!mode.hidden){
    mode.textContent = k >= 16 ? "Show 4" : "Show all";
    mode.title = "Takes effect on the next item";
  }

  const stim = $("qstim"), ans = $("qans");
  if(quiz.phase === "idle"){
    stim.textContent = `A last-layer case appears; name it. ${k} choices, ` +
      `three seconds before a nudge and five before the answer — a case you can't name in five ` +
      `comes back later in the drill.`;
    ans.textContent = ""; $("qprompt").textContent = "";
    $("qprompt").classList.remove("urgent");
    return;
  }
  if(quiz.phase === "done"){
    stim.textContent = `Drill finished — ${quiz.hits} of ${quiz.i} named.`;
    ans.textContent = ""; $("qprompt").textContent = "";
    $("qprompt").classList.remove("urgent");
    return;
  }
  if(quiz.phase === "ask") renderRecogItem();
}

function nextCrossItem(){
  if(!owns()) return;
  if(quiz.i >= quiz.plan.n){ quiz.phase = "done"; $("qfeed").className = "qfeed"; renderQuiz(); return; }
  $("qfeed").className = "qfeed";
  $("qfeed").textContent = "";
  seedOverride = ""; solveN++;
  renderScramble();          // quiz.live is false here, so this does not abandon
  startCrossItem();
}

/* ---------------- theme ----------------
   Shares Quarto's storage key and values, so the choice made here is the choice
   the rest of the site sees, and vice versa. */
const THEME_KEY = "quarto-color-scheme";
function currentTheme(){
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function applyTheme(mode){
  document.documentElement.setAttribute("data-theme", mode);
  Store.set(THEME_KEY, mode === "dark" ? "alternate" : "default");
  const b = $("themeToggle");
  b.textContent = mode === "dark" ? "☀" : "☾";
  b.setAttribute("aria-label", mode === "dark" ? "Switch to light" : "Switch to dark");
  b.setAttribute("title", mode === "dark" ? "Switch to light" : "Switch to dark");
}

/* ---------------- events ---------------- */
$("themeToggle").addEventListener("click", ()=>{
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
});
$("mark").addEventListener("click", ()=>{
  const wasDone = done.has(view);
  const idx = view;
  /* Undo is recorded, not erased: a dayDone carrying correct:false. The fold in
     LOG.doneFrom takes the last one per day, so the grid reads the same either
     way while the log keeps what actually happened. */
  logEvent({ day: view, type: "dayDone", correct: !wasDone });
  if(!wasDone && view < DAYS.length-1) view = firstUndone();
  renderSession(); renderGrid();
  if(!wasDone){
    const cell = $("weeks").querySelectorAll(".sticker")[idx];
    if(cell){ cell.classList.add("pop"); setTimeout(()=>cell.classList.remove("pop"), 200); }
  }
});
$("nextScramble").addEventListener("click", ()=>{
  seedOverride = ""; solveN++; renderScramble();
});
$("crossBtn").addEventListener("click", showCross);
$("qStart").addEventListener("click", ()=>{
  if(!owns()) return;
  quiz.i = 0; quiz.hits = 0;
  $("qfeed").className = "qfeed"; $("qfeed").textContent = "";
  if(quiz.kind === "T1") startRecogSession(); else startCrossItem();
});
/* Number keys for the small grid — the day-18 drill is meant to be fast, and
   reaching for a mouse is part of what it is trying to remove. */
document.addEventListener("keydown", e=>{
  if(typing(e)) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  if(!owns() || quiz.kind !== "T1" || quiz.phase !== "ask") return;
  const n = Number(e.key);
  if(!Number.isInteger(n) || n < 1 || n > quiz.item.options.length || quiz.item.options.length > 6) return;
  e.preventDefault();
  answerRecog(quiz.item.options[n - 1]);
});
$("qMode").addEventListener("click", ()=>{
  if(!owns() || quiz.kind !== "T1") return;
  setGridPref(recogK(quiz.day) < 16);
  renderQuiz();
});
$("qEnd").addEventListener("click", ()=>{
  if(!owns()) return;
  clearTimers();
  quiz.live = false;
  quiz.phase = quiz.i ? "done" : "idle";
  renderQuiz();
});
/* A reveal firing in a background tab logs a timeout nobody saw. Abandon the
   item instead — it records nothing, which is the honest outcome. */
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden && owns() && quiz.live){
    clearTimers();
    quiz.live = false;
    quiz.phase = "idle";
    renderQuiz();
  }
});
window.addEventListener("pagehide", unmountQuiz);
$("seedInput").addEventListener("change", e=>{
  seedOverride = e.target.value; renderScramble();
});
$("prev").addEventListener("click", ()=>{ if(view>0){ view--; renderSession(); renderGrid(); }});
$("next").addEventListener("click", ()=>{ if(view<DAYS.length-1){ view++; renderSession(); renderGrid(); }});
$("profile").addEventListener("change", e=>{
  active = e.target.value; saveProfiles(); loadProgress(); renderAll();
});
$("addProfile").addEventListener("click", ()=>{
  const name = (prompt("Name for this solver") || "").trim();
  if(!name) return;
  const p = { id: LOG.newId(st, profiles), name };
  profiles.push(p);
  active = p.id; saveProfiles(); loadProgress(); renderAll();
});
$("reset").addEventListener("click", ()=>{
  const p = activeProfile();
  if(!confirm(`Clear all progress for ${p.name}? This erases the recorded event log too and can't be undone — export it first if you want to keep it.`)) return;
  log.wipe();
  quizEpoch++;                 // catches a reset while sitting on day 0, which no other coordinate sees
  done = log.done();
  view = 0; renderSession(); renderGrid();
  dataMsg(`Cleared everything for ${p.name}.`);
});

/* ---------------- export / import ----------------
   The log is the point of this iteration, so it has to be able to leave the
   browser. JSON round-trips exactly; the CSV is long format so read_csv() gives
   a usable frame with no parsing step. */
function dataMsg(text){ $("dataMsg").textContent = text; }
function fileStem(name){
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  return "cfop-" + (slug || "solver") + "-" + new Date().toISOString().slice(0,10);
}
function download(filename, text, mime){
  const url = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 0);
}
$("exportJson").addEventListener("click", ()=>{
  const p = activeProfile(), events = log.all();
  download(fileStem(p.name) + ".json", LOG.toJSON(p, events, new Date().toISOString()), "application/json");
  dataMsg(`Exported ${events.length} event${events.length===1?"":"s"} for ${p.name} as JSON.`);
});
$("exportCsv").addEventListener("click", ()=>{
  const p = activeProfile(), events = log.all();
  download(fileStem(p.name) + ".csv", LOG.toCSV(p, events), "text/csv");
  dataMsg(`Exported ${events.length} event${events.length===1?"":"s"} for ${p.name} as CSV.`);
});
$("importBtn").addEventListener("click", ()=> $("importFile").click());
$("importFile").addEventListener("change", e=>{
  const file = e.target.files && e.target.files[0];
  e.target.value = "";                       // so re-picking the same file fires again
  if(!file) return;
  const reader = new FileReader();
  reader.onerror = ()=> dataMsg("That file could not be read.");
  reader.onload = ()=> importText(String(reader.result));
  reader.readAsText(file);
});
function importText(text){
  const parsed = LOG.fromJSON(text);
  if(!parsed.ok){ dataMsg(parsed.error); return; }
  /* Identity is the profile id, so an export re-imported into the browser it
     came from merges back into the same solver. An export from somewhere else
     carries an id nothing here matches, and arrives as its own solver rather
     than silently blending into a same-named one. */
  let p = profiles.find(x => x.id === parsed.profile.id);
  let created = false;
  if(!p){
    let name = parsed.profile.name;
    if(profiles.some(x => x.name === name)) name += " (imported)";
    p = { id: parsed.profile.id, name };
    profiles.push(p);
    created = true;
  }
  active = p.id;
  saveProfiles();
  loadProgress();
  const merged = LOG.mergeEvents(log.all(), parsed.events);
  const ok = log.replaceAll(merged.events);
  quizEpoch++;
  done = log.done();
  view = firstUndone();
  renderAll();
  dataMsg(`Imported ${merged.added} new event${merged.added===1?"":"s"} into ${p.name}` +
          (created ? " (a new solver)" : "") + ". " +
          `${done.size} of 42 days complete.` + (ok ? "" : " Storage was full, so some of it did not save."));
  if(!ok) storageFull();
}
document.addEventListener("keydown", e=>{
  if(typing(e)) return;
  if(e.key === "ArrowLeft") $("prev").click();
  if(e.key === "ArrowRight") $("next").click();
});

/* ---------------- boot ----------------
   Order matters: migrate before anything writes. Reading legacy progress and
   deriving from an empty log the other way round would mirror an empty Set
   straight back over cfop.done.<name> and take the history with it. */
/* The browser harness loads the page with ?run=<phase>. Only then does it get a
   window on the quiz internals, so a test can assert on the actual timer count
   rather than on a proxy for it. Absent in normal use. */
if(new URLSearchParams(location.search).has("run"))
  window.__quiz = { timers: () => timers.length,
                    day:    () => quiz && quiz.day,
                    phase:  () => quiz && quiz.phase,
                    i:      () => quiz && quiz.i,
                    live:   () => !!(quiz && quiz.live),
                    epoch:  () => quizEpoch,
                    total:  () => quiz && quiz.items && quiz.items.length,
                    answerId: () => quiz && quiz.item && quiz.item.caseId,
                    options:  () => quiz && quiz.item && quiz.item.options };

applyTheme(currentTheme());
profiles = LOG.loadProfiles(st).profiles;
active = LOG.loadActive(st, profiles);
saveProfiles();
loadProgress();
renderAll();
