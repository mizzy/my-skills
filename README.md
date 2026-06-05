# my-skills

Personal Claude Code skills for a design-first, TDD-driven development workflow: brainstorming, planning, TDD, debugging, verification, review, merge, and Codex integration.

## Skills

| Skill | Description |
| ----- | ----------- |
| `brainstorming` | Explore design before implementation; produces a design doc, plan, Draft PR, and GitHub Issues. |
| `grill-me` | Exhaustively question a plan or design one question at a time, traversing the design tree with a recommended answer for each. |
| `plan` | Decompose specs/design docs into bite-sized TDD tasks with file paths and examples. |
| `pick-issue` | Pick a GitHub Issue, create a worktree, implement with TDD, verify, review 5x, and open a PR. |
| `tdd` | Enforce Red-Green-Refactor — no production code without a failing test first. |
| `debugging` | Systematic root-cause investigation before any fix attempt. |
| `verify` | Require evidence (commands + output) before claiming work is complete. |
| `review` | Run 5 rounds of self-review against the plan/spec, fixing issues each round. |
| `merge-when-ready` | Wait for CI to pass, mark draft PRs ready, remove the worktree, then merge and clean up. |
| `codex` | Delegate all hands-on work (plan-writing, implementation, refactoring) to Codex. |

## Install

These skills are distributed as a Claude Code plugin via a marketplace.

1. Add this repository as a marketplace:

   ```
   /plugin marketplace add mizzy/my-skills
   ```

2. Install the plugin:

   ```
   /plugin install my-skills
   ```

Once installed, the skills become available in Claude Code. Invoke a skill with
its slash command (e.g. `/brainstorming`, `/pick-issue`), or let Claude pick one
automatically based on the task.

## Updating

After changing any skill's content:

1. Bump `version` in `.claude-plugin/plugin.json`.
2. Commit and push.
3. Refresh the marketplace cache:

   ```
   /plugin marketplace update my-skills
   ```

4. Update the plugin:

   ```
   /plugin update
   ```

`/plugin update` detects the version change and updates the plugin. If the
marketplace cache is stale, the version bump won't be picked up — always run
`marketplace update` before `plugin update`.
