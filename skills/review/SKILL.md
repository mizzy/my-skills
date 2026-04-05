---
name: review
description: "Use after verify passes - runs 5 rounds of self-review against the plan/spec, fixing issues found in each round"
---

# Review

## Overview

5-round self-review cycle. Each round examines the implementation against the plan and spec, identifies issues, fixes them, and re-verifies.

## When to Use

- Called automatically from **pick-issue** after **verify** passes

## Process

### For Each Round (1 through 5):

#### 1. Examine the Diff

Review all changes against:
- The implementation plan
- The design spec (if available)
- The Issue description

#### 2. Check For

**Completeness**:
- All requirements from the plan/spec are implemented
- No TODO or FIXME left unresolved
- Edge cases from the spec are handled

**Correctness**:
- Logic matches the spec
- Error handling is appropriate (not excessive)
- Types and interfaces are consistent

**Scope**:
- No changes outside what was requested
- No unsolicited attributes, parameters, or refactoring
- No extra features or "while I'm here" improvements

**Security** (OWASP Top 10):
- No injection vulnerabilities (SQL, command, XSS)
- No hardcoded secrets
- Input validation at system boundaries

**Tests**:
- Tests cover the implemented behavior
- Tests are meaningful (not just asserting true)
- No missing test cases from the plan

#### 3. Fix Issues Found

If any issues are found:
- Fix them immediately
- Re-run **verify** to ensure fixes don't break anything
- Continue to the next review round

#### 4. Clean Round

If a round finds no issues, note it and continue to the next round. Even if round 3 is clean, still run rounds 4 and 5 - fresh eyes catch different things.

### After 5 Rounds

Report summary:
- Total issues found and fixed per round
- Remaining concerns (if any)
- Confidence level

If all 5 rounds pass clean or all issues were resolved, the review is complete. Hand control back to **pick-issue** for PR creation.
