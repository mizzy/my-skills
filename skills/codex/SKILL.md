---
name: codex
description: "Use to delegate all hands-on work to Codex - plan-writing, implementation, and refactoring. Opus reads, thinks, reviews, and writes docs only."
---

# Codex

## Overview

The multi-tier subcontracting structure:

```
人間 ←→ Opus ←→ Codex
```

**Core principle: Opus only reads and thinks. It writes nothing but
docs.** Every hands-on artifact — the plan, the implementation, the
refactor — is produced by Codex. Opus carries the human's intent down,
reviews what comes back, and points out what's wrong; but the actual
editing is always done by Codex, never by Opus.

Why this division:

- **Opus (you)** is good at grasping the user's intent and capturing the
  essence, and at reading code and reasoning about it (review,
  critique, cleanup judgement). But whenever Opus edits files directly
  it makes mistakes and causes rework — so it doesn't edit.
- **Codex** is good at executing thoroughly and completely. But left
  alone it gets lost in the details and loses the essence, and the code
  it writes tends to be "safe but dirty." So Opus supplies the essence
  and the cleanup direction; Codex does the typing.

The three hands-on stages, all delegated to Codex, all reviewed by Opus:

| Stage | Codex does | Opus does |
|-------|-----------|-----------|
| **Plan** | Writes the plan — broad, deep, and short; token-efficient | Reviews as the critic ("ツッコミ役"); does not write the plan itself |
| **Implementation** | Writes the code via TDD | Reviews against the essence; does not hand-write the code |
| **Refactor / cleanup** | Applies the cleanup edits | Decides *what* to clean up and points it out; does not make the edits |

Opus writing the plan itself tends to over-dive into detail; staying
the critic works better. Opus editing the cleanup itself tends to
introduce mistakes; pointing out and letting Codex apply works better.
The pattern is the same at every stage: **Opus points, Codex edits.**

## When to Use

- **Plan-writing** — delegate to Codex, then review it (see **plan**,
  **brainstorming**)
- **Implementation** — delegate to Codex by default, then review it
  (see **pick-issue**, **tdd**)
- **Refactor / cleanup** — Opus identifies what to clean; Codex applies
  it (the simplify stage of **pick-issue**)
- **Escalation** — automatically from **debugging** after 3 failed fix
  attempts, or whenever a fundamentally different perspective or deep
  investigation is needed

## Process

### Step 1: Prepare Context

Always carry the intent/essence down — that is the thing Codex is
weakest at supplying for itself. Then add the stage-specific scope:

- **Plan**: the design/intent, the spec or design doc, the constraints.
  Ask for a plan that is broad, deep, and short.
- **Implementation**: the design you've settled on, which files, which
  behaviors, the TDD expectation, conventions to respect.
- **Refactor**: the specific cleanups you've identified (duplication,
  naming, dead code, structure) — as a concrete list, not "clean this up."
- **Escalation**: the problem, all attempts tried and why each failed,
  the hypotheses, relevant code paths.

### Step 2: Delegate

Use the `codex:codex-rescue` subagent with a clear, specific request.
Never delegate vague requests ("fix this bug", "build the feature",
"make a plan", "clean this up"). Give Codex the essence *and* the
concrete scope so it executes thoroughly without drifting from the point.

For refactor specifically: hand Codex the **list of issues you found**
and have it apply the edits. Do not edit the files yourself.

### Step 3: Review (this is Opus's job)

Whatever Codex returns is a **draft**, not an accepted change.

- Read it carefully and understand the reasoning
- Check it against the **essence**: did it stay on the point, or get
  lost in details and miss what the user actually wanted?
- For plans: play the critic — poke holes, find gaps, name what's missing
- Do NOT blindly accept the output

This review step is exactly where Opus earns its place in the chain:
Codex executes completely but can lose the thread and writes dirty code;
Opus holds the thread and knows what clean looks like. If review finds
problems, point them out and send them **back to Codex to fix** — don't
fix them yourself.

### Step 4: Verify via TDD

Bring the Codex work through the normal TDD cycle:
1. A failing test must precede the production code (delegated or not)
2. Confirm the implementation makes it pass
3. Run the full test suite

Use the **verify** skill to confirm the result works with evidence.

## Forbidden

- Opus writing the plan, the implementation, or the refactor edits
  itself — docs are the only thing Opus writes
- Fixing review findings by editing files yourself instead of sending
  them back to Codex
- Accepting Codex output without understanding it
- Skipping verification because "Codex said so"
- Delegating without carrying the intent/essence down
- Delegating vague requests with no concrete scope
