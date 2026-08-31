// The guard has no net of its own, and it is the only thing between this repo and a
// repeat of what already happened once: 113 tracked files from node_modules/, verified
// live at 200 on etapp.tor2dbear.com. `.assetsignore` was not empty then — it was
// unread, because the command that asserts it never ran.
//
// These tests pin the pattern matcher, which is where the bugs were. Every case below
// is a form that was once wrong here, or one whose *correctness* something else now
// depends on. No browser, no runner, no install: node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SERVED, matcher, served, auditBundle } from "../scripts/check-bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("a pattern with slashes matches the whole path, not its segments", () => {
  // The bug this repo actually had (2026-08-29): the matcher compared the pattern
  // segment by segment against *each* path segment, so `demo/data/build.mjs` was
  // tested against `demo`, `data` and `build.mjs` separately and matched none of them.
  // The file it was supposed to exclude shipped.
  const m = matcher("demo/data/build.mjs");
  assert.ok(m("demo/data/build.mjs"), "must match the path it names");
  assert.ok(!m("demo"), "must not match a bare first segment");
  assert.ok(!m("build.mjs"), "must not match a bare last segment");
  assert.ok(!m("other/data/build.mjs"), "anchored: must not match under another root");
});

test("a leading slash anchors instead of being taken literally", () => {
  const m = matcher("/wrangler.jsonc");
  assert.ok(m("wrangler.jsonc"), "the slash anchors, it is not part of the name");
  assert.ok(!m("demo/wrangler.jsonc"), "anchored at the root, not at any depth");
});

test("an anchored directory answers for the files under it", () => {
  // `git ls-files` hands the audit whole paths and never the directory entry alone, so
  // a pattern naming a directory has to match a prefix of the path. Without this,
  // excluding `demo/data/fixture` would exclude nothing at all.
  const m = matcher("demo/data/fixture");
  assert.ok(m("demo/data/fixture/sources.json"));
  assert.ok(m("demo/data/fixture/repos/acme/aurora/roadmap/icon-set-v2.md"));
  assert.ok(!m("demo/data/roadmap.json"), "the sibling output still ships");
});

test("a slash-free pattern matches at any depth", () => {
  // Real gitignore semantics, and load-bearing here: `node_modules` has to catch a
  // nested one. It is also why the fixture's markdown was already excluded before it
  // had a rule of its own — by the `roadmap` line, which means something else. Right
  // outcome, wrong reason; pinned so nobody "fixes" the depth rule and reopens it.
  const m = matcher("node_modules");
  assert.ok(m("node_modules/playwright-core/package.json"));
  assert.ok(m("demo/vendor/node_modules/x/index.js"));
});

test("a glob never crosses a directory boundary", () => {
  const anchored = matcher("demo/*.js");
  assert.ok(anchored("demo/app.js"));
  assert.ok(!anchored("demo/data/build.mjs"), "* stops at the separator");

  const loose = matcher("*.log");
  assert.ok(loose("wrangler.log"));
  assert.ok(loose("deep/nested/wrangler.log"), "slash-free, so any depth");
  assert.ok(!loose("log"), "the dot is literal");
});

test("a trailing slash means the same as no trailing slash", () => {
  const withSlash = matcher("scripts/");
  const without = matcher("scripts");
  for (const p of ["scripts/check-bundle.mjs", "demo/scripts/x.mjs", "scripts"]) {
    assert.equal(withSlash(p), without(p), `disagreed on ${p}`);
  }
});

test("every SERVED rule matches something that is actually here", () => {
  // A rule matching nothing is either a stale rule or a file that went missing — and
  // the second one means the site is broken. Asks git for the tree rather than holding
  // a list of filenames, which is the same list this would be checking.
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const key of Object.keys(SERVED)) {
    assert.ok(
      tracked.some((f) => SERVED[key].test(f)),
      `SERVED["${key}"] matches no tracked file`,
    );
  }
});

test("the audit comes back clean on this repo", async () => {
  const a = await auditBundle(ROOT);
  assert.equal(a.fatal, undefined, a.fatal);
  assert.deepEqual(a.looseTracked, [], "tracked but neither served nor excluded");
  assert.deepEqual(a.looseOnDisk, [], "in the working tree and would be published");
  assert.deepEqual(a.listGap, [], "gitignored but not in .assetsignore");
});

test("auditBundle accepts a root with or without a trailing slash", async () => {
  // It used to accept only *with*, because every path inside is concatenated and the
  // one caller happened to pass `fileURLToPath(new URL("..", …))`, which ends in one.
  // Called the obvious way it reported "no .assetsignore — every file in the repo would
  // be published": the loudest thing this guard can say, about a repo where the file was
  // present. This test is the reason that was found.
  const withSlash = await auditBundle(ROOT + "/");
  const without = await auditBundle(ROOT);
  assert.equal(without.fatal, undefined, "a plain path must not read as a missing list");
  assert.deepEqual(without.looseTracked, withSlash.looseTracked);
  assert.deepEqual(without.looseOnDisk, withSlash.looseOnDisk);
});

test("the board's own three files are served, and the sources are not", async () => {
  for (const f of ["index.html", "demo/index.html", "demo/app.js", "demo/styles.css"]) {
    assert.ok(served(f), `${f} must ship`);
  }
  for (const f of ["package.json", "demo/data/build.mjs", "roadmap/README.md"]) {
    assert.ok(!served(f), `${f} must not be in the served set`);
  }
  await readFile(path.join(ROOT, ".assetsignore"), "utf8"); // exists, or the audit lies
});
