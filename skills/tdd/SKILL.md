---
name: tdd
description: "Use when writing any implementation code - enforces Red-Green-Refactor cycle with no production code without a failing test first"
---

# TDD (Test-Driven Development)

## Overview

Enforces Red-Green-Refactor. No production code without a failing test first.

**Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

If you wrote code before a test, delete it and start over. No exceptions.

## When to Use

- Called automatically from **pick-issue**
- Any time implementation code is being written

## The Cycle

### RED: Write a Failing Test

- Write **one** minimal test for the next behavior
- Run it and **confirm it fails**
- The failure message should clearly describe what's missing

### GREEN: Write Minimal Code

- Write the **simplest** code that makes the test pass
- No extra features, no "while I'm here" improvements
- Run the test and **confirm it passes**

### REFACTOR: Clean Up

- Remove duplication, improve names, extract helpers
- Run tests after every change — must stay green
- Stop when the code is clean enough, not perfect

### Repeat

Move to the next behavior. One cycle at a time.

## Language-Specific Setup

| Language | Test Command | Watch Mode |
|----------|-------------|------------|
| Rust | `cargo test` | `cargo watch -x test` |
| Go | `go test ./...` | - |
| Ruby | `bundle exec rspec` / `bundle exec rake test` | `bundle exec guard` |
| TypeScript | `npx vitest run` / `npx jest` | `npx vitest` |

Detect the project's actual test setup and use the appropriate command.

## Forbidden Rationalizations

These are not valid reasons to skip the cycle:

| Excuse | Reality |
|--------|---------|
| "I'll write tests after" | A test that passes immediately proves nothing |
| "It's just a small change" | Small changes cause big bugs |
| "I already tested manually" | Manual testing is not reproducible |
| "This is too simple to test" | Then the test is trivial to write |
| "I need to see the code first" | The test IS the spec for the code |

## Red Flags

If any of these happen, stop and restart the cycle:

- Production code exists without a preceding failing test
- Test was written after the implementation
- "Let me just get this working first"
- Multiple behaviors tested in one cycle
