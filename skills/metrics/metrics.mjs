#!/usr/bin/env node
// Per-PR workflow metrics: merged PRs from GitHub joined, by branch name, with
// token usage from local Claude Code and Codex session logs.
// Usage: node metrics.mjs --repo owner/name [--since YYYY-MM-DD] > metrics.csv
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

// Checkouts are assumed to live at .../<owner>/<name> (ghq layout); worktrees under it.
export const inRepo = (cwd, repo) => cwd === repo || cwd.endsWith(`/${repo}`) || cwd.includes(`/${repo}/`);

export const repoOfUrl = (url) => url?.match(/github\.com[/:](.+?)(?:\.git)?\/?$/)?.[1];

const parse = (line) => {
  try { return JSON.parse(line); } catch { return null; }
};

// One Claude Code transcript line -> uncached tokens of one API response, keyed for dedup
// (the same response is written several times while streaming).
export function claudeUsage(line, repo) {
  if (!line.includes('"usage"')) return null;
  const d = parse(line);
  const u = d?.message?.usage;
  if (d?.type !== 'assistant' || !u || !d.gitBranch || !d.cwd || !inRepo(d.cwd, repo)) return null;
  return {
    key: `${d.message.id}:${d.requestId}`,
    branch: d.gitBranch,
    tokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.output_tokens ?? 0),
  };
}

// First line of a Codex rollout file -> { id, repo, branch } or null.
export function codexMeta(line) {
  const d = parse(line);
  const p = d?.type === 'session_meta' ? d.payload : null;
  if (!p?.git?.branch) return null;
  return { id: p.id, repo: repoOfUrl(p.git.repository_url), branch: p.git.branch };
}

// A Codex token_count event -> cumulative uncached tokens of the session so far.
export function codexTokens(line) {
  if (!line.includes('"token_count"')) return null;
  const t = parse(line)?.payload?.info?.total_token_usage;
  if (!t) return null;
  return (t.input_tokens ?? 0) - (t.cached_input_tokens ?? 0) + (t.output_tokens ?? 0);
}

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Pure join of everything collected into one row per merged PR.
export function buildRows({ prs, runs, regressionBodies, claude, codex }) {
  const shas = new Map();
  for (const r of runs) {
    if (!shas.has(r.headBranch)) shas.set(r.headBranch, new Set());
    shas.get(r.headBranch).add(r.headSha);
  }
  const regressedBy = new Map();
  for (const body of regressionBodies) {
    for (const [, n] of (body ?? '').matchAll(/regressed by #(\d+)/gi)) {
      regressedBy.set(Number(n), (regressedBy.get(Number(n)) ?? 0) + 1);
    }
  }
  return prs.map((pr) => {
    const opened = Date.parse(pr.createdAt);
    return {
      pr: pr.number,
      branch: pr.headRefName,
      title: pr.title,
      merged_at: pr.mergedAt,
      hours_to_merge: Math.round((Date.parse(pr.mergedAt) - opened) / 36e5 * 10) / 10,
      commits_after_open: pr.commits.filter((c) => Date.parse(c.committedDate) > opened).length,
      ci_rounds: shas.get(pr.headRefName)?.size ?? 0,
      claude_tokens: claude.get(pr.headRefName) ?? 0,
      codex_tokens: codex.get(pr.headRefName) ?? 0,
      regressions: regressedBy.get(pr.number) ?? 0,
    };
  });
}

export function summarize(rows) {
  const n = rows.length;
  const pct = (k) => (n ? Math.round(rows.filter(k).length / n * 100) : 0);
  return [
    `merged PRs: ${n}`,
    `merged with no commits after open: ${pct((r) => r.commits_after_open === 0)}%`,
    `median CI rounds: ${median(rows.map((r) => r.ci_rounds))}`,
    `median tokens per PR (uncached, Claude+Codex): ${median(rows.map((r) => r.claude_tokens + r.codex_tokens))}`,
    `PRs with no token data (branch not found in logs): ${pct((r) => r.claude_tokens + r.codex_tokens === 0)}%`,
    `regressions traced to these PRs: ${rows.reduce((a, r) => a + r.regressions, 0)}`,
  ].join('\n');
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
export const toCsv = (rows) =>
  rows.length ? [Object.keys(rows[0]), ...rows.map(Object.values)].map((r) => r.map(csvCell).join(',')).join('\n') : '';

function* jsonlFiles(dir, sinceMs) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* jsonlFiles(p, sinceMs);
    else if (e.name.endsWith('.jsonl') && statSync(p).mtimeMs >= sinceMs) yield p;
  }
}

