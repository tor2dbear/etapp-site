// Builds the demo board's data (fictional projects) → roadmap.json + roadmap.js.
// Run: node demo/data/build.mjs   (from repo root or here). Static output is committed.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GEN = "2026-08-16T18:40:00.000Z";
const nowMs = Date.parse(GEN);
const STATUSES = ["now", "next", "later", "inbox", "done"];
const STALE = { now: 21, next: 60 };

const sources = [
  { repo: "acme/aurora", name: "Aurora", color: "#8a7bab", blurb: "Design system" },
  { repo: "acme/relay",  name: "Relay",  color: "#5f80a3", blurb: "Realtime chat" },
  { repo: "acme/ledger", name: "Ledger", color: "#7d9163", blurb: "Personal finance" },
];

const raw = [
  // ── Aurora ──
  { repo: "acme/aurora", slug: "dark-mode-tokens", title: "Dark mode tokens", status: "now", tags: ["ui", "tokens"], updated: "2026-08-15", created: "2026-07-22", owner: "tor2dbear", body: "## Goal\nShip the full dark palette as design tokens so every app flips themes from one source." },
  { repo: "acme/aurora", slug: "icon-set-v2", title: "Icon set v2", status: "next", tags: ["ui"], updated: "2026-08-11", created: "2026-07-30", depends: ["dark-mode-tokens"], body: "## Goal\nRedraw the icon set on the new 24px grid. Waits on the token pass." },
  { repo: "acme/aurora", slug: "motion-guidelines", title: "Motion guidelines", status: "later", tags: ["motion"], updated: "2026-08-02", created: "2026-08-02", body: "## Goal\nA small, opinionated set of easing + duration tokens. Not another easing toy." },
  { repo: "acme/aurora", slug: "grid-system", title: "Grid & spacing system", status: "done", tags: ["layout"], updated: "2026-07-18", created: "2026-06-28", issue: 88, issueState: "open", body: "## Delivered\n4px base grid with responsive gutters. Shipped in v1.2." },
  { repo: "acme/aurora", slug: "figma-sync", title: "Figma sync plugin", status: "inbox", tags: ["tooling"], updated: "2026-08-09", created: "2026-08-09", body: "## Idea\nPush token changes straight into the Figma library. Undecided." },

  // ── Relay ──
  { repo: "acme/relay", slug: "typing-indicators", title: "Typing indicators", status: "now", tags: ["realtime"], updated: "2026-08-14", created: "2026-08-01", owner: "torbjorn", issue: 214, issueState: "closed", body: "## Goal\nShow who's typing, debounced, over the existing socket channel." },
  { repo: "acme/relay", slug: "search-index", title: "Message search index", status: "next", tags: ["backend"], updated: "2026-08-12", created: "2026-08-03", body: "## Goal\nBuild the inverted index that message search reads from." },
  { repo: "acme/relay", slug: "message-search", title: "Message search", status: "next", tags: ["search"], updated: "2026-08-13", created: "2026-08-05", depends: ["search-index"], owner: "tor2dbear", body: "## Goal\nFull-text search across a conversation. Blocked on the index." },
  { repo: "acme/relay", slug: "read-receipts", title: "Read receipts", status: "done", tags: ["realtime"], updated: "2026-07-29", created: "2026-07-10", body: "## Delivered\nPer-message read state, synced across devices." },
  { repo: "acme/relay", slug: "voice-notes", title: "Voice notes", status: "later", tags: ["audio"], updated: "2026-08-04", created: "2026-08-04", body: "## Goal\nRecord, waveform-preview and send short voice clips." },

  // ── Ledger ──
  { repo: "acme/ledger", slug: "statement-export", title: "Statement export (CSV)", status: "now", tags: ["export"], updated: "2026-07-01", created: "2026-06-20", owner: "tor2dbear", body: "## Goal\nExport a date range as CSV. (Note: gone quiet — the board flags it.)" },
  { repo: "acme/ledger", slug: "multi-currency", title: "Multi-currency accounts", status: "next", tags: ["core"], updated: "2026-08-10", created: "2026-07-25", owner: "torbjorn", body: "## Goal\nHold balances in more than one currency with daily FX." },
  { repo: "acme/ledger", slug: "double-entry", title: "Double-entry ledger", status: "done", tags: ["core"], updated: "2026-07-15", created: "2026-06-10", body: "## Delivered\nEvery transaction balances. The foundation everything else sits on." },
  { repo: "acme/ledger", slug: "budgets", title: "Budgets & envelopes", status: "inbox", tags: ["planning"], updated: "2026-08-08", created: "2026-08-08", body: "## Idea\nEnvelope-style budgeting on top of the ledger. Exploring." },
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
    owner: r.owner || null,
    body: r.body || "",
    sourcePath: `roadmap/${r.slug}.md`,
    sourceUrl: `https://github.com/${r.repo}/blob/main/roadmap/${r.slug}.md`,
    adapter: "pucks",
    native: true,
    signals: [],
  };
});

// resolve blockedBy (same-repo deps not done)
const bySlug = new Map(items.map((it) => [it.repo + " " + it.slug, it]));
for (const it of items) {
  it.blockedBy = it.depends.filter((d) => {
    const dep = bySlug.get(it.repo + " " + d);
    return dep && dep.status !== "done";
  });
}
// signals
const daysSince = (d) => (d ? Math.floor((nowMs - Date.parse(d + "T00:00:00Z")) / 864e5) : null);
for (const it of items) {
  const out = [];
  const ds = daysSince(it.updated);
  if ((it.status === "now" || it.status === "next") && ds != null && ds > STALE[it.status]) out.push({ type: "stale" });
  if (it.issueState === "closed" && it.status !== "done") out.push({ type: "issue-closed" });
  if (it.issueState === "open" && it.status === "done") out.push({ type: "issue-open" });
  it.signals = out;
}

const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
for (const it of items) counts[it.status]++;

const payload = {
  generatedAt: GEN,
  config: { title: "Etapp — demo", description: "A live Etapp board running on fictional data.", repoUrl: "https://github.com/tor2dbear/etapp", ribbon: "← Etapp · **live demo** · data is fictional", ribbonHref: "/" },
  statuses: STATUSES,
  counts,
  total: items.length,
  sources: sources.map((s) => ({ repo: s.repo, name: s.name, blurb: s.blurb, color: s.color, url: `https://github.com/${s.repo}`, adapter: "pucks", backend: "demo", count: items.filter((i) => i.repo === s.repo).length, native: true, error: null })),
  items,
};

await writeFile(path.join(HERE, "roadmap.json"), JSON.stringify(payload, null, 2) + "\n");
await writeFile(path.join(HERE, "roadmap.js"), "// Demo data — generated by build.mjs.\nwindow.__ROADMAP__ = " + JSON.stringify(payload) + ";\n");
console.error(`✓ demo data: ${items.length} items, ${sources.length} projects`);
