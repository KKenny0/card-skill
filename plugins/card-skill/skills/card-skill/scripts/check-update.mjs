#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CURRENT_VERSION_PATH = path.join(ROOT, 'VERSION');
const DEFAULT_VERSION_URL = 'https://raw.githubusercontent.com/KKenny0/card-skill/main/VERSION';
const DISABLE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function parseVersion(value) {
  const match = normalizeVersion(value).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return match.slice(1, 4).map(Number);
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }
  return 0;
}

function defaultCachePath() {
  const cacheRoot = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cacheRoot, 'card-skill', 'update-check.json');
}

function shouldSkipForToday(cachePath) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return cached?.date === today;
  } catch {
    return false;
  }
}

function markCheckedToday(cachePath) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ date: today }, null, 2));
  } catch {
    // Update checks should never interrupt card rendering.
  }
}

async function fetchLatestVersion(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return null;
  return normalizeVersion(await response.text());
}

async function main() {
  try {
    if (DISABLE_VALUES.has(String(process.env.CARD_SKILL_DISABLE_UPDATE_CHECK || '').toLowerCase())) return;

    const currentVersion = normalizeVersion(fs.readFileSync(CURRENT_VERSION_PATH, 'utf8'));
    const versionUrl = process.env.CARD_SKILL_UPDATE_CHECK_URL || DEFAULT_VERSION_URL;
    const cachePath = process.env.CARD_SKILL_UPDATE_CHECK_CACHE || defaultCachePath();

    if (!currentVersion || shouldSkipForToday(cachePath)) return;
    markCheckedToday(cachePath);

    const latestVersion = await fetchLatestVersion(versionUrl);
    if (!latestVersion) return;

    if (compareVersions(latestVersion, currentVersion) > 0) {
      console.log(`card-skill v${latestVersion} is available (you have v${currentVersion}). Update: npx skills update card-skill -g -y`);
    }
  } catch {
    // Network, filesystem, or malformed-version failures are intentionally silent.
  }
}

await main();
