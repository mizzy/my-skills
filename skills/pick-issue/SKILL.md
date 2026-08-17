---
name: pick-issue
description: "Use when ready to implement - selects a GitHub Issue, creates worktree, implements with TDD, verifies, reviews 5x, and creates PR. Numeric argument (e.g. pick-issue 3) is the issue number, not a parallelism count."
---

# Pick Issue

## Overview

The implementation driver. Picks a GitHub Issue, creates an isolated worktree, implements with TDD, and runs verification and review before creating a PR. This is the primary skill users invoke to get work done.

## When to Use

- After **brainstorming** has created Issues
- When there are open Issues to implement

## Autonomy Contract — run to completion in one turn

**pick-issue is a single continuous flow, not a menu of independent
steps.** Once invoked, Step 1 through Step 10 execute in the *same turn*
without returning control to the user between steps. The end state is
"PR is open and the URL has been reported" — nothing earlier counts as a
stopping point.

- **Never end the turn between Steps 5–10.** Finishing tdd, verify,
  simplify, or review is *not* a stopping point — it is a handoff to the
  next step's tool call in the same turn. When a delegated tool
  (`codex exec`, `TaskOutput`, the **verify** / **review** skills)
  returns, the very next action is the following step's first tool
  call. No summary paragraph, no "shall I continue?", no silent
  turn-end.
- **The only legitimate stops are:**
  1. Step 3.5 — a stale/incorrect issue assumption that requires user
     input to resolve.
  2. Step 4.5 — the issue lists multiple design options and the three
     lenses do *not* uniquely select one.
  3. Step 5 — **debugging** has failed 3 times *and* the **codex**
     escalation also cannot resolve it.
  4. Step 10 — PR is open and the URL has been reported.
- **NG patterns that have caused past frustration — do not do these:**
  - "実装が完了しました。verifyに進んでよいですか?" ← forbidden, run verify.
  - "verify通りました。reviewに進みます。" then turn ends ← forbidden,
    start review in the same turn.
  - "5ラウンドのreviewが完了しました。" then turn ends ← forbidden,
    proceed to Step 9/10.
  - Any variant of "次のステップに進めますか?" between Steps 5–10 ←
    forbidden. The user has already answered yes by invoking pick-issue.
- **Progress narration is fine; permission-seeking is not.** A one-line
  "verify通過、reviewラウンド1を開始" before the next tool call is welcome.
  A trailing question or a bare status report with no follow-up tool
  call is a turn-end and is forbidden.

## Process

### Step 1: List Open Issues

```
gh issue list --state open --label "task-*"
```

### Step 2: Check Parallel Agents

Check for other worktrees that may indicate parallel agents working:

```
git worktree list
```

For each existing worktree, check which files are being modified:
```
git -C <worktree-path> diff --name-only
git -C <worktree-path> diff --cached --name-only
```

### Step 3: Select Issue

