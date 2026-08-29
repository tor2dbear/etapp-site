// Builds the demo board's data (fictional projects) → roadmap.json + roadmap.js.
// Run: node demo/data/build.mjs   (from repo root or here). Static output is committed.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GEN = "2026-08-28T12:00:00.000Z";
const nowMs = Date.parse(GEN);
const STATUSES = ["now", "next", "later", "inbox", "done", "cancelled"];
const STALE = { now: 21, next: 60 };
const TERMINAL = { done: 1, cancelled: 1 };

const sources = [
  { repo: "acme/aurora", name: "Aurora", color: "#8a7bab", blurb: "Design system" },
  { repo: "acme/relay",  name: "Relay",  color: "#5f80a3", blurb: "Realtime chat" },
  { repo: "acme/ledger", name: "Ledger", color: "#7d9163", blurb: "Personal finance" },
];

const raw = [
  // ── Aurora ── an etapp (a puck other pucks point at) and its parts
  { repo: "acme/aurora", slug: "design-system-v2", title: "Design system v2", status: "now", tags: ["ui"], updated: "2026-08-27", created: "2026-07-20", owner: "tor2dbear", priority: "high", target: "2026-10-31", body: "## Goal\nThe umbrella for the v2 pass. It is not a second record type — the pucks below name it with `parent:`, and being pointed at is what makes it an etapp." },
  { repo: "acme/aurora", slug: "dark-mode-tokens", title: "Dark mode tokens", status: "done", tags: ["ui", "tokens"], updated: "2026-08-21", created: "2026-07-22", owner: "tor2dbear", parent: "design-system-v2", priority: "high", body: "## Delivered\nThe full dark palette as design tokens, so every app flips themes from one source." },
  { repo: "acme/aurora", slug: "icon-set-v2", title: "Icon set v2", status: "now", tags: ["ui"], updated: "2026-08-26", created: "2026-07-30", parent: "design-system-v2", depends: ["dark-mode-tokens"], agent: "design", priority: "medium", body: "## Goal\nRedraw the icon set on the new 24px grid. The token pass it waited for has landed." },
  { repo: "acme/aurora", slug: "motion-guidelines", title: "Motion guidelines", status: "next", tags: ["motion"], updated: "2026-08-24", created: "2026-08-02", parent: "design-system-v2", agent: "design", body: "## Goal\nA small, opinionated set of easing + duration tokens. Not another easing toy." },
  { repo: "acme/aurora", slug: "grid-system", title: "Grid & spacing system", status: "done", tags: ["layout"], updated: "2026-07-18", created: "2026-06-28", issue: 88, issueState: "open", body: "## Delivered\n4px base grid with responsive gutters. Shipped in v1.2.\n\n(The linked issue is still open — the board flags the disagreement.)" },
  { repo: "acme/aurora", slug: "figma-sync", title: "Figma sync plugin", status: "inbox", tags: ["tooling"], updated: "2026-08-25", created: "2026-08-25", body: "## Idea\nPush token changes straight into the Figma library. Undecided — nothing in the inbox is a promise." },

  // ── Relay ── a dependency chain, a discipline queue, a horizon
  { repo: "acme/relay", slug: "search", title: "Search", status: "next", tags: ["search"], updated: "2026-08-26", created: "2026-08-01", owner: "torbjorn", target: "2026-11-30", priority: "medium", body: "## Goal\nThe etapp that holds the search work. Its rollup counts the parts below." },
  { repo: "acme/relay", slug: "search-index", title: "Message search index", status: "now", tags: ["backend"], updated: "2026-08-27", created: "2026-08-03", parent: "search", agent: "backend", priority: "high", body: "## Goal\nBuild the inverted index that message search reads from." },
  { repo: "acme/relay", slug: "message-search", title: "Message search", status: "next", tags: ["search"], updated: "2026-08-25", created: "2026-08-05", parent: "search", depends: ["search-index"], owner: "tor2dbear", agent: "frontend", body: "## Goal\nFull-text search across a conversation. Blocked until the index exists — the board says so without anyone maintaining it." },
  { repo: "acme/relay", slug: "typing-indicators", title: "Typing indicators", status: "now", tags: ["realtime"], updated: "2026-08-28", created: "2026-08-01", owner: "torbjorn", issue: 214, issueState: "closed", priority: "urgent", body: "## Goal\nShow who is typing, debounced, over the existing socket channel.\n\n(The linked issue is closed — the board asks whether this should be done.)" },
  { repo: "acme/relay", slug: "read-receipts", title: "Read receipts", status: "done", tags: ["realtime"], updated: "2026-07-29", created: "2026-07-10", body: "## Delivered\nPer-message read state, synced across devices." },
  { repo: "acme/relay", slug: "voice-notes", title: "Voice notes", status: "later", tags: ["audio"], updated: "2026-08-04", created: "2026-08-04", body: "## Goal\nRecord, waveform-preview and send short voice clips." },
  { repo: "acme/relay", slug: "e2e-encryption", title: "End-to-end encryption", status: "cancelled", tags: ["security"], updated: "2026-08-06", created: "2026-07-02", body: "## Decision\nWon't do — not for this product, at this size. The file stays so the reasoning stays on record." },

  // ── Ledger ── staleness, a passed horizon, a broken link
  { repo: "acme/ledger", slug: "statement-export", title: "Statement export (CSV)", status: "now", tags: ["export"], updated: "2026-07-01", created: "2026-06-20", owner: "tor2dbear", agent: "backend", body: "## Goal\nExport a date range as CSV.\n\n(Gone quiet since July — the board flags a `now` puck untouched for more than 21 days.)" },
  { repo: "acme/ledger", slug: "multi-currency", title: "Multi-currency accounts", status: "next", tags: ["core"], updated: "2026-08-22", created: "2026-07-25", owner: "torbjorn", target: "2026-08-15", priority: "high", body: "## Goal\nHold balances in more than one currency with daily FX.\n\n(The horizon has passed — a third axis, flagged like the rest.)" },
  { repo: "acme/ledger", slug: "recurring-rules", title: "Recurring transaction rules", status: "next", tags: ["core"], updated: "2026-08-23", created: "2026-08-11", depends: ["fx-provider"], agent: "backend", body: "## Goal\nDetect and roll forward recurring transactions.\n\n(Depends on a puck that does not exist — an unknown blocker is not a finished one, so the board keeps it blocked and flags the reference.)" },
  { repo: "acme/ledger", slug: "double-entry", title: "Double-entry ledger", status: "done", tags: ["core"], updated: "2026-07-15", created: "2026-06-10", body: "## Delivered\nEvery transaction balances. The foundation everything else sits on." },
  { repo: "acme/ledger", slug: "budgets", title: "Budgets & envelopes", status: "inbox", tags: ["planning"], updated: "2026-08-20", created: "2026-08-20", priority: "low", body: "## Idea\nEnvelope-style budgeting on top of the ledger. Exploring." },
];

