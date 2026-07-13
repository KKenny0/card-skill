#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

function runtimeStatus() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    return { ready: false, reason: 'Playwright package is not installed.' };
  }

  const executable = playwright.chromium.executablePath();
  if (!executable || !fs.existsSync(executable)) {
    return { ready: false, reason: 'Playwright Chromium is not installed.' };
  }
  return { ready: true, executable };
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} exited with status ${result.status}`);
  }
}

function resolveNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

let status = runtimeStatus();
if (status.ready) {
  console.log('card-skill runtime is ready.');
  process.exit(0);
}

if (CHECK_ONLY) {
  console.error(`${status.reason} Run: node scripts/setup-runtime.mjs`);
  process.exit(1);
}

console.log(`${status.reason} Preparing card-skill runtime...`);

try {
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'playwright'))) {
    const npmCli = resolveNpmCli();
    if (!npmCli) throw new Error('npm CLI was not found next to Node.js. Install Node.js with npm and retry.');
    run(process.execPath, [npmCli, 'install', '--no-audit', '--no-fund']);
  }

  status = runtimeStatus();
  if (!status.ready) {
    const playwrightCli = require.resolve('playwright/cli');
    run(process.execPath, [playwrightCli, 'install', 'chromium']);
  }

  status = runtimeStatus();
  if (!status.ready) throw new Error(status.reason);
  console.log('card-skill runtime is ready.');
} catch (error) {
  console.error(`card-skill runtime setup failed: ${error.message}`);
  process.exit(1);
}