**Argument handling:** When the user invokes `pick-issue <N>` with a
numeric argument, `<N>` is the **GitHub Issue number** to work on — not
a parallelism count. Parallel execution is only triggered by explicit
phrasing like "3並列で", "run 3 in parallel", etc. (see
[Parallel Execution](#parallel-execution)).

Pick an Issue that:
1. Is not already being worked on (no matching worktree/branch)
2. Has minimal file overlap with active worktrees
3. Respects task dependency order (task-1/N before task-2/N, unless files don't overlap)

If invoked with a specific issue number, use that issue (after confirming
it is open and not already in progress). If invoked without preference,
select the lowest-numbered available task that satisfies the above.

### Step 3.5: Read Issue Details

Read the full issue body and all comments:

```
gh issue view <issue-number>
gh issue view <issue-number> --comments
```

Use the information from the body and comments to fully understand the requirements, context, and any discussion before starting implementation.

**Do not take the issue at face value.** Issues are written at a point in
time with incomplete information. Before proceeding, question their
assumptions:

- **Has the codebase changed since the issue was filed?** The issue may
  reference code, APIs, or behavior that no longer exists or has already
  been refactored. Read the current code to verify assumptions still hold.
- **Is the stated problem the actual problem?** An issue may describe a
  symptom and prescribe a fix that doesn't address the root cause. Apply
  the same root-cause thinking from Step 4.6 here — if the issue says
  "add a nil check in X", ask *why* X receives nil in the first place.
- **Is the proposed approach still the best one?** Even if the issue
  prescribes a specific implementation, check whether the codebase now
  offers a simpler or more correct path. New abstractions, recent
  refactors, or upstream changes may have opened better options.
- **Are the scope and boundaries correct?** The issue may be scoped too
  narrowly (missing sibling cases of the same bug) or too broadly
  (bundling unrelated changes). Re-evaluate scope against the current
  state of the code.

When you find a stale or incorrect assumption, **flag it to the user
before proceeding** — don't silently reinterpret the issue. Explain what
the issue says, what the code actually shows, and ask how to proceed.
The exception is when the discrepancy is trivially resolvable (e.g., a
file was renamed but the intent is clear).

### Step 4: Create Worktree

```
git worktree add .worktrees/<issue-branch-name> -b <issue-branch-name>
cd .worktrees/<issue-branch-name>
```

Branch name format: `issue-<number>-<short-description>`

### Step 4.5: Confirm design approach when the issue lists multiple options

Before invoking **tdd**, re-read the issue body. If the issue presents
multiple plausible design options without endorsing one (typical
phrasing: "Option A: ... Option B: ...", "Two viable shapes:", "Either
way, ..."), **stop and ask the user which option to take**. Do not pick
one yourself, even when one option is obviously narrower than the
other. Different designs trade different things (type-level proof,
blast radius, future extensibility, naming hygiene); only the user has
the weights.

Useful data to gather before asking — but not before deciding:

- Rough call-site impact: stub the change with a placeholder
  (e.g. add the variant / field with no body), run
  `cargo check --workspace --all-targets 2>&1 | grep -E "^error" | wc -l`,
  revert the stub. The number quantifies the radius for each option.
- Existing tests / docs that already imply one option.

Surface options + measurements to the user, then wait. The choice is
the user's. Only when the issue body unambiguously endorses one option
(or earlier user instruction did) may you proceed without asking.

**Exception — proceed without asking when the three lenses uniquely
select one option.** Evaluate every option under all three:

1. **Long-term view** — which option keeps working as new callers /
   features arrive, vs. which one accumulates carve-outs?
2. **Type safety** — which option makes the broken state
   unrepresentable (newtype, typestate, exhaustive enum), vs. which
   one relies on every caller remembering a convention?
3. **Root-cause** — which option restores the invariant at the
   upstream seam, vs. which one filters / guards / patches at
   consumer sites?

If **all three lenses point to the same option**, that is not a
judgement call — proceed with it without asking. Note in the PR body
which option was taken and that the three lenses uniquely selected it.

Only when the three lenses disagree (e.g. one option is more
type-safe but has wider blast radius; another is narrower but leaves
a future caller able to re-introduce the bug) is the choice a
weighted trade-off — that is the user's call. Surface the options
with the per-lens verdicts and wait.

Past failure: in carina #2229 I implemented case A, hit ~80 errors,
reverted, re-implemented as case B, and reported the pivot as my
decision. The user pushed back: "むしろ、そこで勝手に設計判断されると困るんだが".
Right. Measure freely; decide never.

### Step 4.6: Root-cause fixes only — no bandaids, no per-symptom carve-outs

**This rule applies to every bug-fix Issue picked up in this flow.** When
fixing a bug, fix the root cause, not the symptom. If the same broken
invariant produces symptoms in multiple code paths, the correct fix is
the *one* upstream change that restores the invariant, not a filter /
guard / carve-out at every consumer site.

- **Never propose "minimal fix in this PR, follow-up issue for the
  rest"** when "the rest" is the same class of bug at sibling call
  sites. That is a bandaid presented as scope discipline. The correct
  framing is: this is one bug, fix the root.
- **Never invoke "1 PR = 1 topic" to justify a per-site patch.** "1
  topic" means one *root cause*, not "one of several symptoms of the
  same root cause." Fixing the root *is* the topic.
- **Self-check before opening a PR:** if the diff filters / guards /
  skips for the buggy condition instead of removing the condition
  itself, the fix is symptom-level. Step back and find the upstream
  seam.
- **5-round review passing is NOT evidence the fix is root-cause.** A
  bandaid can pass every gate. Ask "if a new caller appears tomorrow,
  does it need to remember this filter too?" — if yes, the root is
  still broken.
- **When in doubt, pick the broader fix.** Past failure mode: shrinking
  scope and offering a follow-up has been pushed back on every single
  time. Do not present "fix here + follow-up for sibling" — fix the
  root once.
- **Prefer type-level solutions when the language supports them.**
  Newtypes, tagged unions, typestate — over runtime filters at every
  consumer. Make the broken state unrepresentable.

If the Issue is not a bug fix (e.g., a new feature or refactor), this
step is a no-op — proceed to Step 5.

### Step 4.7: Long-term view alongside root-cause

"Root cause" answers *what is broken right now*; "long-term view + type
safety" answers *will the same class of bug be reachable again by a
future caller*. Both questions must be answered before declaring a fix
complete — passing the first is not evidence of passing the second.

- **Both lenses, every fix.** When proposing a fix, evaluate it under
  both lenses: (1) does it restore the invariant at the upstream seam
  (root cause)? (2) does the type system make the broken state
  unrepresentable for any future caller (long-term)? A fix that
  answers yes-to-(1) but no-to-(2) is **a runtime patch at multiple
  consumer sites disguised as a root-cause fix** — it works today and
  silently regresses when the next consumer is added.
- **The "new caller tomorrow" check is type-shaped, not behavioral.**
  Asking "if a new caller appears tomorrow, does it need to remember
  this filter too?" is the right question — but the answer must come
  from the *type signature*, not from documentation or convention. If
  the answer is "the caller has to remember to call `find_*` /
  `resolve_*` / `assert_*`", the root is still broken: the type
  permits the buggy path. Make the resolver step required by the type
  (return a wrapper type that only a resolver can produce; make the
  raw type uncomparable to the resolved type).
- **Measure radius before deferring.** The temptation to defer the
  type-level reshape to a follow-up issue is strongest when the
  runtime patch is in front of you and the typed reshape feels big.
  Always measure: stub the newtype, run the project's typecheck
  command (e.g.
  `cargo check --workspace --all-targets 2>&1 | grep error | wc -l`),
  revert. A small number (single or low double digits) means **do it
  in-PR**, not as follow-up — past intuitions that "blast radius is
  wide" have repeatedly been wrong.
- **When the radius is genuinely large**, file the type-level
  follow-up issue **in the same response** as the runtime fix PR —
  not "I might file it later". Reference the runtime PR and the
  remaining type hazard explicitly, so a future maintainer reading the
  PR can see why the runtime fix was chosen and what stays broken at
  the type level.
- **Self-check at PR creation:**
  - Does the diff add `find_*` / `resolve_*` / `lookup_*` calls at
    multiple consumer sites? If yes, ask whether a newtype could make
    the raw value impossible to use without resolution.
  - Does the fix rely on every consumer remembering to do something?
    If yes, the type system is the right place to enforce it.
  - Is there a sibling code path that does the same dance? If yes,
    the convention is leaking into multiple sites and the type is the
    factoring tool.

Past failure mode (carina#3324 / PR #3325 → carina#3326): a runtime
resolver fix at three consumer sites was reviewed across five rounds
and merged as "root-cause"; the user then asked whether the change was
type-safe and long-term. Honest answer: no — `ResourceId` still
permitted a routing-mismatch comparison, and a future fourth consumer
would re-introduce the same bug. The typed reshape
(`StateBlockAddress` newtype) became a follow-up issue rather than
landing in the same PR. The lesson is to apply *both* lenses at PR
creation, not after the user asks.

### Step 5: Implement with TDD (delegated to Codex)

The structure for implementation is multi-tier subcontracting:

```
人間 ←→ Opus (you) ←→ Codex
```

**Opus only reads, thinks, and reviews — it writes nothing but docs.**
You are good at grasping the user's intent and capturing the essence,
but editing code directly produces too many mistakes and rework. Codex
is good at executing thoroughly; left alone it loses the essence. So you
own intent, design, and review, and **delegate the code-writing to Codex**.

Invoke the **codex** skill to implement. Carry the intent, the design
you've settled on, and the concrete TDD scope down to Codex. Codex
follows Red-Green-Refactor via the **tdd** skill; you review what comes
back against the essence before accepting it. TDD's Iron Law holds for
the delegated code: no production code without a failing test first.

If review finds problems, point them out and send them **back to Codex**
to fix — do not edit the files yourself.

If a test fails unexpectedly or implementation hits a problem:
- Invoke the **debugging** skill automatically
- If debugging fails 3 times, escalate further via the **codex** skill

**→ Next: proceed to Step 6 in the same turn.** When Codex reports
implementation complete, immediately issue the first verify command.
Do not summarize and stop.

### Step 6: Verify

After implementation is complete, invoke the **verify** skill automatically.

- Run all tests, linter, and build
- All must pass with evidence (command output + exit codes)
- **Also run any repo-specific CI gates that are not part of the build
  tool.** Many projects wire custom check scripts into
  `.github/workflows/*.yml` (e.g. `bash scripts/check-*.sh`) that
  `cargo` / `npm test` / `go test` never invoke. Local build-tool green
  is *not* CI green — these scripts gate the PR too. Quick scan:
  `grep -rE "run: bash" .github/workflows/`. Run each one locally before
  declaring verify done.
- If verify fails, go back to debugging

**→ Next: proceed to Step 7 in the same turn.** As soon as verify is
green, invoke `/code-review` and `/ponytail-review` — do not stop to
report "verify passed".

### Step 7: Simplify / clean up (Opus points, Codex edits)

Codex writes code that is "safe but dirty," so a cleanup pass always
follows. Cleanup judgement is Opus's strength — but Opus editing the
files directly reintroduces mistakes. So **Opus identifies what to clean
up and points it out; Codex applies the actual edits.**

After verify passes:

- Use `/code-review` (effort `medium`, **without `--fix`**) to review the
  changed code for reuse, quality, duplication, naming, dead code, and
  efficiency — this is the *reading and judgement* part, which is Opus's
  job. `/code-review` supersedes `/simplify` here: it covers the same
  quality cleanups and also surfaces correctness bugs. Do **not** pass
  `--fix` — letting it edit the working tree would bypass the
  Opus-points / Codex-edits split below.
- Keep effort at `low`/`medium`: the deep bug hunt belongs to the
  **review** skill in Step 8, so this pass stays a quality cleanup with
  light bug-spotting and avoids duplicating Step 8.
- Also run `/ponytail-review` over the same diff. `/code-review` looks
  for correctness and general quality; `/ponytail-review` hunts only
  over-engineering — reinvented stdlib, dependencies the platform
  already covers, abstractions with one implementation, dead
  flexibility. It is a one-shot report (one line per finding, ending
  in `net: -N lines possible`), not a persistent mode, so it does not
  bias the rest of the flow.
- **Step 4.6 / 4.7 design decisions are out of scope for
  `/ponytail-review`.** A newtype / typestate / tagged union chosen to
  make a broken state unrepresentable will look like `yagni:` "one
  implementation, inline it" to a complexity-only reviewer. Those are
  deliberate type-safety choices — discard such findings rather than
  handing them to Codex. Everything else `/ponytail-review` flags is
  fair game.
- Merge the surviving findings from both reviews into one concrete list,
  hand it to Codex (via the **codex** skill), and have **Codex apply the
  edits**. Do not edit the files yourself.
- Re-run **verify** if changes were made.

**→ Next: proceed to Step 8 in the same turn.** After simplify (and any
re-verify) finishes, launch the first review round immediately.

### Step 8: Review (5 rounds)

After simplify passes, invoke the **review** skill automatically.

The review runs 5 iterations:
1. Each round examines the diff against the plan/spec
2. Issues found → fix immediately → re-verify
3. Next round starts fresh
4. Continue until 5 rounds complete or a round finds no issues

**Do not skip or shorten this step.** "The change is small", "it's
obvious", "just a bug fix", "the user is waiting" are not valid
reasons. 5 rounds means launching 5 separate review agents, each
reading the current diff fresh. If any round produces fixes, re-verify
before the next round. Skipping this step is a recurring failure mode
that has had to be called out across many PRs — the rule is absolute.

**→ Next: proceed to Step 9 and Step 10 in the same turn.** "5 rounds
completed" is *not* a stopping point — it is the cue to commit, push,
and open the PR. Do not end the turn on a review-complete report.

### Step 9: Create PR

After review passes, **commit, push, and open the PR without pausing
for confirmation**. The end of the flow is "PR is open and the URL is
reported", not "ready to commit if the user agrees". Pausing here was
a recurring frustration; the user has explicitly said the full
pick-issue flow runs to completion without a confirmation gate.

Do PR creation *before* the Japanese explanation (Step 10). Writing the
explanation first tends to feel like a natural end-of-turn and has led
to silent turn-ends before the PR is opened; opening the PR first makes
the URL the visible completion marker.

```
gh pr create --title "<short description>" --body "Closes #<issue-number>\n\n..."
```

By default create a non-draft PR. Use `--draft` only when the project
explicitly requests draft PRs.

The "destructive operations need confirmation" rule still applies for
things like `git push --force` or `git reset --hard`, but a fresh-branch
commit + push + open PR is not destructive — it is the expected end
state of the flow. Stop **at PR creation, not at merge**: merging still
requires explicit user instruction (use the **merge-when-ready** skill
for that).

**→ Next: proceed to Step 10 in the same turn.** After the PR URL is
reported, immediately write the Japanese explanation. Do not end the
turn on the PR URL alone when Step 10 has not yet run.

### Step 10: Explain Implementation

After the PR is open, explain the implementation to the user **in
Japanese** in the chat:

- What was implemented and why
- Key design decisions and trade-offs
- How the code works at a high level
- Any notable points (e.g., edge cases handled, patterns used)

Keep it concise but informative so the user can understand the changes
without reading every line of code. This is the final step — the turn
ends here.

### Step 11: Close Issue

The PR body's `Closes #N` handles this automatically via GitHub.

## Parallel Execution

When the user requests multiple pick-issue agents in parallel:

```
User: "pick-issue を3並列で"
```

Each agent independently runs this full flow. The file-overlap check in Step 3 ensures agents pick non-conflicting Issues.
