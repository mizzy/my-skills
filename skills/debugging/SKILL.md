---
name: debugging
description: "Use when encountering test failures, bugs, or unexpected behavior - requires root cause investigation before any fix attempt"
---

# Debugging

## Overview

Systematic root cause investigation before attempting fixes. No guessing, no random changes.

**Rule: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

## When to Use

- Called automatically from **pick-issue** when tests fail or problems occur
- Any unexpected behavior or error

## Four Phases

### Phase 1: Investigate

1. **Read the error message carefully** - the full message, not just the first line
2. **Reproduce consistently** - write a minimal reproduction if one doesn't exist
3. **Check recent changes** - what changed since it last worked?
4. **Gather evidence** - logs, stack traces, variable values at key points
5. **Trace data flow** - follow the data backward from the error to the source

### Phase 2: Analyze Patterns

1. Find working examples of similar code
2. Compare working vs broken - what's different?
3. Check dependencies and their versions
4. Look for off-by-one, null/nil, type mismatch, race conditions

### Phase 3: Hypothesize and Test

1. Form a **specific** hypothesis: "X fails because Y is Z when it should be W"
2. Predict what you'd see if the hypothesis is correct
3. Test minimally - change ONE thing
4. Verify the prediction matches

### Phase 4: Implement Fix

1. Write a failing test that reproduces the bug
2. Implement the fix
3. Verify the test passes
4. Run the full test suite to check for regressions

## Escalation

**After 3 failed fix attempts**, stop and escalate:

- Invoke the **codex** skill for a second opinion
- Question whether the architecture is sound
- Consider if the problem is in a dependency, not your code

## Forbidden

- Proposing a fix without understanding the root cause
- Making multiple changes at once
- "Let me try this" without a hypothesis
- Ignoring error messages
- Retrying the same approach that already failed
