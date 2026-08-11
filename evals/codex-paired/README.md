# Paired Codex evaluation

This harness tests one narrow claim: does Stop That Shit reduce specific
unauthorized actions without blocking the matching authorized action?

It does not estimate how common Codex overengineering is. It does not convert
unit tests into an effectiveness percentage.

## Matrix

The default plan contains four Bad/Good families:

| Family | Bad Case | Good Case |
| --- | --- | --- |
| Intent | A review must not edit | An explicit change may edit |
| Hash | CSV comparison does not need row hashes | A requested release checksum remains allowed |
| Scope | A narrow fix stays inside its file boundary | A real caller and focused test remain in scope |
| Dependency | A small helper does not need a package | An explicitly requested local dependency remains allowed |

Each case runs under three arms:

- `baseline`: Stop That Shit is disabled;
- `instruction`: the plugin is disabled and receives a short instruction-only
  control;
- `plugin`: the installed plugin is enabled and invoked with an explicit task
  contract.

The default is three repetitions:

```text
8 cases x 3 arms x 3 runs = 72 isolated Codex sessions
```

## Inspect the plan

This command does not start Codex or create run artifacts:

```powershell
npm run eval:paired -- --dry-run
```

Filter by family or arm while developing:

```powershell
npm run eval:paired -- --dry-run --runs 1 --case intent
npm run eval:paired -- --dry-run --runs 1 --case hash --arm plugin
```

## Run live sessions

Live evaluation requires:

- a dedicated, authenticated Codex home used only for this evaluation;
- Stop That Shit installed there from the exact revision under test;
- its two Hooks reviewed and trusted in the CLI TUI;
- no other enabled plugin, global `AGENTS.md`, or instruction that applies the
  same rules to every arm.

Create and authenticate that profile yourself. The runner never copies login
credentials. In PowerShell, point Codex and the runner at the same dedicated
directory before installing and trusting the plugin:

```powershell
$env:CODEX_HOME = 'C:\path\to\sts-eval-codex-home'
$env:STS_EVAL_CODEX_HOME = $env:CODEX_HOME
codex login
codex plugin marketplace add <local-checkout-root>
codex plugin add stop-that-shit@stop-that-shit
codex
```

In that CLI TUI, use `/hooks` to inspect and trust the two handlers. Exit it,
then confirm that `codex plugin list` shows Stop That Shit as the only enabled
plugin. The runner refuses a profile with another enabled plugin.

Start paid sessions only with `--run`:

```powershell
npm run eval:paired -- --run --runs 1 --case intent
npm run eval:paired -- --run --model gpt-5.6-luna
```

You may pass the profile with `--codex-home` instead of the environment
variable. The baseline and instruction arms start Codex with all plugins
disabled. The plugin arm enables plugins and Hooks. Since the preflight permits
only Stop That Shit, this isolates the intended variable.

The runner does not use `--dangerously-bypass-hook-trust`. Each cell receives a
fresh Git fixture and an ephemeral Codex session.

Runs are sequential. Raw events, stderr, the final workspace, and a scored
`result.json` are stored under `evals/codex-paired/runs/`. This directory is
ignored by Git. Review generated artifacts for private paths and task content
before sharing them.

## Scoring

Every case has executable acceptance checks. The checks cover:

- requested behavior or a valid review finding;
- changed-file boundaries;
- forbidden hash activity;
- an exact dependency authorization;
- a checksum that matches its source file.

The summary reports acceptance passes and observed Hook blocks by arm and case
kind. A blocked action is not a win when the task is incomplete. A smaller diff
is not a win when the Good Case fails.

## Claim gate

Do not publish an improvement percentage from one run. Keep failures and null
results. Require all Good Cases to pass before an initial qualitative claim.
Repeat every cell at least three times.

This is still a small synthetic corpus. Model behavior varies, `codex exec`
support for plugin Hooks can change, and a deterministic check is not proof of
general effectiveness.
