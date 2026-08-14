# Changelog

## 0.0.2 — pre-release

- Added `OFF`, `OBSERVING`, and `ARMED` control states with distinct context and
  permission-deny response outcomes; host effect is never inferred.
- Added local metadata-only `RuntimeEvent v1` logs, append-only annotations, and
  `doctor`, `runtime`, `explain`, and `label` inspection commands.
- Migrated paired fixtures to validated `CaseBundle v1` directories and added
  isolated runtime counts, infrastructure exclusions, paired outcome summaries,
  external case directories, and offline rescore.
- Added live-eval preflight for exact installed runtime-tree parity, pinned model
  and reasoning metadata, explicit infrastructure exclusions, and a required
  `--max-cells` paid-session cap after a stale-cache diagnostic run.
- Added JSON Schema validation with a generated standalone validator; Ajv remains
  a development dependency and is not loaded by the plugin runtime.

## 0.0.1 — pre-release

- Added the four-question Stop Ladder.
- Added Codex guards for non-mutating modes, optional file locks, dependency
  approval, subagent budgets, and high-confidence hash authority.
- Reduced the default Guard to `UserPromptSubmit` and `PreToolUse`; the shared
  Skill remains usable when Hooks are disabled.
- Added a public three-arm Codex evaluation harness with synthetic Good/Bad
  fixtures. Live run artifacts remain local and ignored.
- Added a small `ControlEvent v1` seam with Codex as the only Adapter.
- Added paired Bad/Good cases and local release validation.
- Removed experimental scope discovery, new-file and compatibility guessing,
  repeat fingerprints, action ledgers, and compaction checkpoints after live
  testing showed that the product was becoming more complex than its promise.
