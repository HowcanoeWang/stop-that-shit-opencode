#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const target = path.join(distRoot, 'stop-that-shit-0.0.1');
const releaseManifest = JSON.parse(fs.readFileSync(path.join(root, 'release-files.json'), 'utf8'));

if (path.dirname(target) !== distRoot || !target.startsWith(`${distRoot}${path.sep}`)) {
  throw new Error(`refusing unsafe release target: ${target}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

for (const entry of releaseManifest.include) {
  const source = path.resolve(root, entry);
  if (source !== root && !source.startsWith(`${root}${path.sep}`)) {
    throw new Error(`release entry escapes repository: ${entry}`);
  }
  fs.cpSync(source, path.join(target, entry), { recursive: true });
}

process.stdout.write(`${target}\n`);
