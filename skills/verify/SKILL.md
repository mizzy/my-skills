---
name: verify
description: "Use before claiming work is complete - requires running verification commands and presenting evidence of success"
---

# Verify

## Overview

Evidence before claims. Never say "done" without proof.

**Rule: No success claims without running commands and showing output.**

## When to Use

- Called automatically from **pick-issue** after implementation
- Before any completion claim

## The Verification Gate

Before stating that anything works:

1. **Identify** which command proves the assertion
2. **Execute** the command (fresh run, not cached)
3. **Read** the full output and exit code
4. **Confirm** the output actually supports the claim
5. **Present** the evidence, then make the claim

## What Requires Verification

| Claim | Required Evidence |
|-------|------------------|
| "Tests pass" | Test output showing 0 failures + exit code 0 |
| "Lint clean" | Linter output showing 0 errors + exit code 0 |
| "Build succeeds" | Build output + exit code 0 |
| "Bug is fixed" | Test for the original bug passes |
| "All requirements met" | Line-by-line checklist against spec |

## Verification Commands by Language

| Language | Tests | Lint | Build |
|----------|-------|------|-------|
| Rust | `cargo test` | `cargo clippy` | `cargo build` |
| Go | `go test ./...` | `golangci-lint run` | `go build ./...` |
| Ruby | `bundle exec rspec` | `bundle exec rubocop` | - |
| TypeScript | `npx vitest run` / `npx jest` | `npx eslint .` | `npx tsc --noEmit` |

Detect the project's actual setup.

## Forbidden Language

These phrases indicate a claim without evidence:

- "should work"
- "probably passes"
- "seems to be fine"
- "I believe this fixes"
- "Great!" (before running anything)

## On Failure

If verification fails, do not claim partial success. Invoke the **debugging** skill and fix the issue. Re-verify from scratch after the fix.
