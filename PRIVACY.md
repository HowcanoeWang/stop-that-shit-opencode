# Privacy

Stop That Shit is local-only. It has no telemetry, cloud service, transcript
upload, or analytics endpoint.

The plugin stores one small JSON file per local Codex session in the host-owned
plugin data directory. It contains only the active contract fields needed by
later Hooks. Raw prompts, tool inputs, code, diffs, command output, and model
responses are not stored by this plugin.

The session filename is derived from the opaque host session identifier so that
the identifier itself is not exposed as a path. This local derivation is not an
anonymity or security claim.

Removing the plugin does not necessarily remove host-owned plugin data. Users
may delete that plugin data through their normal Codex data-management workflow.
