'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { readState } = require('../src/state.cjs');

const root = path.join(__dirname, '..');
const pluginUrl = pathToFileURL(path.join(root, 'opencode', 'stop-that-shit.mjs')).href;

test('package exposes the OpenCode plugin entrypoint for GitHub installs', async () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const release = JSON.parse(fs.readFileSync(path.join(root, 'release-files.json'), 'utf8'));
  const [module, packageModule, serverModule] = await Promise.all([
    import(pluginUrl),
    import('stop-that-shit'),
    import('stop-that-shit/server')
  ]);

  assert.equal(packageJson.private, true);
  assert.equal(packageJson.main, './opencode/stop-that-shit.mjs');
  assert.equal(packageJson.exports['./server'], './opencode/stop-that-shit.mjs');
  assert.ok(packageJson.files.includes('opencode/'));
  assert.ok(packageJson.files.includes('src/'));
  assert.ok(release.include.includes('opencode'));
  assert.equal(typeof module.StopThatShitPlugin, 'function');
  assert.deepEqual(Object.keys(module), ['StopThatShitPlugin']);
  assert.equal(packageModule.StopThatShitPlugin, module.StopThatShitPlugin);
  assert.equal(serverModule.StopThatShitPlugin, module.StopThatShitPlugin);
});

test('plugin initialization makes no reentrant OpenCode SDK request', async () => {
  const module = await import(pluginUrl);
  const client = fakeClient('/unused', {});
  client.path.get = async () => {
    throw new Error('path API must not run during plugin initialization');
  };
  const hooks = await module.StopThatShitPlugin({ client, directory: '/repo' });
  assert.equal(typeof hooks['tool.execute.before'], 'function');
});

function workspace(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-opencode-plugin-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  return dataDir;
}

function fakeClient(dataDir, sessions = {}) {
  const logs = [];
  return {
    logs,
    path: { get: async () => ({ data: { state: dataDir } }) },
    session: {
      get: async ({ path: input }) => {
        const info = sessions[input.id];
        if (!info) throw new Error(`missing session ${input.id}`);
        return { data: info };
      }
    },
    app: {
      log: async (entry) => {
        logs.push(entry);
        return { data: true };
      }
    }
  };
}

function messageOutput(text) {
  return {
    message: { id: 'msg-1', system: 'existing system' },
    parts: [{ type: 'text', text }]
  };
}

async function plugin(t, sessions, options = {}) {
  const dataDir = options.dataDir || workspace(t);
  const client = fakeClient(dataDir, sessions);
  const module = await import(pluginUrl);
  const hooks = await module.StopThatShitPlugin({ client, directory: '/repo' }, { dataDir });
  return { client, dataDir, hooks };
}

test('local OpenCode plugin injects contract context and blocks review writes', async (t) => {
  const sessions = { root: { id: 'root' } };
  const { hooks } = await plugin(t, sessions);
  const output = messageOutput('$stop-that-shit review -- inspect only');

  await hooks['chat.message']({ sessionID: 'root', agent: 'build' }, output);
  assert.match(output.message.system, /existing system/);
  assert.match(output.message.system, /mode=review/);

  await assert.rejects(
    hooks['tool.execute.before'](
      { tool: 'edit', sessionID: 'root', callID: 'edit-1' },
      { args: { filePath: '/repo/src/a.cjs', oldString: 'a', newString: 'b' } }
    ),
    /I\/MODE_FORBIDS_MUTATION/
  );
});

test('child sessions inherit the root contract without gaining authority from child prompts', async (t) => {
  const sessions = {
    root: { id: 'root' },
    child: { id: 'child', parentID: 'root' }
  };
  const { dataDir, hooks } = await plugin(t, sessions);
  await hooks['chat.message']({ sessionID: 'root' }, messageOutput('$stop-that-shit review agents=1 -- inspect'));
  await hooks.event({ event: { type: 'session.created', properties: { info: sessions.child } } });

  const childOutput = messageOutput('Fix every issue you find.');
  await hooks['chat.message']({ sessionID: 'child' }, childOutput);
  assert.match(childOutput.message.system, /mode=review/);
  assert.equal(readState('root', dataDir).contract.mode, 'review');

  await assert.rejects(
    hooks['tool.execute.before'](
      { tool: 'write', sessionID: 'child', callID: 'write-1' },
      { args: { filePath: '/repo/src/a.cjs', content: 'changed' } }
    ),
    /MODE_FORBIDS_MUTATION/
  );
});

