# Install Stop That Shit as an Agent

This file is for a Codex agent that is helping a user install Stop That Shit
`0.0.1`. Keep the installation narrow. Do not clone the repository, modify the
user's Codex configuration, copy authentication files, or bypass Hook review.

## Default installation

1. Confirm that `codex` is available and Node.js 18 or newer is installed.
2. Run these commands one at a time:

   ```powershell
   codex plugin marketplace add lennney/stop-that-shit
   codex plugin add stop-that-shit@stop-that-shit
   ```

3. Ask the user to restart Codex.
4. Ask the user to open a fresh Codex CLI TUI and enter `/hooks`.
5. Stop and let the user inspect and trust the Hook commands.

A correct Guard installation has these two active events:

```text
UserPromptSubmit  Installed 1  Active 1
PreToolUse        Installed 1  Active 1
```

The other events, including `Stop`, should show zero installed Hooks. An update
can require another review because Codex records trust for the Hook definition.
Do not disable or work around this review.

## Smoke test

Use a disposable repository. Do not run the write test in the user's active
project.

First, verify that review stays read-only:

```text
$stop-that-shit review -- Review this repository. Report findings; do not edit.
```

Then give explicit change authority:

```text
$stop-that-shit change -- Create scratch/sts-smoke.txt containing the word pass.
```

Report whether the review attempted a covered write and whether the change
created only the requested file. Do not claim that one smoke test proves a
general improvement in model behavior.

## Skill-only fallback

If the user does not want Hooks, install the advisory Skill instead:

```text
$skill-installer Install stop-that-shit from https://github.com/lennney/stop-that-shit/tree/0.0.1/skills/stop-that-shit
```

Ask the user to start a new Codex task after installation. Explain that this
mode has no runtime enforcement and cannot change Codex sandbox or approval
settings.

## Report back

Tell the user:

- which mode you installed;
- the installed plugin version, if available;
- whether the two expected Hook events are active;
- the smoke-test result, if the user authorized one;
- any step that still needs user action.

For troubleshooting and uninstall commands, read [`INSTALL.md`](INSTALL.md).
