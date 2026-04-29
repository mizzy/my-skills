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

### Step 5: Implement with TDD

Invoke the **tdd** skill. Follow Red-Green-Refactor strictly.

If a test fails unexpectedly or implementation hits a problem:
- Invoke the **debugging** skill automatically
- If debugging fails 3 times, invoke the **codex** skill automatically

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

### Step 7: Simplify

After verify passes, invoke `/simplify` automatically.

- Reviews changed code for reuse, quality, and efficiency
- Fixes any issues found
- Re-run **verify** if changes were made

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

### Step 10.5: Optional — register a CI watch

If `gh wait` (https://github.com/k1LoW/gh-wait) is installed, register
a watch so a desktop notification fires when CI finishes:

```
gh wait pr --ci-completed --notify
```

This replaces ad-hoc `until ... gh pr checks ...; do sleep N; done`
polling loops, which leak orphan `sleep` processes when their parent
shell dies. If `gh wait` is not available, just report the PR URL and
leave CI polling to the user / **merge-when-ready** skill.

### Step 11: Close Issue

The PR body's `Closes #N` handles this automatically via GitHub.

## Parallel Execution

When the user requests multiple pick-issue agents in parallel:

```
User: "pick-issue を3並列で"
```

Each agent independently runs this full flow. The file-overlap check in Step 3 ensures agents pick non-conflicting Issues.