const short = (r) => r.split("/").pop();
const items = raw.map((r, i) => {
  const src = sources.find((s) => s.repo === r.repo);
  return {
    id: `${short(r.repo)}/${r.slug}`,
    repo: r.repo,
    repoName: src.name,
    repoColor: src.color,
    slug: r.slug,
    title: r.title,
    status: r.status,
    tags: r.tags || [],
    updated: r.updated || "",
    created: r.created || null,
    issue: r.issue ?? null,
    issueState: r.issueState ?? null,
    order: i * 10,
    depends: r.depends || [],
    blockedBy: [],
    blocks: [],
    missingDepends: [],
    parent: r.parent || null,
    parentRef: null,
    children: [],
    progress: null,
    target: r.target ?? null,
    priority: r.priority ?? null,
    agent: r.agent ?? null,
    owner: r.owner || null,
    body: r.body || "",
    sourcePath: `roadmap/${r.slug}.md`,
    sourceUrl: `https://github.com/${r.repo}/blob/main/roadmap/${r.slug}.md`,
    adapter: "pucks",
    native: true,
    signals: [],
  };
});

// The derivations the harvester does, in the same shape — the demo has to answer the
// same questions the real board does, or it demonstrates a different product.
const bySlug = new Map(items.map((it) => [it.repo + " " + it.slug, it]));
const settled = (it) => !!TERMINAL[it.status];

