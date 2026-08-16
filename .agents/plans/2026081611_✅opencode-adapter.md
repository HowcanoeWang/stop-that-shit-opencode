# OpenCode Adapter Implementation Plan

## Goal

Add the smallest OpenCode host adapter and local plugin that reuse ControlEvent
v1 and the existing controller without changing policy behavior.

## Scope

1. Classify OpenCode built-in tools and normalize `chat.message` and
   `tool.execute.before` inputs.
2. Add a local ESM plugin entrypoint with parent/child session contract
   inheritance and fail-open internal errors.
3. Distinguish OpenCode execution denial from Codex permission-deny audit
   responses while preserving Codex defaults.
4. Add deterministic adapter/plugin tests and run all existing verification.

## Constraints

- Base directly on upstream `main`; do not depend on Claude PR #4.
- Keep `package.json` private and do not add npm publication machinery.
- Do not add cross-process locks: OpenCode plugin callbacks share one process
  and controller state transitions are synchronous.
- Keep Codex hook files and behavior unchanged.

## Acceptance

- Review mode blocks OpenCode write tools and mutating/unknown shell commands.
- Change mode, path locks, dependency/hash policies, and agent budgets work.
- Child sessions inherit the root contract without parsing child prompts as new
  user authority.
- Internal plugin failures fail open; policy denials still throw before tool
  execution.
- `npm test`, `npm run eval`, and `npm run release:check` pass.

## Result

- Implemented the OpenCode adapter, classifier, GitHub-installable plugin
  entrypoint, and root-session inheritance without adding locks or npm
  publication machinery.
- Verified plugin loading and packed installation with OpenCode 1.18.18 in an
  isolated configuration.
- Passed 107/107 tests, 14/14 paired-case arms, release validation, and release
  artifact import.
