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
 * CLI-eligible modes: big, long, whiteboard, poster
 * AI-only modes (not handled here): infograph, comic, sketchnote
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CAPTURE_SCRIPT = path.join(ROOT, 'assets', 'capture4k.js');
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

CLI-eligible modes: big, long, whiteboard, poster
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
    const chunks = [];
    fs.readFileSync('/dev/stdin').toString().split('\n').forEach(line => chunks.push(line));
    input = JSON.parse(chunks.join('\n'));
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
};

const renderer = renderers[input.mode];
if (!renderer) {
  console.error(`No CLI renderer for mode "${input.mode}". Use AI flow for: infograph, comic, sketchnote`);
  process.exit(1);
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

      const height = out.captureHeight;
      const fullpageFlag = out.fullpage ? 'fullpage' : '';
      const cmd = `node "${CAPTURE_SCRIPT}" "${out.htmlPath}" "${pngPath}" ${out.captureWidth} ${height} ${DPR} ${fullpageFlag}`;
      execSync(cmd, { stdio: 'pipe' });
      pngPaths.push(pngPath);
      console.error(`  Card ${i + 1}/${outputs.length}: ${pngPath}`);
    });

    console.log(pngPaths.join('\n'));
  } else {
    const htmlFileName = `card_${input.mode}_${ts}.html`;
    const htmlPath = path.join(TMP_DIR, htmlFileName);
    const out = renderer.render(input, htmlPath);

    const fullpageFlag = out.fullpage ? 'fullpage' : '';
    const cmd = `node "${CAPTURE_SCRIPT}" "${out.htmlPath}" "${outputPath}" ${out.captureWidth} ${out.captureHeight} ${DPR} ${fullpageFlag}`;
    execSync(cmd, { stdio: 'pipe' });

    console.log(outputPath);
  }
} catch (e) {
  console.error(`Render failed: ${e.message}`);
  if (e.stderr) console.error(e.stderr.toString());
  process.exit(1);
}
