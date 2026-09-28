/**
 * Single launcher for post-render auto-updates.
 *
 * card.js (skill entry) and render-job.mjs (orchestrator) intentionally keep
 * different update wirings — the entry nudges the update check on every run
 * so direct CLI use stays covered, while the orchestrator disables per-child
 * checks and launches one post-job update. What they share is this launcher:
 * one spawn shape, one gate. The gate runs before the spawn (a disabled
 * auto-update must not cost a process) and accepts the same truthy values as
 * scripts/check-update.mjs.
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DISABLE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function autoUpdateDisabled() {
  return DISABLE_VALUES.has(String(process.env.CARD_SKILL_DISABLE_AUTO_UPDATE || '').trim().toLowerCase());
}

/**
 * Launch the auto-update. Detached mode (the default) never blocks the
 * caller and returns ''. Foreground mode runs synchronously and returns the
 * combined stdout/stderr for the caller to surface (or '' when empty).
 */
function launchAutoUpdate({ foreground = false } = {}) {
  if (autoUpdateDisabled()) return '';
  const args = [path.join(ROOT, 'scripts', 'check-update.mjs'), '--auto-update'];
  if (foreground) {
    const result = spawnSync(process.execPath, args, {
      encoding: 'utf-8',
      timeout: 15 * 60 * 1000,
    });
    return [result.stdout, result.stderr]
      .filter(value => value?.trim())
      .join('\n')
      .trim();
  }
  try {
    const child = spawn(process.execPath, args, {
      cwd: os.homedir(),
      detached: true,
      env: { ...process.env, CARD_SKILL_CALLER_CWD: process.cwd() },
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Rendering/publication is already complete; a later request can retry.
  }
  return '';
}

module.exports = { launchAutoUpdate };
