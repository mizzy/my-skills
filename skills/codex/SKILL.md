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

Choose execution flags deliberately:

- Use `--write` for implementation and refactor work that edits files.
  For review-purpose investigation, diagnosis, or research that must not
  edit, omit `--write` or make the run explicitly read-only.
- Choose foreground/background as the Claude Code execution mode when
  invoking the subagent: foreground for small, clearly bounded work,
  roughly 1-2 files; background for large, open-ended, multi-step, or
  long-running work. When unclear, prefer background.
- Use `--resume` for "continue", "keep going", "resume", "apply the top
  fix", or "dig deeper"; it continues the previous Codex thread
  (`resume-last`). Use `--fresh` when the work should start a new thread.
- Leave `--effort` unset unless the user explicitly asks. If set, it
  accepts `none`, `minimal`, `low`, `medium`, `high`, or `xhigh`.
- Leave `--model` unset unless the user asks. Map `spark` to
  `gpt-5.3-codex-spark`.

For refactor specifically: hand Codex the **list of issues you found**
and have it apply the edits. Do not edit the files yourself.

### Step 2.5: Track the Job

For foreground runs, the result returns inline; no lifecycle
management is needed.

For background runs, delegation is not fire-and-forget. Opus is
responsible for collecting and reviewing the result, and tracks the job
itself by running the companion script via Bash:

- Check status: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" status` (optionally pass a job id)
- Fetch result: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" result <job-id>`
- Cancel a run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" cancel <job-id>`

The `/codex:status`, `/codex:result`, and `/codex:cancel` slash commands
exist for the user to type interactively. Opus uses the underlying script
directly because the slash-command form has `disable-model-invocation:
true` and is not model-invocable.

### Step 3: Review (this is Opus's job)

Whatever Codex returns is a **draft**, not an accepted change.

Opus's top review priority is root cause. No bandaids, no per-symptom
carve-outs at sibling call sites, no local patch that leaves the broken
state reachable. Take the long-term view: will a future caller re-reach
the same state, and should the type system make that state impossible?
Codex's "safe but dirty" output tends toward symptom-level fixes, so
this is exactly what Opus must catch first.

Then interrogate the draft concretely:

- Does it match the **essence** and stay on the point, or did Codex get
  lost in details and miss what the user actually wanted?
- Is the code safe but dirty: over-localized, duplicated, overly
  defensive, or structurally harder to maintain?
- What did Codex miss?
- For plans: play the critic — poke holes, find gaps, name what's missing.
- For code: suspect the draft at the edges — empty-state, null, and
  timeout behavior; race conditions and ordering; rollback, retry, and
  idempotency; data loss or corruption; auth, permission, and trust
  boundaries; version, schema, and migration skew.

This review step is exactly where Opus earns its place in the chain:
Codex executes completely but can lose the thread and writes dirty code;
Opus holds the thread and knows what clean looks like. If review finds
problems, point them out and send them **back to Codex to fix** — don't
fix them yourself.

Do not loop forever. If Opus sends a finding back to Codex and the same
finding is still not fixed after a second round, stop re-delegating and
switch tactics: change how the instruction is phrased, re-cut the scope,
or question Opus's own premise.

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
- Fire-and-forget background delegation without collecting the result
- Infinite re-delegation loops when the same finding remains unfixed
- Treating symptom-level bandaids as root-cause fixes
