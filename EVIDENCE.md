# Evidence

Version: 0.0.1 pre-release  
Last updated: 2026-08-11

## Current minimal candidate

Verified locally:

- plugin and Skill validators pass;
- 49/49 automated tests pass;
- 14/14 executable Bad/Good case arms pass;
- packaged Hook input/output works on Windows;
- review blocks covered writes and explicit change preserves the Good Case;
- optional file locks handle repository-relative and absolute patch paths;
- dependency authority, subagent budget, and high-confidence hash authority have
  paired allow/stop coverage;
- release allowlist excludes internal research, live fixtures, and references.
- a fresh minimal live Codex smoke run kept `review` read-only and completed the
  paired one-line `change` with 1/1 focused test.

The runtime stores only active contract fields and subscribes to four Hook
lifecycle points. It no longer performs action fingerprinting, compaction
checkpointing, automatic scope discovery, or semantic compatibility/new-file
guessing.

## What the earlier live runs taught us

Exploratory Codex CLI `0.145.0` runs used `gpt-5.6-sol`, `medium` reasoning,
`workspace-write`, approval `never`, and independent Git fixtures.

Two direct plugin runs with a hand-written file list passed tests but left a
reachable development fixture stale. They are scored 0/2 complete, not as an
effectiveness win. A separate read-only discovery experiment found the omitted
fixture, but added time, concepts, and another failure mode. That workflow was
removed from the current product rather than promoted to the default.

The same experiments found an absolute-path false positive. The current Adapter
normalizes patch paths relative to Hook `cwd`, with regression coverage.

These runs informed the simplification. They are not live acceptance evidence
for every behavior of the current reduced package. After simplification, one
fresh `review`/`change` smoke pair passed on Codex CLI `0.145.0`; it verifies the
core mode switch only, not general effectiveness.

## Not yet verified

The following are explicit limitations, not 0.0.1 release blockers. The project
does not require a large benchmark to make a probabilistic mitigation claim.

- a multi-scenario live baseline/plugin matrix for the reduced candidate;
- installation from a public immutable Git revision;
- interactive `/hooks` trust on a clean machine;
- macOS and Linux behavior;
- several distinct community scenarios and multiple seeds;
- specialized tool paths that may bypass normal Hook coverage.

## HERO-derived round 1

Three single-seed baseline/plugin pairs covered HERO H-001, E-003, and the H-003
Good Case. All six runs completed correctly; plugin runs introduced no Hook
blocks and preserved necessary hashing. Because every baseline was already
correct, the result is null-effect plus Good Case non-regression, not evidence
of improvement.

## Community reproduction screening

A synthetic candidate derived from a public endpoint/input scope-creep report
was run once per baseline/plugin arm. Both changed the same two necessary files,
passed the focused test, and added no abstraction, state, dependency, or mock
framework. The candidate is `not-reproduced` and is excluded from effectiveness
counts. Other strong public reports currently lack a sanitized repository or
exact task, so they remain `report-only` rather than being converted into more
leading synthetic fixtures.

## Claim rule

Do not claim that Stop That Shit solves Codex overengineering or publish an
improvement percentage from unit tests or this single scenario.

The defensible 0.0.1 claim is:

> Stop That Shit gives Codex a short on-demand decision ladder and enforces a
> few explicit task-authority rules on covered Hook paths. It may reduce some
> forms of execution drift, but it does not guarantee an effect on stochastic
> model behavior.
