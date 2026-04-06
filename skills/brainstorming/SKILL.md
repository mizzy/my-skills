---
name: brainstorming
description: "Use when starting new feature work, adding functionality, or modifying behavior - explores design before implementation, creates plan, PR, and GitHub Issues"
---

# Brainstorming

## Overview

Design exploration before any implementation. This skill produces a design document, implementation plan, Draft PR, and GitHub Issues for each task.

**Hard gate: Do NOT write any implementation code during brainstorming. Design and planning only.**

## When to Use

- New feature or functionality
- Significant behavior change
- Any work that benefits from upfront design

## Process

### Step 1: Create Worktree

```
git wt <feature-name>
```

All brainstorming artifacts are created in this worktree.

### Step 2: Explore Context

- Check existing code, recent commits, and related files
- Understand the current architecture and constraints

### Step 3: Ask Clarifying Questions

Ask questions **one at a time**. Do not dump a list of questions. Each answer may change the next question.

### Step 4: Propose Approaches

Present 2-3 approaches with trade-offs:

- **Approach**: What it does
- **Pros**: Benefits
- **Cons**: Downsides
- **Complexity**: Relative effort

Get user approval before proceeding.

### Step 5: Write Design Document

Save to `docs/specs/YYYY-MM-DD-<topic>-design.md` in the worktree.

Contents:
- Goal
- Chosen approach and rationale
- Key design decisions
- File structure / architecture
- Edge cases and constraints

### Step 6: Invoke Plan Skill

Invoke the **plan** skill to create the implementation plan. The plan skill handles task decomposition and saves the plan document.

### Step 7: Self-Review

Before presenting to user:
- Does the design cover all discussed requirements?
- Are there ambiguities or gaps?
- Is the plan actionable with no placeholders?

### Step 8: User Review

Present the design and plan for user approval. Revise if needed.

### Step 9: Create Draft PR

Create a Draft PR containing the design document and implementation plan:

```
gh pr create --draft --title "<feature>: design and implementation plan" --body "..."
```

After creating the PR, enable auto-merge:

```
gh pr merge --auto --squash
```

### Step 10: Create GitHub Issues

Create one Issue per task from the plan:

- **Title**: Clear, actionable task description
- **Body**: Include relevant context from the plan (files to touch, test approach, acceptance criteria)
- **Labels**: Auto-assign appropriate labels:
  - Type: `enhancement`, `bug`, `refactor`, `docs`, `test`
  - Language: `rust`, `go`, `ruby`, `typescript`, `terraform` (based on files involved)
  - Sequence: `task-1/N`, `task-2/N`, etc.
- **Reference**: Link to the Draft PR

### Step 11: Wait for Auto-Merge and Cleanup

Wait for the PR to be merged:

```
gh pr checks --watch
gh pr view --json state --jq '.state' # confirm MERGED
```

Once merged, switch to main, update, and clean up:

```
git wt main
git pull
git fetch --prune
git wt -d <feature-name>
```

### Terminal State

Brainstorming ends here. The output is:
1. Design document
2. Implementation plan
3. Draft PR (merged)
4. GitHub Issues ready for `pick-issue`

No implementation code is written. No other implementation skills are invoked.
