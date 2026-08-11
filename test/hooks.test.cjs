'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { handleHook } = require('../src/hook-policy.cjs');

function workspace(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  return { dataDir };
}

function prompt(session, text) {
  return {
    session_id: session,
    turn_id: 'turn-1',
    hook_event_name: 'UserPromptSubmit',
    prompt: text
  };
}

function pre(session, toolName, toolInput, turnId = 'turn-1') {
  return {
    session_id: session,
    turn_id: turnId,
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_use_id: `${toolName}-1`,
    tool_input: toolInput
  };
}

test('review contract blocks apply_patch', (t) => {
  const options = workspace(t);
  handleHook(prompt('review-session', '$stop-that-shit review -- inspect only'), options);
  const output = handleHook(pre('review-session', 'apply_patch', { command: '*** Begin Patch' }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /I\/MODE_FORBIDS_MUTATION/);
});

test('explicit change contract preserves the paired good case', (t) => {
  const options = workspace(t);
  handleHook(prompt('change-session', '$stop-that-shit change -- fix P1 only'), options);
  const output = handleHook(pre('change-session', 'apply_patch', { command: '*** Begin Patch' }), options);
  assert.equal(output, null);
});

test('default hash policy blocks a newly added hashing API', (t) => {
  const options = workspace(t);
  handleHook(prompt('hash-deny-session', '$stop-that-shit change -- add the requested field'), options);
  const output = handleHook(pre('hash-deny-session', 'apply_patch', {
    patch: "*** Begin Patch\n+const digest = createHash('sha256').update(value).digest('hex');\n*** End Patch"
  }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /H\/HASH_NOT_AUTHORIZED/);
});

test('explicit hash allow preserves a required checksum good case', (t) => {
  const options = workspace(t);
  handleHook(prompt('hash-allow-session', '$stop-that-shit change hash=allow -- add the required release checksum'), options);
  const output = handleHook(pre('hash-allow-session', 'Bash', { command: 'sha256sum dist/release.zip' }), options);
  assert.equal(output, null);
});

test('hash ask requires user approval before a covered action', (t) => {
  const options = workspace(t);
  handleHook(prompt('hash-ask-session', '$stop-that-shit change hash=ask -- prepare the artifact'), options);
  const output = handleHook(pre('hash-ask-session', 'Bash', { command: 'Get-FileHash dist/release.zip -Algorithm SHA256' }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /H\/HASH_NOT_AUTHORIZED/);
});

test('ordinary prose containing hash is not blocked', (t) => {
  const options = workspace(t);
  handleHook(prompt('hash-prose-session', '$stop-that-shit change -- update the docs'), options);
  const output = handleHook(pre('hash-prose-session', 'apply_patch', {
    patch: '*** Begin Patch\n+Explain why a hash is not an anonymity boundary.\n*** End Patch'
  }), options);
  assert.equal(output, null);
});

test('files contract blocks a patch outside the declared write boundary', (t) => {
  const options = workspace(t);
  handleHook(prompt('files-deny-session', '$stop-that-shit change files=src/config.cjs|test/config.test.cjs -- update config shape'), options);
  const output = handleHook(pre('files-deny-session', 'apply_patch', {
    patch: '*** Begin Patch\n*** Update File: README.md\n@@\n-old\n+new\n*** End Patch'
  }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /S\/PATH_OUTSIDE_CONTRACT/);
});

test('files contract requires approval when a write path is unproven', (t) => {
  const options = workspace(t);
  handleHook(prompt('files-unknown-session', '$stop-that-shit change files=src/config.cjs -- update config'), options);
  const output = handleHook(pre('files-unknown-session', 'Bash', { command: "Set-Content -Path src/config.cjs -Value 'x'" }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /S\/WRITE_PATH_UNPROVEN/);
});

test('dependency installation asks before expanding the task', (t) => {
  const options = workspace(t);
  handleHook(prompt('deps-deny-session', '$stop-that-shit change -- format one existing value'), options);
  const output = handleHook(pre('deps-deny-session', 'Bash', { command: 'npm install lodash' }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /S\/DEPENDENCY_NOT_AUTHORIZED/);
});

test('deps allow preserves an explicitly requested dependency', (t) => {
  const options = workspace(t);
  handleHook(prompt('deps-allow-session', '$stop-that-shit change deps=allow -- add the requested parser package'), options);
  assert.equal(handleHook(pre('deps-allow-session', 'Bash', { command: 'npm install yaml' }), options), null);
});

test('review contract allows a clearly read-only shell command', (t) => {
  const options = workspace(t);
  handleHook(prompt('read-session', '$stop-that-shit review -- inspect only'), options);
  const output = handleHook(pre('read-session', 'Bash', { command: 'git diff --stat' }), options);
  assert.equal(output, null);
});

test('review contract blocks a shell command with unproven mutability', (t) => {
  const options = workspace(t);
  handleHook(prompt('unknown-session', '$stop-that-shit review -- inspect only'), options);
  const output = handleHook(pre('unknown-session', 'Bash', { command: 'node scripts/custom-task.js' }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /MUTABILITY_UNPROVEN/);
});

test('watch level warns but does not deny mutation', (t) => {
  const options = workspace(t);
  handleHook(prompt('watch-session', '$stop-that-shit watch review -- inspect only'), options);
  const output = handleHook(pre('watch-session', 'apply_patch', { command: 'patch' }), options);
  assert.equal(output.hookSpecificOutput.permissionDecision, undefined);
  assert.match(output.hookSpecificOutput.additionalContext, /MODE_FORBIDS_MUTATION/);
});
