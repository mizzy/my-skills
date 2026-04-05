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

### Step 4: Create Worktree

```
git wt <issue-branch-name>
```

Branch name format: `issue-<number>-<short-description>`

### Step 5: Implement with TDD

Invoke the **tdd** skill. Follow Red-Green-Refactor strictly.

If a test fails unexpectedly or implementation hits a problem:
- Invoke the **debugging** skill automatically
- If debugging fails 3 times, invoke the **codex** skill automatically

### Step 6: Verify

After implementation is complete, invoke the **verify** skill automatically.

- Run all tests, linter, and build
- All must pass with evidence (command output + exit codes)
- If verify fails, go back to debugging

### Step 7: Review (5 rounds)

After verify passes, invoke the **review** skill automatically.

The review runs 5 iterations:
1. Each round examines the diff against the plan/spec
2. Issues found → fix immediately → re-verify
3. Next round starts fresh
4. Continue until 5 rounds complete or a round finds no issues

### Step 8: Create PR

After review passes:

```
gh pr create --draft --title "<short description>" --body "Closes #<issue-number>\n\n..."
```

### Step 9: Close Issue

The PR body's `Closes #N` handles this automatically via GitHub.

## Parallel Execution

When the user requests multiple pick-issue agents in parallel:

```
User: "pick-issue を3並列で"
```

Each agent independently runs this full flow. The file-overlap check in Step 3 ensures agents pick non-conflicting Issues.
