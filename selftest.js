/*  Plapp self-tests
    ------------------------------------------------------------------
    Runs the app's own pure functions (the ones exported for Node at the
    bottom of index.html) and checks they still behave correctly.
    These guard the fiddly logic that has broken before: over-midnight
    time ranges, block merging, date math, day parsing, formatting.

    Run:   node selftest.js            (tests index.html)
           node selftest.js FILE.html  (tests another build, e.g. staging)

    Exit code is 0 if everything passes, 1 if anything fails — so it can
    gate a release.
*/
const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "index.html";
const html = fs.readFileSync(path.join(__dirname, target), "utf8");

// Pull the single <script> block out of the page and require it as a module.
// In Node, IS_BROWSER is false, so the browser app never runs — but the
// top-level pure functions still load and export themselves via module.exports.
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("No <script> block found in " + target); process.exit(1); }
const tmp = path.join(__dirname, "._plapp_extracted.cjs");
fs.writeFileSync(tmp, m[1]);
let P;
try { P = require(tmp); }
finally { try { fs.unlinkSync(tmp); } catch (e) {} }

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log("  FAIL: " + name); }
}

/* ── formatting ── */
check("fmtHM 1.5 -> 1:30", P.fmtHM(1.5) === "1:30");
check("fmtHM 0 -> 0:00", P.fmtHM(0) === "0:00");
check("fmtHM 0.1 -> 0:06", P.fmtHM(0.1) === "0:06");
check("fmtHM 2.25 -> 2:15", P.fmtHM(2.25) === "2:15");
check("fmtH 1.5 -> 1.5", P.fmtH(1.5) === "1.5");

/* ── constants ── */
check("DAYS is Mon..Sat (6)", P.DAYS.length === 6 && P.DAYS[0] === "Mon" && P.DAYS[5] === "Sat");
check("TOTAL_SLOTS = 96", P.TOTAL_SLOTS === 96);
check("GROUP_ORDER includes work", P.GROUP_ORDER.indexOf("work") >= 0);

/* ── date helpers ── */
check("mondayOf(Fri 2026-07-31) = 2026-07-27", P.ymd(P.mondayOf(new Date(2026, 6, 31))) === "2026-07-27");
check("mondayOf(Mon 2026-07-27) = itself", P.ymd(P.mondayOf(new Date(2026, 6, 27))) === "2026-07-27");
check("weekDayIdx(Fri) = 4", P.weekDayIdx(new Date(2026, 6, 31)) === 4);
check("weekDayIdx(Sun) folds to Sat = 5", P.weekDayIdx(new Date(2026, 7, 2)) === 5);
check("ymd/parseYMD roundtrip", P.ymd(P.parseYMD("2026-10-12")) === "2026-10-12");

/* ── over-midnight and normal time ranges (has broken before) ── */
const overnight = P.parseTimeRange("11pm-1am");
check("11pm-1am parses", overnight && !overnight.error);
check("11pm-1am start = 23:00", overnight && overnight.startMin === 23 * 60);
check("11pm-1am spans 2h into next day", overnight && overnight.endMin - overnight.startMin === 120);
const day = P.parseTimeRange("9-11");
check("9-11 = 09:00..11:00", day && day.startMin === 540 && day.endMin === 660);
check("gibberish time -> null", P.parseTimeRange("no time here") === null);

/* ── block merging (parent/adjacent logic) ── */
const plan = (id, start, len) => ({ id, catId: "a", day: "Mon", startSlot: start, lenSlots: len, kind: "plan" });
const merged = P.mergeAdjacent([plan(2, 4, 4), plan(1, 0, 4)]);
check("two adjacent plan blocks merge into one", merged.length === 1);
check("merged block spans both (8 slots)", merged[0] && merged[0].lenSlots === 8);
check("merged block keeps lowest id", merged[0] && merged[0].id === 1);
const gapped = P.mergeAdjacent([plan(1, 0, 4), plan(2, 8, 4)]);
check("blocks with a gap do NOT merge", gapped.length === 2);
const actuals = P.mergeAdjacent([
  { id: 1, catId: "a", day: "Mon", startSlot: 0, lenSlots: 4, kind: "actual" },
  { id: 2, catId: "a", day: "Mon", startSlot: 4, lenSlots: 4, kind: "actual" },
]);
check("tracked (actual) blocks are never merged", actuals.length === 2);

/* ── day parsing ── */
check('parseDays("weekdays") = Mon..Fri', eq(P.parseDays("weekdays").days, [0, 1, 2, 3, 4]));
check('parseDays("Mon, Wed, Fri") = [0,2,4]', eq(P.parseDays("Mon, Wed, Fri").days, [0, 2, 4]));
check('parseDays("Tue-Thu") = [1,2,3]', eq(P.parseDays("Tue-Thu").days, [1, 2, 3]));

