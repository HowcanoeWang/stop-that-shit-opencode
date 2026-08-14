# Architecture

Stop That Shit 0.0.2 has two narrow deep modules: a host-independent control
decision and a metadata-only runtime evidence sidecar.

```text
Codex Hook JSON
    -> Codex Adapter
    -> ControlEvent v1
    -> decision(contract, action)
    -> Codex Hook response + RuntimeEvent v1
```

- `src/decision.cjs` contains host-independent decisions.
- `src/contracts.cjs` parses the small prompt contract.
- `src/controller.cjs` stores the current contract and applies decisions.
- `src/adapters/codex-*.cjs` classify Codex events and render Hook responses.
- `src/state.cjs` stores only per-session contract state.
- `src/runtime-audit.cjs` appends and reads metadata-only decision events.
- `src/runtime-annotations.cjs` appends independent human labels.

The packaged Codex manifest subscribes to two events: user prompt and before
tool use. It does not add a `SubagentStart` Hook, track completed actions, build
a dependency graph, restore semantic checkpoints, or judge code quality.

Control state and observed response are deliberately separate:

```text
OFF        no checks and no normal-action events
OBSERVING  check and record; never return permission deny
ARMED      explicit task contract; may return permission deny

response: none | context_returned | permission_deny_returned
host effect: unobserved
```

Installation defaults to `OBSERVING / unconfirmed`. An explicit task mode arms
the Guard; `watch` stays observing and `off` stops normal-action recording.

Hard decisions are limited to observable facts:

- writes in a confirmed non-mutating mode;
- writes outside an optional explicit `files=` list;
- covered dependency additions without authority;
- subagent launches beyond `agents=N`;
- high-confidence hashing without `hash=allow`.

Every observing or armed check is recorded even when the policy allows it, so
runtime totals retain a real checked-action denominator. Audit write failures
fail open and never change the control decision. The Skill handles broader
semantic judgment through the Stop Ladder. Specialized tool paths may bypass
Hooks, so this remains a guardrail, not a security sandbox.
