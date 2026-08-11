# Install Stop That Shit 0.0.1

This pre-release is installed from a local Codex plugin marketplace. It requires
Node.js 18 or newer because every Hook command runs the bundled CommonJS entrypoint.

## 1. Install from GitHub

Add the repository as a Codex marketplace, then install the plugin:

```powershell
codex plugin marketplace add lennney/stop-that-shit
codex plugin add stop-that-shit@stop-that-shit
```

Restart Codex after installation.

## 2. Verify the source

Clone or inspect the public repository before trusting its Hooks.

Before installation, inspect these executable surfaces:

- `hooks/hooks.json`
- `hooks/stop-that-shit.cjs`
- `src/`

Run the local checks from the plugin root:

```powershell
npm test
npm run eval
npm run release:check
```

## 3. Local development install

The supported authoring path is the built-in Plugin Creator. In Codex, ask it
to wire the current plugin folder into a local marketplace:

```text
$plugin-creator Add this existing Stop That Shit plugin folder to a local marketplace for testing. Do not change its source files.
```

The repository includes `.agents/plugins/marketplace.json`. Add a local checkout
with:

```text
codex plugin marketplace add <local-checkout-root>
codex plugin add stop-that-shit@stop-that-shit
```

Restart the desktop app, open the Plugins Directory, select that marketplace,
and install Stop That Shit.

## 4. Review and trust Hooks

Installation does not trust command Hooks automatically. Start a fresh Codex
session, open `/hooks`, inspect every Stop That Shit command, and trust the exact
definitions only if they match the source you reviewed.

Codex records trust against the Hook definition hash. An update may require a
new review. Do not use a hook-trust bypass for ordinary installation.

## 5. Run a smoke test

In a disposable repository, start a new task:

```text
$stop-that-shit review -- Review this repository. Report findings; do not edit.
```

Ask Codex to attempt a covered write. The Hook denies it as an Intent
violation. Then explicitly change the contract:

```text
$stop-that-shit change -- Create scratch/sts-smoke.txt containing the word pass.
```

The narrow write should proceed. Remove the disposable file after confirming
the result.

This smoke test checks installation and contract switching. It is not evidence
that the plugin improves general Codex performance.

## Disable or uninstall

Use `/hooks` to disable the plugin Hooks immediately. Remove the plugin from the
Plugins Directory to uninstall it. Remove the marketplace separately if it is
no longer needed.

The plugin stores only the active per-session contract in the host-provided
`PLUGIN_DATA` directory. Uninstall behavior for that directory depends on the
host; review and remove it separately if desired.
