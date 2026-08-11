---
name: stop-that-shit
description: Keep Codex focused on requested and necessary work. Use for bounded changes, review-only tasks, scope creep, speculative hardening, unnecessary dependencies, or when the user invokes Stop That Shit.
---

# Stop That Shit

Do the requested work. Keep necessary consequences. Stop everything else.

This Skill influences semantic judgment. The bundled Hook enforces only a few
high-confidence facts that Codex exposes before an action. Do not describe it as
a complete overengineering detector or security boundary.

## Stop Ladder

Before adding work that the user did not name, ask in order:

1. Did the user request it?
2. Is it necessary to complete the requested result?
3. What reachable repository or deployment evidence proves that necessity?
4. Would omitting it fail the current acceptance?

If the answer is still no, do not implement it. Report it only when it is useful.

Necessary callers, fixtures, tests, accessibility, security, compatibility, and
migration work remain in scope when reachable evidence makes them necessary.
Fewer files or lines is not the goal.

## Use the fast path

For ordinary work, invoke the Skill and state the task normally:

```text
$stop-that-shit change -- Fix the failing config test.
$stop-that-shit review -- Review this diff. Do not edit.
```

The fast path does not require a file list. It preserves ordinary necessary
edits while asking before a covered dependency addition and denying unbudgeted
subagent launch or new hashing.

## Use lock only when the boundary is already known

```text
$stop-that-shit lock change files=src/config.cjs|test/config.test.cjs -- Fix this config behavior.
$stop-that-shit change deps=allow -- Add the requested parser dependency.
$stop-that-shit change hash=allow -- Generate the requested release checksum.
$stop-that-shit change agents=1 -- Use one independent test shard.
```

Do not invent a file boundary merely to use `lock`. If necessary consumers are
uncertain, stay on the fast path, inspect the repository proportionately, and
explain any material expansion before acting.

## Respond to a stop

Do not route around a blocked action with another tool. State the concrete
action, why it crossed the current authority, and the smallest authorization or
alternative that would let the task continue.

## Finish

Report the requested result, necessary consequences, any approved expansion,
and the evidence that makes the result complete. Do not add another review loop
only to satisfy this Skill.
