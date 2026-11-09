---
name: metrics
description: "Use to measure how the agent workflow is performing on a repository - aggregates per-PR failed CI rounds by job, CI rounds, token usage, and regressions from GitHub and local Claude Code / Codex logs, then points at what to fix; in weekly report mode keeps history and publishes a fixed-URL Artifact"
---

# Metrics

## Overview

Measures the output of the workflow chain (pick-issue → codex → review →
merge-when-ready) per merged PR, so changes to skills, rule files, and tests
are judged by numbers instead of impressions. The counting is done by
`metrics.mjs` in this skill's directory; this skill only runs it and reads
the result.

## When to Use

- Periodically (e.g. weekly) on a repository the workflow runs on.
- Before and after changing a skill, CLAUDE.md, or the test setup, to see
  whether the change helped.

## Process

### Step 1: Run the script

```
node <this skill's directory>/metrics.mjs --repo <owner>/<name> [--since YYYY-MM-DD] > metrics.csv
```

- `--since` defaults to 30 days ago (merge date).
- CSV (one row per merged PR) goes to stdout, a summary to stderr.
- Scanning the local logs takes a minute or more; run it in the background.

### Step 2: Read the summary, then the outliers

Primary metrics:

| Column | Meaning | When it is bad, look at |
| --- | --- | --- |
| `ci_failed_rounds` | Distinct commits on the branch with a failed (or timed-out) CI run. Cancelled runs do not count | Local pre-PR verify: CI caught what it missed |
| `ci_failed_kinds` | `job:commits` per failed job name, shard suffixes like `(1/6)` dropped. An aggregating required job (e.g. carina's `Test`) fails alongside the job that really failed; read the other names | Which check to add to, or align with, local verify |
| `ci_rounds` | Distinct commits CI ran on for the branch | Local checks (hooks, pre-push) that should have caught it before CI |
| `claude_tokens` / `codex_tokens` | Uncached tokens (input + cache writes + output) in sessions on that branch | Issue size: split Issues that cost far above the median |
| `regressions` | Issues labelled `regression` whose body says `Regressed by #<PR>` | Tests and review: what let the defect through |
| `hours_to_merge` | PR opened → merged | Where PRs wait (CI time, review loops) |

Secondary: `commits_after_open` (commits pushed after the PR was opened).
It mixes CI fixes, review feedback, and flows that open the PR before CI
has run, so it rises when a repo deliberately lets PR CI do the full run.
Use it only to find PRs to read, not to judge a change.

Sort by each column and read the top few PRs; a pattern across them is the
thing to fix. Report the summary and the patterns to the user, not the CSV.

## Weekly report mode

Use this mode when the run is scheduled (e.g. from launchd via
`claude --bg`) or the user asks for the weekly report. It keeps history,
compares weeks, and publishes one Artifact whose URL never changes.

Data directory: `D = ~/.local/share/factory-metrics/<owner>/<name>/`
(create it if missing). `TODAY` = today's date, `YYYY-MM-DD`.

### W1: Snapshot this week

```
node <this skill's directory>/metrics.mjs --repo <owner>/<name> --since <TODAY minus 7 days> \
  > D/<TODAY>.csv 2> D/<TODAY>.summary.txt
```

Each snapshot covers exactly the last 7 days, so weeks do not overlap and
can be compared directly.

### W2: Compare and propose

- Read every `D/*.summary.txt` for the trend, and `D/<TODAY>.csv` for this
  week's outliers (Step 2).
- Read `D/changes.md`, if present: one line per workflow change,
  `YYYY-MM-DD: <change> (<Issue/PR>)`. Mark each change on the trend and
  compare the weeks before and after it; a metric that shifts right after a
  change is explained by that change, not by drift. Whoever changes the
  workflow (rule files, verify flow, CI) appends the line on the day it
  merges.
- Read the newest earlier `D/*.proposals.md`, if any: for each proposal,
  state whether its target metric moved the way it predicted.
- Write at most 3 new proposals to `D/<TODAY>.proposals.md`. Each one names
  the pattern (with PR numbers), where to fix it (the repo's CLAUDE.md, a
  my-skills skill, tests, CI), and which metric should move and in which
  direction.
- Do **not** file Issues. The user picks which proposals to adopt.
- Proposals change the harness (rule files, skills, tests, CI); never hand
  these metrics to an implementing agent as a target to optimise.

### W3: Publish the Artifact

- Load the `artifact-design` skill, then write the page in your scratchpad
  directory, in the user's language: the trend across weeks (a chart), this
  week's summary, the outlier PRs (linked), last week's proposals with
  their outcome, and this week's proposals.
- If `D/artifact-url` exists: `Artifact` `read` that URL first, then
  publish with `url` set to it, so the link stays the same.
- Otherwise publish a new Artifact (icon `chart`) and write its URL to
  `D/artifact-url`.
- Finish with one line: the Artifact URL.

## How the data is joined

- **GitHub**: merged PRs (GraphQL search), workflow runs, and `regression`
  Issues via `gh`.
- **Claude Code**: `~/.claude/projects/**/*.jsonl`, assistant messages whose
  `cwd` is inside the repo, grouped by `gitBranch`, deduplicated by message
  and request id.
- **Codex**: `~/.codex/sessions/**/*.jsonl`, sessions whose `session_meta`
  git remote is the repo, grouped by its branch, max cumulative
  `token_count` per session.
- Logs are joined to PRs by **branch name**. Sessions on `main` (e.g. an
  orchestrator) are not attributed to any PR.

## Limits

- The checkout must live at `.../<owner>/<name>` (ghq layout), with
  worktrees under it.
- Only this machine's logs are read; work done elsewhere shows as 0 tokens.
  The summary reports the share of PRs with no token data.
- On a subscription plan tokens are not a bill; compare them between PRs,
  not against money.
- `regressions` is only as complete as the labelling done in
  **pick-issue** Step 4.6.
