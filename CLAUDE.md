# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal Claude Code **plugin** distributed via a marketplace. It contains
no application code — each "skill" is a single `skills/<name>/SKILL.md`
markdown file with YAML frontmatter (`name`, `description`) followed by the
skill's instructions. There is no build, lint, or test step; the artifacts
are the markdown files themselves.

Plugin wiring:
- `.claude-plugin/plugin.json` — plugin manifest and `version`.
- `.claude-plugin/marketplace.json` — marketplace entry pointing at `./`.
- `package.json` — present only so Node-based skill scripts can run as ESM
  (`"type": "module"`); its `version` is unrelated to the plugin version.

## Bump the plugin version on EVERY skill change

**Whenever you change any file under `skills/`, you MUST bump `version` in
`.claude-plugin/plugin.json` as part of the same change.** This is easy to
forget — treat the bump as part of the edit, not a follow-up. The bump is
what `/plugin update` detects; without it, a content change won't be picked
up by installs.

Full update procedure after editing a skill:

1. Bump `version` in `.claude-plugin/plugin.json`.
2. Commit & push (feature branch → draft PR, per the global git rules).
3. `/plugin marketplace update my-skills` — refresh the marketplace cache.
4. `/plugin update` — select `my-skills` from the menu.

`/plugin update` detects the version change to apply the update; a stale
marketplace cache can't see the new version, so always run `marketplace
update` first. Passing an argument (`/plugin update my-skills`) is ignored —
it always shows the menu.

## The skills form one workflow chain

The skills are not independent — they compose into a design-first, TDD-driven
development loop, and they reference each other by name. Understanding the
chain matters more than any single skill:

```
brainstorming → plan → pick-issue → tdd → verify → review → merge-when-ready
                          ↘ debugging (on failure)
codex  = the execution substrate underneath all of the above
```

- **brainstorming** explores design before any code; outputs a design doc,
  plan, draft PR, and GitHub Issues.
- **plan** decomposes a spec/design doc into bite-sized TDD tasks with file
  paths and code examples.
- **pick-issue** is the implementation driver: pick a GitHub Issue, create a
  worktree, implement via **tdd**, **verify**, **review** 5×, then open a PR.
- **tdd** enforces Red-Green-Refactor — no production code without a failing
  test first.
- **debugging** is entered on test failures/bugs; requires root-cause
  investigation before any fix, and escalates to **codex** after 3 failed
  attempts.
- **verify** demands command output as evidence before "done."
- **review** runs 5 self-review rounds against the plan/spec.
- **merge-when-ready** waits for CI to pass, marks draft PRs ready, removes the
  worktree, then merges the PR and cleans up — the final step after **review**.

### codex is the execution model

The `codex` skill encodes the repo's core working model: **Opus reads,
thinks, reviews, and writes only docs — all hands-on editing (plans,
implementation, refactors) is delegated to the `codex` CLI** (`人間 ↔ Opus ↔
Codex`). When editing the `codex` skill, keep it **self-contained**: delegate
by invoking the `codex` CLI directly via Bash (`codex exec`, `codex exec
resume --last`), never via an external subagent or companion script. Track
background runs with `run_in_background: true` + the Task tools
(`TaskList`/`TaskOutput`/`TaskStop`).

## Worktrees

`pick-issue` creates git worktrees under `.worktrees/` (gitignored). The repo
uses standard `git worktree` (not `git wt`).

## Editing skills

- Keep the frontmatter shape: `name` matching the directory, plus a
  `description` that states *when to use* the skill (the descriptions are how
  Claude auto-selects a skill).
- When a skill references another (e.g. pick-issue → tdd/verify/review),
  preserve those names — they are the wiring of the chain above.