/* ── parent → children group attribution (groupContribs) ── */
if (P.groupContribs) {
  const near = (a, b) => Math.abs((a || 0) - (b || 0)) < 1e-9;
  const st = { categories: [
    { id: "M", name: "Mails", group: "none" },
    { id: "HM", name: "hmails", group: "home", parent: "M", splitPct: 50 },
    { id: "WM", name: "wmails", group: "work", parent: "M", splitPct: 30 },
    { id: "FM", name: "fmails", group: "fruit", parent: "M", splitPct: 20 },
    { id: "X", name: "Solo", group: "work" },
    { id: "P", name: "Plan", group: "none" },
    { id: "HP", name: "hplan", group: "home", parent: "P", splitPct: 1 },
    { id: "WP", name: "wplan", group: "work", parent: "P", splitPct: 1 },
    { id: "FP", name: "fplan", group: "fruit", parent: "P", splitPct: 2 },
  ] };
  const cM = P.groupContribs(st, "M");
  check("parent Mails splits home 0.5", near(cM.home, 0.5));
  check("parent Mails splits work 0.3", near(cM.work, 0.3));
  check("parent Mails splits fruit 0.2", near(cM.fruit, 0.2));
  check("parent contribs sum to 1", near((cM.home || 0) + (cM.work || 0) + (cM.fruit || 0), 1));
  check("parent Mails not counted in 'none'", !cM.none);
  const cX = P.groupContribs(st, "X");
  check("normal task -> own group only", near(cX.work, 1) && Object.keys(cX).length === 1);
  const cHM = P.groupContribs(st, "HM");
  check("child task -> own group", near(cHM.home, 1) && Object.keys(cHM).length === 1);
  const cP = P.groupContribs(st, "P");   // 1,1,2 → 0.25/0.25/0.5 (normalizes)
  check("Plan normalizes home 0.25", near(cP.home, 0.25));
  check("Plan normalizes fruit 0.5", near(cP.fruit, 0.5));
  // children with NO split % → split equally across them
  const stEq = { categories: [
    { id: "MM", name: "Mail", group: "none" },
    { id: "h", group: "home", parent: "MM" },
    { id: "w", group: "work", parent: "MM" },
  ] };
  const cEq = P.groupContribs(stEq, "MM");
  check("no-% children split equally (home 0.5)", near(cEq.home, 0.5));
  check("no-% children split equally (work 0.5)", near(cEq.work, 0.5));
  check("equal-split not in 'none'", !cEq.none);
  // Redistribution over a byCat map (mirrors summary/report logic)
  const byCat = { M: 10, X: 2, P: 4 };
  const g = {};
  for (const id in byCat) { const w = P.groupContribs(st, id); for (const gr in w) g[gr] = (g[gr] || 0) + byCat[id] * w[gr]; }
  check("redistribute home = 6 (5 from Mails + 1 from Plan)", near(g.home, 6));
  check("redistribute work = 6 (3 Mails + 2 Solo + 1 Plan)", near(g.work, 6));
  check("redistribute fruit = 4 (2 Mails + 2 Plan)", near(g.fruit, 4));
  check("redistribute puts nothing in 'none'", !g.none);
  check("redistribute total conserved = 16", near((g.home || 0) + (g.work || 0) + (g.fruit || 0), 16));
  // A parent block tracked as a split actual: buildReport already attributes to children groups
  const base = Date.UTC(2026, 6, 27);
  const stB = { anchorMonday: "2026-07-27", categories: st.categories, weeks: [ { blocks: [
    { kind: "actual", date: "2026-07-27", startMs: base, endMs: base + 10 * 3600000, catId: "M", split: { HM: 0.5, WM: 0.3, FM: 0.2 } },
  ] } ] };
  const bgB = P.buildReport(stB).days["2026-07-27"].byGroup;
  check("split actual block -> byGroup home 5", near(bgB.home, 5));
  check("split actual block -> byGroup work 3", near(bgB.work, 3));
  check("split actual block -> no 'none'", !bgB.none);
}

/* ── command pill: week scope ("whole masterplan" / "this week") ── */
if (P.parseCommand) {
  const cats = [{ id: "k", name: "KGB" }];
  const a = P.parseCommand("KGB mon 5-6", cats);
  check("default command scope = week", a.scope === "week" && a.kind === "task" && a.cat && a.cat.id === "k");
  const b = P.parseCommand("KGB mon whole masterplan 5-6", cats);
  check("'whole masterplan' → scope all", b.scope === "all" && b.kind === "task");
  check("scope-all still resolves task name", b.cat && b.cat.id === "k" && b.days && b.days[0] === 0);
  const c = P.parseCommand("KGB mon this week 5-6", cats);
  check("'this week' → scope week", c.scope === "week" && c.kind === "task");
  const d = P.parseCommand("KGB tue all weeks 9-10", cats);
  check("'all weeks' → scope all (+ day parsed)", d.scope === "all" && d.days && d.days[0] === 1);
  const e = P.parseCommand("KGB whole masterplan 5-6", cats);
  check("no weekday still errors (weekday required)", !!e.error);
  // a task literally named with a filler word ("Plan") should still resolve
  const catsP = [{ id: "p", name: "Plan" }, { id: "g", name: "Growth" }];
  const rp = P.parseCommand("Plan Mon 17:30-17:45", catsP);
  check("task named 'Plan' resolves", rp.kind === "task" && rp.cat && rp.cat.id === "p");
  const rpg = P.parseCommand("plan Growth mon 5-6", catsP);
  check("'plan Growth' still resolves to Growth", rpg.kind === "task" && rpg.cat && rpg.cat.id === "g");
}

/* ── report ── */
console.log("\nPlapp self-tests (" + target + "): " + pass + " passed, " + fail + " failed.");
process.exit(fail ? 1 : 0);
