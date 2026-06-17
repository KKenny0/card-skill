#!/usr/bin/env node
/**
 * card CLI — Structured rendering pipeline.
 * Accepts a JSON input file or stdin, validates against mode schema,
 * fills the corresponding template, and captures PNG via Playwright.
 *
 * Usage:
 *   node scripts/card.js --input card_input.json --output ~/Downloads/out.png
 *   echo '{"mode":"big","phrase":"hello"}' | node scripts/card.js --stdin --output ~/Downloads/out.png
 *   node scripts/card.js --list-designs
 *
 * CLI-eligible modes: big, long, whiteboard, poster, editorial-image
 * AI-only modes (not handled here): infograph, comic, sketchnote
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CAPTURE_SCRIPT = path.join(ROOT, 'assets', 'capture4k.js');
const CHECK_SCRIPT = path.join(ROOT, 'scripts', 'check-output.mjs');
const TMP_DIR = os.tmpdir();

// ── Args ──

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
card CLI — Structured rendering pipeline

Usage:
  node scripts/card.js --input <json> --output <png>
  echo '<json>' | node scripts/card.js --stdin --output <png>
  node scripts/card.js --list-designs

Options:
  --input <path>     Read JSON input from file
  --stdin            Read JSON input from stdin
  --output <path>    Output PNG path (default: ~/Downloads/card_{mode}_{ts}.png)
  --dpr <number>     Device pixel ratio (default: 2)
  --list-designs     List all available design systems
  --help             Show this help

CLI-eligible modes: big, long, whiteboard, poster, editorial-image
AI-only modes: infograph, comic, sketchnote
`);
  process.exit(0);
}

// ── List designs ──

if (args.includes('--list-designs')) {
  const { listDesigns } = require('./lib/designs');
  const designs = listDesigns();
  console.log('Available design systems:\n');
  for (const d of designs) {
    console.log(`  ${d.name.padEnd(15)} surface: ${d.surface.padEnd(5)}  accent: ${d.accent}  canvas: ${d.canvas}`);
  }
  console.log(`\nTotal: ${designs.length} design systems`);
  process.exit(0);
}

// ── Read input ──

let input;
const inputFile = getArg('--input');
const useStdin = args.includes('--stdin');

if (inputFile) {
  try {
    input = JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf-8'));
  } catch (e) {
    console.error(`Error reading input file: ${e.message}`);
    process.exit(1);
  }
} else if (useStdin) {
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch (e) {
    console.error(`Error reading stdin: ${e.message}`);
    process.exit(1);
  }
} else {
  console.error('Error: provide --input <file> or --stdin');
  process.exit(1);
}

// ── Validate ──

const { validate } = require('./lib/schema');
const result = validate(input);

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// ── Render ──

const DPR = parseFloat(getArg('--dpr')) || 2;
const outputArg = getArg('--output');
const ts = Date.now();
const defaultOutputName = `card_${input.mode}_${ts}.png`;
const outputPath = outputArg
  ? path.resolve(outputArg)
  : path.join(require('os').homedir(), 'Downloads', defaultOutputName);

const renderers = {
  big: require('./renderers/big'),
  long: require('./renderers/long'),
  whiteboard: require('./renderers/whiteboard'),
  poster: require('./renderers/poster'),
  'editorial-image': require('./renderers/editorial-image'),
};

const renderer = renderers[input.mode];
if (!renderer) {
  console.error(`No CLI renderer for mode "${input.mode}". Use AI flow for: infograph, comic, sketchnote`);
  process.exit(1);
}

function runCapture(out, pngPath) {
  const args = [
    CAPTURE_SCRIPT,
    out.htmlPath,
    pngPath,
    String(out.captureWidth),
    String(out.captureHeight),
    String(DPR),
  ];
  if (out.fullpage) args.push('fullpage');
  execFileSync(process.execPath, args, { stdio: 'pipe' });
}

function runOutputCheck(out, pngPath, options = {}) {
  const args = [
    CHECK_SCRIPT,
    '--html', out.htmlPath,
    '--width', String(out.captureWidth),
    '--height', String(out.captureHeight),
    '--dpr', String(DPR),
    '--json',
  ];

  if (out.fullpage) args.push('--fullpage');
  if (options.fix) args.push('--fix');
  if (options.skipPng) {
    args.push('--skip-png');
  } else {
    args.push('--png', pngPath);
  }

  const result = spawnSync(process.execPath, args, { encoding: 'utf-8' });
  let report = null;
  try {
    report = result.stdout ? JSON.parse(result.stdout) : null;
  } catch {
    // Keep the original output in the error below.
  }

  if (result.status !== 0 || !report || !report.pass) {
    const details = report?.issues?.map(item => `  - ${item.code}: ${item.message}`).join('\n')
      || result.stderr
      || result.stdout
      || 'unknown output-check failure';
    throw new Error(`Output check failed:\n${details}`);
  }

  return report;
}

function captureWithOutputCheck(out, pngPath) {
  runOutputCheck(out, pngPath, { fix: true, skipPng: true });
  runCapture(out, pngPath);

  const report = runOutputCheck(out, pngPath, { fix: true });
  if (report.fixed) {
    runCapture(out, pngPath);
    runOutputCheck(out, pngPath);
  }
}

try {
  // poster mode returns array; others return single object
  if (input.mode === 'poster') {
    const outputs = renderer.render(input, TMP_DIR);
    const pngPaths = [];

    outputs.forEach((out, i) => {
      const pngName = outputs.length === 1
        ? path.basename(outputPath)
        : path.basename(outputPath, '.png') + `_${i + 1}.png`;
      const pngPath = outputs.length === 1
        ? outputPath
        : path.join(path.dirname(outputPath), pngName);

      captureWithOutputCheck(out, pngPath);
      pngPaths.push(pngPath);
      console.error(`  Card ${i + 1}/${outputs.length}: ${pngPath}`);
    });

    console.log(pngPaths.join('\n'));
  } else {
    const htmlFileName = `card_${input.mode}_${ts}.html`;
    const htmlPath = path.join(TMP_DIR, htmlFileName);
    const out = renderer.render(input, htmlPath);

    captureWithOutputCheck(out, outputPath);

    console.log(outputPath);
  }
} catch (e) {
  console.error(`Render failed: ${e.message}`);
  if (e.stderr) console.error(e.stderr.toString());
  process.exit(1);
}
