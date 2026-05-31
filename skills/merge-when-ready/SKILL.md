---
name: merge-when-ready
description: "Use after a PR is opened and you want it merged - waits for CI to pass, marks draft PRs ready, removes the worktree, then merges and cleans up"
---

# Merge When Ready

## Overview

The final step of the workflow chain. After **pick-issue** has opened a PR
(and **review** has passed), this skill waits for CI checks to pass and then
merges the PR, handling worktree teardown and post-merge cleanup so the repo
returns to a clean state on the main branch.

## When to Use

- After a PR has been opened (typically by **pick-issue**) and you want it
  merged once CI is green.

## Process

### Step 1: Determine the PR number

- If arguments contain a PR number, use it.
- Otherwise, get the current branch's PR with
  `gh pr view --json number -q .number`.
- **Note**: When using the `--repo` flag, or when on the `main` branch, you
  MUST pass an explicit branch name:
  `gh pr view <branch-name> --json number -q .number --repo <owner>/<repo>`.
  `gh pr view` cannot infer the PR without an argument when `--repo` is used
  or when the current branch is not the feature branch.

### Step 2: Check CI status

- Check CI status with `gh pr checks <PR number>`.
- If CI has not passed:
  - Ask the user whether to wait for CI to pass.
  - If yes, poll `gh pr checks` every 30 seconds until all checks pass.
  - If no, exit the skill.

### Step 3: Merge once CI passes

- If it's a draft PR, mark it as ready with `gh pr ready <PR number>`.
- **Remove the worktree BEFORE merging** (if one exists): from the main
  worktree, run `git worktree remove .worktrees/<branch-name>` (add `--force`
  if it has a submodule), then `git branch -D <branch-name>`. Removing the
  worktree and deleting the local branch prevents "branch used by worktree"
  errors during merge.
- Merge with `gh pr merge <PR number> --merge --delete-branch` run from the
  **main worktree** (the project root directory), NOT from a feature worktree.

### Step 4: Post-merge cleanup

- `git pull`
- Prune stale remote refs: `git remote prune origin`

## Important Rules

- Always return to the main branch after merging.
- Follow CLAUDE.md git workflow: delete the local branch after merging.
- Never merge without confirming CI has passed.
- Automatically mark draft PRs as ready before merging.
- **Always run `gh pr merge` from the main worktree**, not from a feature
  worktree.
- **Always remove the worktree BEFORE `gh pr merge`**, not after. This
  prevents "branch used by worktree" errors.
