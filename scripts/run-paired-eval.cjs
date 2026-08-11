#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  buildCodexArgs,
  buildPlan,
  assertIsolatedPluginList,
  countHookBlocks,
  evaluateAcceptance,
  materializeFixture
} = require('./paired-eval-lib.cjs');

const root = path.resolve(__dirname, '..');
const evalRoot = path.join(root, 'evals', 'codex-paired');

function parseArgs(argv) {
  const options = {
    dryRun: true,
    runs: 3,
    cases: [],
    arms: [],
    model: null,
    timeoutMs: 600_000,
    codexHome: process.env.STS_EVAL_CODEX_HOME || null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--run') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--runs') options.runs = Number(argv[++index]);
    else if (arg === '--case') options.cases.push(argv[++index]);
    else if (arg === '--arm') options.arms.push(argv[++index]);
    else if (arg === '--model') options.model = argv[++index];
    else if (arg === '--codex-home') options.codexHome = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error('timeout-ms must be a positive integer');
  }
  return options;
}

function usage() {
  return [
    'Usage: node scripts/run-paired-eval.cjs [--dry-run] [--run] [options]',
    '',
    'The default is --dry-run. --run starts paid Codex sessions.',
    '',
    'Options:',
    '  --runs <n>       Repetitions per case and arm (default: 3)',
    '  --case <id>      Select a family or full case id; repeatable',
    '  --arm <id>       Select baseline, instruction, or plugin; repeatable',
    '  --model <id>     Override the configured Codex model',
    '  --codex-home <p> Dedicated authenticated Codex home with only this plugin enabled',
    '  --timeout-ms <n> Timeout for each Codex session'
  ].join('\n');
}

function filterPlan(plan, options) {
  const cells = plan.cells.filter((cell) => {
    const caseMatch = options.cases.length === 0
      || options.cases.includes(cell.family)
      || options.cases.includes(cell.caseId);
    const armMatch = options.arms.length === 0 || options.arms.includes(cell.arm);
    return caseMatch && armMatch;
  });
  if (cells.length === 0) throw new Error('the selected matrix is empty');
  const caseIds = new Set(cells.map((cell) => cell.caseId));
  const armIds = new Set(cells.map((cell) => cell.arm));
  return {
    ...plan,
    arms: plan.arms.filter((arm) => armIds.has(arm.id)),
    cases: plan.cases.filter((testCase) => caseIds.has(testCase.id)),
    cells
  };
}

function findCodexBinary() {
  if (process.env.STS_CODEX_BIN) return process.env.STS_CODEX_BIN;
  const lookup = process.platform === 'win32'
    ? spawnSync('where.exe', ['codex'], { encoding: 'utf8' })
    : spawnSync('which', ['codex'], { encoding: 'utf8' });
  if (lookup.status !== 0) throw new Error('codex CLI was not found on PATH');
  const candidates = lookup.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (process.platform === 'win32') {
    return candidates.find((value) => value.toLowerCase().endsWith('.exe'))
      || candidates.find((value) => !/\.(?:cmd|ps1)$/i.test(value));
  }
  return candidates[0];
}

function preflightEvalHome(binary, codexHome) {
  if (!codexHome) {
    throw new Error('--codex-home or STS_EVAL_CODEX_HOME is required with --run');
  }
  const resolved = path.resolve(codexHome);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`eval Codex home is not a directory: ${resolved}`);
  }
  const env = { ...process.env, CODEX_HOME: resolved };
  const login = spawnSync(binary, ['login', 'status'], { encoding: 'utf8', env });
  if (login.status !== 0) {
    throw new Error('the isolated eval Codex home is not authenticated');
  }
  const plugins = spawnSync(binary, ['plugin', 'list'], { encoding: 'utf8', env });
  if (plugins.status !== 0) {
    throw new Error(plugins.stderr || 'could not list plugins in the isolated eval Codex home');
  }
  assertIsolatedPluginList(plugins.stdout);
  return { codexHome: resolved, env };
}

function finalResponse(eventsText) {
  let response = '';
  for (const line of eventsText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item && event.item.type === 'agent_message') {
        response = event.item.text || response;
      }
    } catch {}
  }
  return response;
}

function runCell(binary, cell, options, evalProfile) {
  const workspace = path.join(evalRoot, cell.workspace);
  materializeFixture(cell.fixture, workspace);
  const outputDirectory = path.dirname(workspace);
  const args = buildCodexArgs(cell, { model: options.model, workspace });
  const startedAt = Date.now();
  const execution = spawnSync(binary, args, {
    cwd: workspace,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    maxBuffer: 32 * 1024 * 1024,
    env: evalProfile.env
  });
  const durationMs = Date.now() - startedAt;
  const eventsText = execution.stdout || '';
  const diagnosticText = `${eventsText}\n${execution.stderr || ''}`;
  const responseText = finalResponse(eventsText);
  const acceptance = evaluateAcceptance({
    workspace,
    acceptance: cell.acceptance,
    responseText,
    eventsText
  });
  const result = {
    schemaVersion: 1,
    id: cell.id,
    caseId: cell.caseId,
    family: cell.family,
    kind: cell.kind,
    arm: cell.arm,
    run: cell.run,
    prompt: cell.prompt,
    exitStatus: execution.status,
    signal: execution.signal,
    spawnError: execution.error ? execution.error.message : null,
    durationMs,
    hookBlockCount: countHookBlocks(diagnosticText),
    acceptance
  };
  fs.writeFileSync(path.join(outputDirectory, 'events.jsonl'), eventsText, 'utf8');
  fs.writeFileSync(
    path.join(outputDirectory, 'stderr.txt'),
    execution.stderr || (execution.error ? `${execution.error.stack || execution.error.message}\n` : ''),
    'utf8'
  );
  fs.writeFileSync(path.join(outputDirectory, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return result;
}

function summarize(results) {
  const groups = {};
  for (const result of results) {
    const key = `${result.arm}/${result.kind}`;
    groups[key] ||= { cells: 0, passed: 0, hookBlocks: 0, durationMs: 0 };
    groups[key].cells += 1;
    groups[key].passed += result.acceptance.pass ? 1 : 0;
    groups[key].hookBlocks += result.hookBlockCount;
    groups[key].durationMs += result.durationMs;
  }
  return { schemaVersion: 1, cells: results.length, passed: results.filter((result) => result.acceptance.pass).length, groups };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const plan = filterPlan(buildPlan({ runs: options.runs }), options);
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  const binary = findCodexBinary();
  const evalProfile = preflightEvalHome(binary, options.codexHome);
  const runRoot = path.join(evalRoot, 'runs', plan.stamp);
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(path.join(runRoot, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  const results = [];
  for (const cell of plan.cells) {
    process.stderr.write(`RUN ${cell.id}\n`);
    const result = runCell(binary, cell, options, evalProfile);
    results.push(result);
    process.stderr.write(`${result.acceptance.pass ? 'PASS' : 'FAIL'} ${cell.id}\n`);
  }
  const summary = summarize(results);
  fs.writeFileSync(path.join(runRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.passed !== summary.cells) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`paired eval failed: ${error.message}\n`);
  process.exitCode = 1;
}
