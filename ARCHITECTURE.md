# Architecture

Stop That Shit 0.0.1 has one deep module: given the current task contract and a
covered proposed action, return `allow`, `ask`, `stop`, or guidance.

```text
Codex Hook JSON
    -> Codex Adapter
    -> ControlEvent v1
    -> decision(contract, action)
    -> Codex Hook response
```

- `src/decision.cjs` contains host-independent decisions.
- `src/contracts.cjs` parses the small prompt contract.
- `src/controller.cjs` stores the current contract and applies decisions.
- `src/adapters/codex-*.cjs` classify Codex events and render Hook responses.
- `src/state.cjs` stores only per-session contract state.

The runtime subscribes to four lifecycle points: session start, user prompt,
before tool use, and subagent start. It does not track every completed action,
build a dependency graph, restore semantic checkpoints, or judge code quality.

Hard decisions are limited to observable facts:

- writes in a confirmed non-mutating mode;
- writes outside an optional explicit `files=` list;
- covered dependency additions without authority;
- subagent launches beyond `agents=N`;
- high-confidence hashing without `hash=allow`.

The Skill handles broader semantic judgment through the Stop Ladder. Specialized
tool paths may bypass Hooks, so this remains a guardrail, not a security sandbox.
