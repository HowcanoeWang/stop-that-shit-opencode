# Host Adapter Contract

Codex and OpenCode have implemented Adapters. Both normalize host inputs into
the same `ControlEvent v1` and reuse the same contract, decision, state, and
runtime modules.

An Adapter may reuse the decision module only if its host exposes:

1. a stable session identifier;
2. user prompts or explicit mode changes;
3. a before-action event that can actually deny an action;
4. tool name, input, and enough information to classify mutability.

Lifecycle context injection is optional. The Codex package deliberately
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
The Adapter may report that it returned context or a host-specific denial, but
it must not claim the host prevented execution through every other path.
`RuntimeEvent v1` therefore records host effect as `unobserved`.

## OpenCode mapping

The OpenCode plugin maps user `chat.message` input to `prompt.submit` and
`tool.execute.before` to `action.before`. A denied action throws before the tool
runs and records `execution_denial_returned`; Codex continues to record
`permission_deny_returned`. Watch-only context is appended to a successful tool
result through `tool.execute.after`.

OpenCode creates a new session identifier for each `task` subagent. The plugin
maps child sessions to the root session contract, does not parse child prompts
as new user authority, and treats a `task_id` continuation as control rather
than a new delegation. If ancestry cannot be resolved, it fails open without
treating the uncertain child prompt as user authority.