const lines = (p) => createInterface({ input: createReadStream(p), crlfDelay: Infinity });

async function claudeTokensByBranch(repo, sinceMs) {
  const byKey = new Map();
  for (const f of jsonlFiles(join(homedir(), '.claude', 'projects'), sinceMs)) {
    for await (const line of lines(f)) {
      const u = claudeUsage(line, repo);
      if (u) byKey.set(u.key, u);
    }
  }
  const out = new Map();
  for (const { branch, tokens } of byKey.values()) out.set(branch, (out.get(branch) ?? 0) + tokens);
  return out;
}

async function codexTokensByBranch(repo, sinceMs) {
  const bySession = new Map(); // a resumed session can span files; keep its max cumulative total
  for (const f of jsonlFiles(join(homedir(), '.codex', 'sessions'), sinceMs)) {
    let meta;
    let max = 0;
    for await (const line of lines(f)) {
      if (meta === undefined) {
        meta = codexMeta(line);
        if (meta?.repo !== repo) break;
        continue;
      }
      max = Math.max(max, codexTokens(line) ?? 0);
    }
    if (meta?.repo !== repo) continue;
    const prev = bySession.get(meta.id);
    if (!prev || max > prev.tokens) bySession.set(meta.id, { branch: meta.branch, tokens: max });
  }
  const out = new Map();
  for (const { branch, tokens } of bySession.values()) out.set(branch, (out.get(branch) ?? 0) + tokens);
  return out;
}

const gh = (args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1 << 28 }));

async function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const repo = arg('repo');
  if (!repo) {
    console.error('usage: node metrics.mjs --repo owner/name [--since YYYY-MM-DD]');
    process.exit(2);
  }
  const since = arg('since') ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  // `gh pr list --json commits` also pulls commit authors and blows GraphQL's node limit.
  const query = `query($q: String!, $endCursor: String) {
    search(query: $q, type: ISSUE, first: 100, after: $endCursor) {
      pageInfo { hasNextPage endCursor }
      nodes { ... on PullRequest { number title headRefName createdAt mergedAt
        commits(first: 100) { nodes { commit { committedDate } } } } }
    }
  }`;
  const prs = gh(['api', 'graphql', '--paginate', '--slurp', '-f', `query=${query}`,
    '-f', `q=repo:${repo} is:pr is:merged merged:>=${since}`])
    .flatMap((page) => page.data.search.nodes)
    .map((p) => ({ ...p, commits: p.commits.nodes.map((n) => n.commit) }));
  // Logs and CI runs start when the PR's work started, which can predate --since.
  const startMs = Math.min(Date.parse(since), ...prs.map((p) => Date.parse(p.createdAt))) - 7 * 864e5;
  const start = new Date(startMs).toISOString().slice(0, 10);
  const runs = gh(['run', 'list', '-R', repo, '--created', `>=${start}`, '--limit', '10000',
    '--json', 'headBranch,headSha']);
  // A missing `regression` label just means none recorded yet.
  let regressions = [];
  try {
    regressions = gh(['issue', 'list', '-R', repo, '--label', 'regression', '--state', 'all',
      '--limit', '1000', '--json', 'body']);
  } catch { /* label absent */ }

  const [claude, codex] = await Promise.all([claudeTokensByBranch(repo, startMs), codexTokensByBranch(repo, startMs)]);
  const rows = buildRows({ prs, runs, regressionBodies: regressions.map((i) => i.body), claude, codex });
  console.log(toCsv(rows));
  console.error(summarize(rows));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
