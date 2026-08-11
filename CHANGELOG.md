# Changelog

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
