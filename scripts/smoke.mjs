#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const harnessDir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-skill-smoke-'));
const outputPath = path.join(harnessDir, 'smoke.png');

function activeRunDirs() {
  return new Set(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('card-skill-') && !name.startsWith('card-skill-smoke-')));
}

function readPngSize(pngPath) {
  const buffer = fs.readFileSync(pngPath);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Smoke output is not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const beforeRunDirs = activeRunDirs();

function runCard(input, output) {
  return spawnSync(process.execPath, [
    path.join(ROOT, 'scripts', 'card.js'),
    '--stdin',
    '--output', output,
  ], {
    cwd: ROOT,
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
}

try {
  const result = runCard({ mode: 'big', phrase: 'Runtime smoke', design: 'apple' }, outputPath);

  assert.equal(result.status, 0, result.stderr || result.stdout || 'card CLI failed');
  assert.equal(result.stdout.trim(), outputPath, 'CLI stdout did not contain only the output path');
  assert.equal(result.stderr, '', 'Single-card success wrote unexpected stderr output');
  assert.deepEqual(readPngSize(outputPath), { width: 2160, height: 2880 });

  const posterCard = text => ({ body: [{ type: 'paragraph', text }] });
  const overflowBase = path.join(harnessDir, 'overflow.png');
  const overflow = runCard({
    mode: 'poster',
    title: 'Transaction smoke',
    cards: [posterCard('first'), posterCard('x '.repeat(20000))],
  }, overflowBase);
  assert.notEqual(overflow.status, 0, 'Expected the second poster card to fail its output check');
  assert.equal(fs.existsSync(path.join(harnessDir, 'overflow_1.png')), false, 'Poster failure leaked the first PNG');
  assert.equal(fs.existsSync(path.join(harnessDir, 'overflow_2.png')), false, 'Poster failure leaked the second PNG');

  const publishBase = path.join(harnessDir, 'publish.png');
  const firstFinal = path.join(harnessDir, 'publish_1.png');
  const secondFinal = path.join(harnessDir, 'publish_2.png');
  fs.writeFileSync(firstFinal, 'original');
  fs.mkdirSync(secondFinal);
  const publish = runCard({
    mode: 'poster',
    title: 'Rollback smoke',
    cards: [posterCard('first'), posterCard('second')],
  }, publishBase);
  assert.notEqual(publish.status, 0, 'Expected an invalid second output path to fail publication');
  assert.equal(fs.readFileSync(firstFinal, 'utf8'), 'original', 'Poster rollback did not restore the first output');
  assert.deepEqual(
    fs.readdirSync(harnessDir).filter(name => name.endsWith('.tmp') || name.endsWith('.bak')),
    [],
    'Poster rollback left staging or backup files behind',
  );

  assert.deepEqual(activeRunDirs(), beforeRunDirs, 'card CLI left a temporary run directory behind');

  console.log('Runtime smoke passed: CLI, Chromium capture, PNG dimensions, stdout contract, poster transactions, and temp cleanup.');
} finally {
  fs.rmSync(harnessDir, { recursive: true, force: true });
}
