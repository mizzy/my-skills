---
name: pick-issue
description: "Use when ready to implement - selects a GitHub Issue, creates worktree, implements with TDD, verifies, reviews 5x, and creates PR"
---

# Pick Issue

## Overview

The implementation driver. Picks a GitHub Issue, creates an isolated worktree, implements with TDD, and runs verification and review before creating a PR. This is the primary skill users invoke to get work done.

## When to Use

- After **brainstorming** has created Issues
- When there are open Issues to implement

## Process

### Step 1: List Open Issues

```
gh issue list --state open --label "task-*"
```

### Step 2: Check Parallel Agents

Check for other worktrees that may indicate parallel agents working:

```
git wt
```

For each existing worktree, check which files are being modified:
```
git -C <worktree-path> diff --name-only
git -C <worktree-path> diff --cached --name-only
```

### Step 3: Select Issue

Pick an Issue that:
1. Is not already being worked on (no matching worktree/branch)
2. Has minimal file overlap with active worktrees
3. Respects task dependency order (task-1/N before task-2/N, unless files don't overlap)

If invoked without preference, select the lowest-numbered available task that satisfies the above.

### Step 3.5: Read Issue Details

Read the full issue body and all comments:

```
gh issue view <issue-number>
gh issue view <issue-number> --comments
```

Use the information from the body and comments to fully understand the requirements, context, and any discussion before starting implementation.

### Step 4: Create Worktree

```
git wt <issue-branch-name>
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

### Step 7: Simplify / clean up (Opus points, Codex edits)

Codex writes code that is "safe but dirty," so a cleanup pass always
follows. Cleanup judgement is Opus's strength — but Opus editing the
files directly reintroduces mistakes. So **Opus identifies what to clean
up and points it out; Codex applies the actual edits.**

After verify passes:

- Use `/simplify` / review the changed code for reuse, quality,
  duplication, naming, dead code, and efficiency — this is the
  *reading and judgement* part, which is Opus's job.
- Hand the concrete list of cleanups to Codex (via the **codex** skill)
  and have **Codex apply the edits**. Do not edit the files yourself.
- Re-run **verify** if changes were made.

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

### Step 9: Explain Implementation

After review passes, explain the implementation to the user **in Japanese** in the chat:

- What was implemented and why
- Key design decisions and trade-offs
- How the code works at a high level
- Any notable points (e.g., edge cases handled, patterns used)

Keep it concise but informative so the user can understand the changes without reading every line of code.

### Step 10: Create PR

After review passes, **commit, push, and open the PR without pausing
for confirmation**. The end of the flow is "PR is open and the URL is
reported", not "ready to commit if the user agrees". Pausing here was
a recurring frustration; the user has explicitly said the full
pick-issue flow runs to completion without a confirmation gate.

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

### Step 11: Close Issue

The PR body's `Closes #N` handles this automatically via GitHub.

## Parallel Execution

When the user requests multiple pick-issue agents in parallel:

```
User: "pick-issue を3並列で"
```

Each agent independently runs this full flow. The file-overlap check in Step 3 ensures agents pick non-conflicting Issues.
