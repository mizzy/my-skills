---
name: plan
description: "Use when creating implementation plans from specs or design documents - decomposes work into concrete TDD tasks with file paths and code examples"
---

# Plan

## Overview

Creates bite-sized, actionable implementation plans from specs or design documents. Each task is a single TDD cycle (2-5 minutes).

**Codex writes the plan; Opus reviews it.** Codex writes plans more
token-efficiently — broad, deep, and short — whereas Opus over-dives
into detail when it writes a plan itself. So Opus stays the critic
("ツッコミ役"): delegate the plan-writing to Codex via the **codex**
skill, then review what comes back against this skill's quality bar.
Opus does not hand-write the plan; Opus does not edit the plan file
directly — findings go back to Codex.

The steps below are the **quality bar Opus reviews against**, and the
spec Opus hands to Codex — not a checklist for Opus to execute by hand.

## When to Use

- Called automatically from **brainstorming**
- Standalone when you already have a clear spec or design

## Process

### Step 1: Map File Structure

Before writing tasks, map out:
- Files to create
- Files to modify
- Dependencies between files

Each file should have one clear responsibility.

### Step 2: Decompose into Tasks

Break work into tasks. Each task is one TDD cycle:

1. Write a failing test
2. Verify it fails
3. Write minimal implementation to pass
4. Verify it passes
5. Refactor if needed

Each task includes:
- **Goal**: What this task achieves
- **Files**: Exact file paths to create or modify
- **Test**: What test to write (with code example)
- **Implementation**: What code to write (with code example)
- **Verification**: Exact command to run

### Step 3: No Placeholders

Every task must have complete, concrete content. These are **forbidden**:

- "add appropriate error handling"
- "implement similar to Task N"
- "add necessary tests"
- "update as needed"
- "etc."

If you can't be specific, the design needs more work. Go back to brainstorming.

### Step 4: Language-Specific Test Commands

Use the correct test runner per language:

| Language | Test Command | Lint Command |
|----------|-------------|--------------|
| Rust | `cargo test` | `cargo clippy` |
| Go | `go test ./...` | `golangci-lint run` |
| Ruby | `bundle exec rspec` or `bundle exec rake test` | `bundle exec rubocop` |
| TypeScript | `npx vitest run` or `npx jest` | `npx eslint .` |
| Terraform | `terraform validate` | `terraform fmt -check` |

Detect the project's actual setup and use the appropriate command.

### Step 5: Save Plan

Codex saves the plan to `docs/plans/YYYY-MM-DD-<feature-name>.md` in the
worktree. (A plan document is part of the docs Opus owns conceptually,
but the writing is still delegated to Codex — Opus directs and reviews.)

### Step 6: Review the plan (Opus as critic)

Opus reviews Codex's plan against the spec. Be the critic — poke holes,
find gaps, name what's missing:
- Every requirement covered?
- No placeholder patterns?
- Type consistency across tasks?
- Task order respects dependencies?
- Each task is independently verifiable?

Findings go **back to Codex** to revise the plan. Do not rewrite the
plan yourself — point out the problems and let Codex apply the fixes.
Repeat review → revise until the plan clears the bar.
