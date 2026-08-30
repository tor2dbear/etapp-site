// Builds the demo board's data from the fictional pucks in ./fixture.
//
// It does not *construct* the payload — it runs the product's own harvester over
// fixture/repos/**, exactly as a real instance is harvested. That is the whole point.
// The previous version hand-built the JSON, which meant it carried a second copy of
// every derivation the harvester does: parent → children, the rollup, and all eight
// signal rules, comments included. A rule added in `tor2dbear/roadmap` simply never
// reached the demo, so the board grew features its own shop window could not show.
//
// Two seams make it possible, both in harvest.mjs and both stubs rather than
// authoring paths: ROADMAP_ROOT points the harvester at this fixture's config,
// ROADMAP_ISSUE_STATES answers for issues that fictional repos do not have.
//
// Run: ROADMAP_HARVEST=../roadmap/scripts/harvest.mjs node demo/data/build.mjs
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, "fixture");

// The date every puck in the fixture is written relative to. Every `updated`,
// `created` and `target` is shifted forward by (today − EPOCH) before harvesting.
//
// The demo needs both things at once and this is how it gets them. The story is
// *stable* — same pucks, same relative ages, so a screenshot or a linked card keeps
// meaning — while the numbers are *fresh*, because the board renders "N days without
// an update" from `Date.now()` in the visitor's browser. Frozen dates age in public:
// the stale card read 60 days at the time this was written and would read 425 in a
// year, on a board whose threshold is 21.
const EPOCH = "2026-08-28";

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const shiftDays = Math.floor((Date.now() - Date.parse(EPOCH + "T00:00:00Z")) / DAY);
const shift = (d) => iso(Date.parse(d + "T00:00:00Z") + shiftDays * DAY);

const harvest = process.env.ROADMAP_HARVEST;
if (!harvest) {
  console.error("ROADMAP_HARVEST must point at the tool's scripts/harvest.mjs.");
  console.error("The demo runs the real harvester rather than imitating it — see the note above.");
  process.exit(1);
}

// Outside the repo on purpose. A crashed run leaves this directory behind, and inside
// the tree that is a scratch dir one push away from being committed — or, since the
// served bundle *is* the repo root, published. The guard would catch it; not creating
// it is better than being caught.
const work = path.join(await mkdtemp(path.join(os.tmpdir(), "etapp-demo-")), "root");
await cp(FIXTURE, work, { recursive: true });

// Materialise the relative ages into real dates the harvester can parse. Line-level
// and format-preserving, the same shape as the `roadmap` CLI's own field edits.
const DATE_FIELD = /^(updated|created|target): (\d{4}-\d{2}-\d{2})\s*$/;
let touched = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith(".md")) {
      const out = (await readFile(p, "utf8"))
        .split("\n")
        .map((l) => l.replace(DATE_FIELD, (_, k, d) => `${k}: ${shift(d)}`))
        .join("\n");
      await writeFile(p, out);
      touched++;
    }
  }
}
await walk(path.join(work, "repos"));

execFileSync(process.execPath, [path.resolve(harvest)], {
  stdio: ["ignore", "ignore", "inherit"],
  env: {
    ...process.env,
    ROADMAP_ROOT: work,
    ROADMAP_LOCAL_ROOT: path.join(work, "repos"),
    ROADMAP_ISSUE_STATES: path.join(work, "issues.json"),
    // The payload's own timestamp moves with the pucks, so the footer never claims
    // the board was generated before the work it shows.
    ROADMAP_BUILT_AT: new Date().toISOString(),
  },
});

for (const f of ["roadmap.json", "roadmap.js"]) {
  await cp(path.join(work, "data", f), path.join(HERE, f));
}
await rm(work, { recursive: true, force: true });

const payload = JSON.parse(await readFile(path.join(HERE, "roadmap.json"), "utf8"));
console.error(
  `✓ demo data: ${payload.total} items, ${payload.sources.length} projects, ` +
    `${touched} pucks shifted +${shiftDays}d from ${EPOCH}`,
);
