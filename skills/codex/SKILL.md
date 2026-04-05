---
name: codex
description: "Use when stuck after 3 failed debugging attempts - delegates investigation or implementation to Codex for a second opinion"
---

# Codex

## Overview

Escalation to Codex when systematic debugging has failed 3 times. Gets a fresh perspective on root cause analysis or implementation approach.

## When to Use

- Called automatically from **debugging** after 3 failed fix attempts
- When a fundamentally different perspective is needed
- For deep investigation into unfamiliar code or libraries

## Process

### Step 1: Prepare Context

Before delegating to Codex, summarize:
- What the problem is (error message, reproduction steps)
- What was tried (all 3 attempts and why they failed)
- What the hypothesis was for each attempt
- Relevant code paths and file locations

### Step 2: Delegate

Use the `codex:codex-rescue` subagent with a clear, specific request:

- "Investigate the root cause of X in file Y"
- "Find why approach A/B/C all failed for this issue"
- "Propose an alternative architecture for this component"

Do NOT delegate vague requests like "fix this bug."

### Step 3: Evaluate Results

Codex results are a **hypothesis**, not a verified fix.

- Read the proposed solution carefully
- Understand the reasoning
- Do NOT blindly apply the suggestion

### Step 4: Verify via TDD

Apply the Codex suggestion through the normal TDD cycle:
1. Write a failing test for the fix
2. Implement the suggested approach
3. Verify the test passes
4. Run the full test suite

Use the **verify** skill to confirm the fix works with evidence.

## Forbidden

- Applying Codex output without understanding it
- Skipping verification because "Codex said so"
- Delegating without summarizing what was already tried
