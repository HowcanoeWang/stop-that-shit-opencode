'use strict';

const { parseContractPrompt } = require('./contracts.cjs');
const { assertControlEvent } = require('./control-protocol.cjs');
const { decide } = require('./decision.cjs');
const { readState, writeState } = require('./state.cjs');

function none() {
  return { kind: 'none' };
}

function context(text) {
  return { kind: 'context', text };
}

function contractContext(contract, phase = 'active') {
  if (contract.level === 'off') {
    return 'Stop That Shit is disabled for this session. No plugin decision is being enforced.';
  }
  if (contract.mode === 'unconfirmed') {
    return [
      'Stop That Shit is in watch-only mode because no task mode is confirmed.',
      'Use $stop-that-shit review for read-only work, or change for implementation. The default fast path relies on the Stop Ladder and does not claim a full machine contract.',
      'Do not claim that mutations are being blocked until a mode is confirmed.'
    ].join(' ');
  }

  return [
    `Stop That Shit (${phase}): mode=${contract.mode}; agents=${contract.agentsUsed}/${contract.agentBudget}; hash=${contract.hashPolicy || 'deny'}; deps=${contract.dependencyPolicy || 'ask'}; files=${Array.isArray(contract.allowedPaths) ? contract.allowedPaths.join('|') : 'unbounded'}.`,
    'Stop Ladder: Is it requested? Is it necessary? What reachable evidence proves that? Would omission fail the current acceptance?',
    'Report real findings even when implementation is not authorized.',
    'Before expanding scope, name reachable evidence, failure if omitted, and the fact that changes the next action.',
    'Harness interception coverage is a guardrail, not a security boundary.'
  ].join(' ');
}

function decisionMessage(result) {
  return `Stop That Shit [${result.family}/${result.reasonCode}]: ${result.explanation} ${result.nextStep}`;
}

function handlePrompt(event, options) {
  const state = readState(event.sessionId, options.dataDir);
  const parsed = parseContractPrompt(event.prompt, state.contract);
  state.contract = parsed.contract;
  writeState(event.sessionId, state, options.dataDir);
  return context(contractContext(state.contract));
}

function handleBeforeAction(event, options) {
  const state = readState(event.sessionId, options.dataDir);
  const action = {
    mutability: event.action.mutability,
    hashIntent: Boolean(event.action.hashIntent),
    reachability: event.action.reachability,
    authorization: event.action.authorization,
    affectedPaths: event.action.affectedPaths,
    dependencyIntent: Boolean(event.action.dependencyIntent)
  };
  const result = decide({ contract: state.contract, action, state });

  if (event.action.mutability === 'delegate' && result.outcome === 'allow') {
    state.contract.agentsUsed += 1;
    writeState(event.sessionId, state, options.dataDir);
  }

  if (result.outcome === 'deny_and_explain' || result.outcome === 'require_user_approval') {
    return { kind: 'deny', decision: result, message: decisionMessage(result) };
  }
  if (result.outcome === 'report_and_defer') {
    return context(decisionMessage(result));
  }
  return none();
}

function handleLifecycleContext(event, options) {
  const state = readState(event.sessionId, options.dataDir);
  return context(contractContext(state.contract));
}

function handleControlEvent(rawEvent, options = {}) {
  const event = assertControlEvent(rawEvent);
  switch (event.kind) {
    case 'prompt.submit':
      return handlePrompt(event, options);
    case 'action.before':
      return handleBeforeAction(event, options);
    case 'session.start':
    case 'subagent.start':
      return handleLifecycleContext(event, options);
    default:
      return none();
  }
}

module.exports = { contractContext, handleControlEvent };
