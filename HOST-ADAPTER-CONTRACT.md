# Host Adapter Contract

Codex is the only implemented Adapter in 0.0.2. This preserves a small future
seam without pretending that unbuilt harnesses are supported.

An Adapter may reuse the decision module only if its host exposes:

1. a stable session identifier;
2. user prompts or explicit mode changes;
3. a before-action event that can actually deny an action;
4. tool name, input, and enough information to classify mutability.

Lifecycle context injection is optional. The current Codex package deliberately
uses only user-prompt and before-action Hooks; it does not require or register a
subagent-start Hook.

The normalized event is versioned as `ControlEvent v1` and currently needs only:

```json
{
  "protocolVersion": 1,
  "kind": "action.before",
  "sessionId": "opaque",
  "action": {
    "name": "apply_patch",
    "mutability": "write",
    "affectedPaths": ["src/config.cjs"],
    "dependencyIntent": false,
    "hashIntent": false
  }
}
```

Host-specific event names, tool classification, paths, and response JSON belong
inside the Adapter. Model identity is evaluation metadata, not a new Adapter.
The Adapter may report that it returned context or permission deny, but it must
not claim the host prevented execution without a separate completion signal.
`RuntimeEvent v1` therefore records host effect as `unobserved`.

One Adapter is still a hypothetical seam. Do not add another abstraction layer
until a second real harness is implemented and passes the same Bad/Good cases.
