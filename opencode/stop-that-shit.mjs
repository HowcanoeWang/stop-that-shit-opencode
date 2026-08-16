import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  handleOpenCodeMessage,
  handleOpenCodeTool,
  promptText
} = require('../src/adapters/opencode-hooks.cjs');
const { contractContext } = require('../src/controller.cjs');
const { readState } = require('../src/state.cjs');

function fallbackDataDir() {
  const root = process.platform === 'win32'
    ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(root, 'opencode', 'stop-that-shit');
}

function resolveDataDir(options) {
  if (typeof options.dataDir === 'string' && options.dataDir) return options.dataDir;
  return fallbackDataDir();
}

function appendSystemContext(output, text) {
  if (!text || !output || !output.message) return;
  const block = `Stop That Shit context:\n${text}`;
  const current = String(output.message.system || '');
  output.message.system = current ? `${current}\n\n${block}` : block;
}

function appendToolContext(output, text) {
  if (!text || !output) return;
  const block = `<stop_that_shit_context>\n${text}\n</stop_that_shit_context>`;
  output.output = output.output ? `${output.output}\n\n${block}` : block;
}

export const StopThatShitPlugin = async ({ client, directory }, options = {}) => {
  const dataDir = resolveDataDir(options);
  const roots = new Map();
  const pendingContext = new Map();

  async function logFailure(phase, error) {
    try {
      await client.app.log({
        body: {
          service: 'stop-that-shit',
          level: 'error',
          message: `OpenCode adapter failed open during ${phase}`,
          extra: { error: error instanceof Error ? error.message : String(error) }
        }
      });
    } catch {}
  }

  function rememberSession(info) {
    if (!info || !info.id) return;
    if (info.parentID && !roots.has(info.parentID)) return;
    const root = info.parentID ? roots.get(info.parentID) : info.id;
    roots.set(info.id, root);
  }

  async function rootSession(sessionID) {
    if (roots.has(sessionID)) return roots.get(sessionID);
    const visited = [];
    let current = sessionID;
    for (let depth = 0; depth < 32; depth += 1) {
      visited.push(current);
      const response = await client.session.get({ path: { id: current } });
      const info = response && response.data;
      if (!info || !info.parentID) break;
      if (roots.has(info.parentID)) {
        current = roots.get(info.parentID);
        break;
      }
      current = info.parentID;
    }
    for (const id of visited) roots.set(id, current);
    roots.set(current, current);
    return current;
  }

  async function resolveRoot(sessionID, phase) {
    try {
      return { sessionID: await rootSession(sessionID), certain: true };
    } catch (error) {
      await logFailure(phase, error);
      return { sessionID, certain: false };
    }
  }

  function queueContext(key, text) {
    if (pendingContext.size >= 100) {
      const oldest = pendingContext.keys().next().value;
      clearTimeout(pendingContext.get(oldest).timer);
      pendingContext.delete(oldest);
    }
    const timer = setTimeout(() => pendingContext.delete(key), 10 * 60 * 1000);
    if (typeof timer.unref === 'function') timer.unref();
    pendingContext.set(key, { text, timer });
  }

  return {
    event: async ({ event }) => {
      const properties = event && event.properties || {};
      if (event && (event.type === 'session.created' || event.type === 'session.updated')) {
        rememberSession(properties.info);
      }
      if (event && event.type === 'session.deleted') {
        const id = properties.info && properties.info.id || properties.sessionID;
        if (id) roots.delete(id);
      }
    },

    'chat.message': async (input, output) => {
      const actualSessionID = input.sessionID;
      const resolved = await resolveRoot(actualSessionID, 'session resolution');
      const controlSessionID = resolved.sessionID;
      let result = null;
      try {
        if (resolved.certain && actualSessionID === controlSessionID && promptText(output.parts)) {
          result = handleOpenCodeMessage(input, output, { controlSessionID, directory }, { dataDir });
        }
        const active = contractContext(readState(controlSessionID, dataDir).contract);
        appendSystemContext(output, result && result.kind === 'context' ? result.text : active);
      } catch (error) {
        await logFailure('chat.message', error);
      }
    },

    'tool.execute.before': async (input, output) => {
      const resolved = await resolveRoot(input.sessionID, 'session resolution');
      const controlSessionID = resolved.sessionID;
      let result;
      try {
        result = handleOpenCodeTool(input, output, { controlSessionID, directory }, { dataDir });
      } catch (error) {
        await logFailure('tool.execute.before', error);
        return;
      }

      if (result.kind === 'context') queueContext(`${input.sessionID}:${input.callID}`, result.text);
      if (result.kind === 'deny') throw new Error(result.message);
    },

    'tool.execute.after': async (input, output) => {
      const key = `${input.sessionID}:${input.callID}`;
      const pending = pendingContext.get(key);
      pendingContext.delete(key);
      if (pending) clearTimeout(pending.timer);
      appendToolContext(output, pending && pending.text);
    }
  };
};