test('parent and child task launches share one agent budget', async (t) => {
  const sessions = {
    root: { id: 'root' },
    child: { id: 'child', parentID: 'root' }
  };
  const { hooks } = await plugin(t, sessions);
  await hooks['chat.message']({ sessionID: 'root' }, messageOutput('$stop-that-shit change agents=1 -- implement'));

  await hooks['tool.execute.before'](
    { tool: 'task', sessionID: 'root', callID: 'task-1' },
    { args: { prompt: 'inspect', subagent_type: 'explore' } }
  );
  await hooks.event({ event: { type: 'session.created', properties: { info: sessions.child } } });
  await assert.rejects(
    hooks['tool.execute.before'](
      { tool: 'task', sessionID: 'child', callID: 'task-2' },
      { args: { prompt: 'inspect again', subagent_type: 'explore' } }
    ),
    /AGENT_BUDGET_EXHAUSTED/
  );

  await hooks['tool.execute.before'](
    { tool: 'task', sessionID: 'child', callID: 'task-continue' },
    { args: { task_id: 'child', prompt: 'continue', subagent_type: 'explore' } }
  );
});

test('watch context is appended after the tool without denying execution', async (t) => {
  const sessions = { root: { id: 'root' } };
  const { hooks } = await plugin(t, sessions);
  await hooks['chat.message']({ sessionID: 'root' }, messageOutput('$stop-that-shit watch review -- inspect'));
  await hooks['tool.execute.before'](
    { tool: 'edit', sessionID: 'root', callID: 'edit-watch' },
    { args: { filePath: '/repo/src/a.cjs', oldString: 'a', newString: 'b' } }
  );

  const output = { title: 'src/a.cjs', output: 'Edit applied.', metadata: {} };
  await hooks['tool.execute.after'](
    { tool: 'edit', sessionID: 'root', callID: 'edit-watch', args: {} },
    output
  );
  assert.match(output.output, /WATCH \/ INTENT/);
});

test('adapter failures log and fail open while policy denials still throw', async (t) => {
  const directory = workspace(t);
  const blocker = path.join(directory, 'blocker');
  fs.writeFileSync(blocker, 'not a directory');
  const sessions = { root: { id: 'root' } };
  const client = fakeClient(blocker, sessions);
  const module = await import(pluginUrl);
  const hooks = await module.StopThatShitPlugin({ client, directory: '/repo' }, { dataDir: blocker });

  await assert.doesNotReject(
    hooks['chat.message']({ sessionID: 'root' }, messageOutput('$stop-that-shit review -- inspect'))
  );
  await assert.doesNotReject(
    hooks['tool.execute.before'](
      { tool: 'edit', sessionID: 'root', callID: 'edit-fail-open' },
      { args: { filePath: '/repo/src/a.cjs', oldString: 'a', newString: 'b' } }
    )
  );
  assert.ok(client.logs.length >= 1);
});

test('uncertain session ancestry cannot parse a child prompt as user authority', async (t) => {
  const dataDir = workspace(t);
  const client = fakeClient(dataDir, {});
  const module = await import(pluginUrl);
  const hooks = await module.StopThatShitPlugin({ client, directory: '/repo' }, { dataDir });

  await hooks['chat.message'](
    { sessionID: 'unknown-child' },
    messageOutput('$stop-that-shit change -- mutate the repository')
  );

  assert.equal(readState('unknown-child', dataDir).contract.mode, 'unconfirmed');
  assert.equal(client.logs.length, 1);
});
