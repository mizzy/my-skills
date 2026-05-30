---
name: codex
description: "Use to delegate implementation to Codex - the default for large development, and the escalation after 3 failed debugging attempts"
---

# Codex

## Overview

The multi-tier subcontracting structure for large development:

```
人間 ←→ Opus ←→ Codex
```

Each tier plays to its strength:

- **Opus (you)** is good at grasping the user's intent and capturing the
  essence of the problem — but writing code directly produces too many
  mistakes and too much rework.
- **Codex** is good at executing an implementation thoroughly and
  completely — but can get lost in the details and lose sight of the
  essence.

So in large development, Opus stays at the intent/essence layer:
understand what the user really wants, decide the design and the shape
of the solution, then **delegate the actual code-writing to Codex** and
review what comes back against the essence. Opus does not hand-write the
implementation when the work is large.

## When to Use

There are two distinct entry points:

### A. Default implementation delegation (large development)

When the work is **large**, delegate implementation to Codex by default
rather than writing it yourself. Opus owns intent, design, and review;
Codex owns the thorough execution.

Judge "large" case by case (no fixed threshold — use judgement):
typical signals are work spanning multiple files, a new feature, a
non-trivial refactor, or anything where direct hand-coding would risk
the kind of mistakes-and-rework that Opus is prone to. Small, local,
single-file edits do not need delegation — write those directly.

### B. Escalation after repeated failure

- Called automatically from **debugging** after 3 failed fix attempts
- When a fundamentally different perspective is needed
- For deep investigation into unfamiliar code or libraries

## Process

### Step 1: Prepare Context

Before delegating to Codex, summarize:

For **implementation delegation (A)**:
- The intent and essence: what the user actually wants, and why
- The design / shape of the solution you've decided on
- The concrete scope: which files, which behaviors, the TDD expectation
- Relevant code paths, conventions, and constraints to respect

For **escalation (B)**:
- What the problem is (error message, reproduction steps)
- What was tried (all 3 attempts and why they failed)
- What the hypothesis was for each attempt
- Relevant code paths and file locations

### Step 2: Delegate

Use the `codex:codex-rescue` subagent with a clear, specific request.

For implementation, give Codex the essence *and* the concrete scope so
it executes thoroughly without drifting from the point:

- "Implement X in file Y following TDD. The intent is Z. Respect
  convention W. Here are the behaviors to cover: ..."

For escalation:

- "Investigate the root cause of X in file Y"
- "Find why approach A/B/C all failed for this issue"
- "Propose an alternative architecture for this component"

Do NOT delegate vague requests like "fix this bug" or "build the
feature." Carry the intent down with you — that is the thing Codex is
weakest at supplying for itself.

### Step 3: Evaluate Results

Codex results are a **hypothesis / draft**, not a verified, accepted change.

- Read what Codex produced carefully
- Check it against the **essence**: did it stay on the point, or get lost
  in details and miss what the user actually wanted?
- Understand the reasoning
- Do NOT blindly accept the output

This review step is exactly where Opus earns its place in the chain:
Codex executes completely but can lose the thread; you hold the thread.

### Step 4: Verify via TDD

Bring the Codex work through the normal TDD cycle:
1. A failing test must precede the production code (delegated or not)
2. Confirm the implementation makes it pass
3. Run the full test suite

Use the **verify** skill to confirm the result works with evidence.

## Forbidden

- Accepting Codex output without understanding it
- Skipping verification because "Codex said so"
- Delegating without carrying the intent/essence down
- Delegating vague requests with no concrete scope
- Hand-writing a large implementation yourself instead of delegating,
  when delegation is what the work calls for
