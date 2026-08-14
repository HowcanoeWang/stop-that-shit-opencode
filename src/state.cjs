'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { defaultContract } = require('./contracts.cjs');

function dataRoot(override) {
  return override || process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'stop-that-shit-dev');
}

function sessionKey(sessionId) {
  return crypto.createHash('sha256').update(String(sessionId || 'unknown')).digest('hex').slice(0, 24);
}

function statePath(sessionId, override) {
  return path.join(dataRoot(override), 'sessions', `${sessionKey(sessionId)}.json`);
}

function freshState() {
  return {
    schemaVersion: 1,
    contract: defaultContract(),
    lastPromptContext: null
  };
}

function readState(sessionId, override) {
  const file = statePath(sessionId, override);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ...freshState(),
      ...parsed,
      contract: { ...defaultContract(), ...(parsed.contract || {}) }
    };
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.name === 'SyntaxError')) return freshState();
    throw error;
  }
}

function writeState(sessionId, state, override) {
  const file = statePath(sessionId, override);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    fs.renameSync(temporary, file);
  } catch (error) {
    if (process.platform !== 'win32') throw error;
    fs.copyFileSync(temporary, file);
    fs.unlinkSync(temporary);
  }
}

module.exports = {
  dataRoot,
  freshState,
  readState,
  sessionKey,
  statePath,
  writeState
};
