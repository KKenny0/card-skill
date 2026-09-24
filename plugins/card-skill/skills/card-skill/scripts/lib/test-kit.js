/**
 * Shared harness kit for driving the card-skill CLIs from test scripts.
 *
 * Consumers: scripts/validate.mjs (cardCli through its runCardCli wrapper)
 * and scripts/validate-visual-job.mjs (renderJob). Keeping the drivers here
 * gives one place for the subprocess contract (flags, cwd, assertions) and
 * one place for test isolation.
 *
 * Isolation contract: every CLI spawned through this kit runs with both
 * CARD_SKILL_DISABLE_UPDATE_CHECK and CARD_SKILL_DISABLE_AUTO_UPDATE set,
 * so test renders never pay the update nudge and can never kick a detached
 * self-update that mutates the working tree mid-suite.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..', '..');

function isolatedEnv() {
  return {
    ...process.env,
    CARD_SKILL_DISABLE_UPDATE_CHECK: '1',
    CARD_SKILL_DISABLE_AUTO_UPDATE: '1',
  };
}

function assertOutput(pngPath, name, index) {
  const label = index === 1 ? `${name}` : `${name} ${index}`;
  assert.ok(fs.existsSync(pngPath), `${label} CLI render did not create a PNG`);
  assert.ok(fs.statSync(pngPath).size > 1000, `${label} CLI render created an empty-looking PNG`);
}

/**
 * Render a card contract through scripts/card.js and assert the happy path:
 * exit 0, every expected PNG present and non-trivial, and stdout listing
 * exactly one path per artifact. Returns the output path (expectedCount 1)
 * or the array of output paths.
 */
function cardCli({ tmpDir, name, input, expectedCount = 1, extraArgs = [] }) {
  const inputPath = path.join(tmpDir, `${name}.json`);
  const outputPath = path.join(tmpDir, `${name}.png`);
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'scripts', 'card.js'),
    '--input', inputPath,
    '--output', outputPath,
    ...extraArgs,
  ], { encoding: 'utf8', env: isolatedEnv() });

  assert.equal(result.status, 0, `${name} CLI render failed:\n${result.stdout}\n${result.stderr}`);
  if (expectedCount === 1) {
    assertOutput(outputPath, name, 1);
    return outputPath;
  }

  const outputPaths = Array.from({ length: expectedCount }, (_, i) =>
    path.join(tmpDir, `${name}_${i + 1}.png`));
  outputPaths.forEach((pngPath, i) => assertOutput(pngPath, name, i + 1));
  assert.equal(result.stdout.trim().split(/\r?\n/).length, expectedCount, `${name} stdout did not list ${expectedCount} output paths`);
  return outputPaths;
}

/**
 * Run scripts/render-job.mjs and return the raw spawnSync result so callers
 * keep their own positive/negative assertions. Candidate JSON mode is the
 * default because every current harness use renders --candidate --json.
 */
function renderJob({ inputPath, outputDir, candidate = true, json = true }) {
  const args = [
    path.join(ROOT, 'scripts', 'render-job.mjs'),
    '--input', inputPath,
    '--output-dir', outputDir,
  ];
  if (candidate) args.push('--candidate');
  if (json) args.push('--json');
  return spawnSync(process.execPath, args, { encoding: 'utf8', env: isolatedEnv() });
}

module.exports = { cardCli, isolatedEnv, renderJob };