// blockedBy: the subset of `depends` that is not settled. A reference that resolves to
// nothing stays in, exactly as written — an unknown blocker is not a finished one.
for (const it of items) {
  it.blockedBy = it.depends.map((d) => {
    const dep = bySlug.get(it.repo + " " + d);
    if (!dep) { it.missingDepends.push(d); return d; }
    return settled(dep) ? null : dep.id;
  }).filter(Boolean);
}
// blocks: the exact mirror, so no second field can disagree with `depends`.
for (const it of items) {
  for (const b of it.blockedBy) {
    const up = items.find((x) => x.id === b);
    if (up) up.blocks.push(it.id);
  }
}
// A puck that other pucks point at *is* the etapp — only `parent:` is authored, the
// rest is derived here so a stored `children:` can never disagree with it.
for (const it of items) {
  if (!it.parent) continue;
  const p = bySlug.get(it.repo + " " + it.parent);
  if (!p) continue;
  it.parentRef = p.id;
  p.children.push(it.id);
}
for (const it of items) {
  if (!it.children.length) continue;
  const kids = it.children.map((id) => items.find((x) => x.id === id));
  it.progress = { done: kids.filter(settled).length, total: kids.length };
}
// signals
const daysSince = (d) => (d ? Math.floor((nowMs - Date.parse(d + "T00:00:00Z")) / 864e5) : null);
for (const it of items) {
  const out = [];
  const ds = daysSince(it.updated);
  if ((it.status === "now" || it.status === "next") && ds != null && ds > STALE[it.status]) out.push({ type: "stale" });
  if (it.issueState === "closed" && it.status !== "done") out.push({ type: "issue-closed" });
  if (it.issueState === "open" && it.status === "done") out.push({ type: "issue-open" });
  if (it.target && Date.parse(it.target + "T00:00:00Z") < nowMs && !settled(it)) out.push({ type: "target-passed" });
  if (it.missingDepends.length) out.push({ type: "depends-missing" });
  // Rollup drift, the same pair as the issue drift: terminal with unfinished parts, or
  // non-terminal with every part settled. A puck with no children is never flagged.
  if (it.progress) {
    if (settled(it) && it.progress.done < it.progress.total) out.push({ type: "rollup-open" });
    if (!settled(it) && it.progress.done === it.progress.total) out.push({ type: "rollup-done" });
  }
  it.signals = out;
}

const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
for (const it of items) counts[it.status]++;

const payload = {
  generatedAt: GEN,
  config: {
    title: "Etapp — demo",
    description: "A live Etapp board running on fictional data.",
    repoUrl: "https://github.com/tor2dbear/etapp",
    ribbon: "← Etapp · **live demo** · data is fictional",
    ribbonHref: "/",
    // Unlocks every write affordance and answers GitHub inside the page — see the
    // `DEMO` note in app.js. A real instance never sets this.
    demo: true,
    // Saved views are configuration, not truth — a named set of the same parameters the
    // URL carries. Without them the sidebar's Saved section is empty and a visitor never
    // learns the feature exists.
    views: [
      { name: "High priority", q: "priority:high,urgent" },
      { name: "By discipline", group: "agent", q: "has:agent" },
      { name: "Needs attention", view: "attention" },
    ],
  },
  statuses: STATUSES,
  counts,
  total: items.length,
  sources: sources.map((s) => ({ repo: s.repo, name: s.name, blurb: s.blurb, color: s.color, url: `https://github.com/${s.repo}`, adapter: "pucks", backend: "demo", count: items.filter((i) => i.repo === s.repo).length, native: true, error: null })),
  items,
};

await writeFile(path.join(HERE, "roadmap.json"), JSON.stringify(payload, null, 2) + "\n");
await writeFile(path.join(HERE, "roadmap.js"), "// Demo data — generated by build.mjs.\nwindow.__ROADMAP__ = " + JSON.stringify(payload) + ";\n");
console.error(`✓ demo data: ${items.length} items, ${sources.length} projects`);
