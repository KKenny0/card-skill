#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { cardCli, renderJob, isolatedEnv } = require('./lib/test-kit');
const { validate } = require('./lib/schema');
const { validateVisualJob, sha256Bytes } = require('./lib/visual-job');
const { candidateDirectorySha256 } = require('./lib/candidate-snapshot');
const { PAGE_DECISION_CHECKS } = require('./lib/output-checks');
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-cover-test-'));
const started = performance.now();
const base = { mode: 'editorial-image', aspect: 'cinematic', title: 'Shared language' };
const writeJson = (name, value) => { const file = path.join(tmpDir, name); fs.writeFileSync(file, JSON.stringify(value)); return file; };
function publish(candidate, name) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts/publish-reviewed-job.mjs'), '--candidate-dir', candidate,
    '--output-dir', path.join(tmpDir, name), '--expected-candidate-sha256', candidateDirectorySha256(candidate), '--json'], { encoding: 'utf8', env: isolatedEnv() });
}
try {
  cardCli({ tmpDir, name: 'long-brand', input: {
    mode: 'editorial-image', aspect: 'cinematic', title: 'A2A',
    cover_motif: 'path', brand_name: 'Editorial series author',
  } });
  const emitted = [];
  PAGE_DECISION_CHECKS.find(check => check.code === 'body_text_too_small').decide({ textSizes: [
    { tag: 'P', className: '', text: 'Ordinary long body text', fontSize: 24 },
  ] }, {}, '', (...args) => emitted.push(args));
  assert.equal(emitted.length, 1, 'ordinary small body text must still fail');

  const browser = await chromium.launch({ headless: true });
  const assets = {};
  try {
    const page = await browser.newPage({ viewport: { width: 520, height: 320 } });
    await page.setContent('<style>body{margin:0}</style><svg width="520" height="320" viewBox="0 0 520 320"><g fill="#f6f3ec" stroke="#26251e" stroke-width="4"><path d="M35 120L110 80L185 120V235L110 275L35 235Z"/><path d="M335 120L410 80L485 120V235L410 275L335 235Z"/></g><path d="M145 172Q260 35 375 172" fill="none" stroke="#a55332" stroke-width="12"/></svg>');
    for (const type of ['png', 'jpeg']) {
      assets[type] = path.join(tmpDir, `concept.${type}`);
      await page.screenshot({ path: assets[type], type, omitBackground: type === 'png' });
    }
    assets.webp = path.join(tmpDir, 'concept.webp');
    const png = fs.readFileSync(assets.png).toString('base64');
    const webp = await page.evaluate(async data => {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0); return canvas.toDataURL('image/webp').split(',')[1];
    }, png);
    fs.writeFileSync(assets.webp, Buffer.from(webp, 'base64'));
  } finally { await browser.close(); }

  const art = { path: assets.png, alt: 'Two objects connected by a bridge' };
  const input = { ...base, cover_art: art };
  assert.equal(validate(input).valid, true);
  const invalid = [
    { cover_art: null }, { cover_art: [] }, { cover_art: { ...art, alt: '' } },
    { cover_art: { ...art, alt: 'a'.repeat(501) } }, { cover_art: { ...art, fit: 'cover' } },
    ...['relative.png', '//server/share/a.png', '//?/C:/a.png', 'https://example.com/a.png', 'data:image/png;base64,AA==', path.join(tmpDir, 'missing.png'), tmpDir].map(p => ({ cover_art: { ...art, path: p } })),
    { cover_motif: '' }, { content_html: '' }, { composition_required: true },
    { use: 'metaphor' }, { aspect: 'square' }, { custom_css: '@import "https://example.com/x.css";' },
  ];
  for (const change of invalid) assert.equal(validate({ ...input, ...change }).valid, false, JSON.stringify(change));
  const malformed = path.join(tmpDir, 'bad.png'); fs.writeFileSync(malformed, 'not an image');
  assert.equal(validate({ ...input, cover_art: { ...art, path: malformed } }).valid, false);
  const huge = Buffer.from(fs.readFileSync(assets.png)); huge.writeUInt32BE(8193, 16); fs.writeFileSync(malformed, huge);
  assert.equal(validate({ ...input, cover_art: { ...art, path: malformed } }).valid, false);

  for (const [index, aspect] of ['cinematic', 'wechat-cover', 'blog-hero'].entries()) {
    const mediaPath = assets[['png', 'jpeg', 'webp'][index]];
    const name = `art-${aspect}`;
    const reportPath = path.join(tmpDir, `${name}.report.json`);
    cardCli({ tmpDir, name, input: { ...input, aspect, cover_art: { ...art, path: mediaPath }, ...(index === 0 ? { brand_name: 'Editorial series author', logo: assets.png } : {}) },
      extraArgs: ['--report', reportPath, '--checked-html-dir', tmpDir] });
    const html = fs.readFileSync(path.join(tmpDir, `${name}.checked.html`), 'utf8');
    assert.match(html, /class="editorial-cover-art" src="data:image\//);
    assert.ok(!html.includes(mediaPath), 'checked HTML still depends on the source image');
    const report = JSON.parse(fs.readFileSync(reportPath));
    assert.equal(report.artifacts[0].cover_art_snapshot.sha256, sha256Bytes(fs.readFileSync(mediaPath)));
    assert.equal(report.artifacts[0].effective_contract.cover_art.path, mediaPath);
  }
  for (const mode of ['editorial-image', 'article-diagram']) {
    const renderer = require(`./renderers/${mode}`);
    const contract = mode === 'editorial-image' ? base : { mode, formula: 'A + B = C', sentence: 'Parts combine.' };
    for (const logo of [undefined, assets.png]) {
      const htmlPath = path.join(tmpDir, `${mode}-${Boolean(logo)}.html`);
      renderer.render({ ...contract, ...(logo ? { logo } : {}) }, htmlPath);
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert.doesNotMatch(html, /<span class="brand-name"><\/span>/);
      if (!logo) assert.doesNotMatch(html, /<div class="colophon">/);
    }
  }
  const styleBrowser = await chromium.launch({ headless: true });
  try {
    const page = await styleBrowser.newPage();
    await page.goto(pathToFileURL(path.join(tmpDir, 'art-cinematic.checked.html')).href);
    assert.equal(await page.locator('.editorial-visual').evaluate(el => getComputedStyle(el).filter), 'none', 'cover art must not inherit motif desaturation');
    await page.goto(pathToFileURL(path.join(tmpDir, 'editorial-image-false.html')).href);
    assert.equal(await page.locator('.editorial-visual').evaluate(el => getComputedStyle(el).filter), 'saturate(0.92)', 'legacy motifs should keep their existing styling');
  } finally { await styleBrowser.close(); }

  const job = {
    schema_version: 3, job_id: 'cover-art-test', publish_target: 'blog-hero',
    source: { kind: 'pasted-text', language: 'en' },
    source_units: [{ id: 'claim', excerpt: 'A shared language connects separate systems.', evidence: { kind: 'claim', strength: 'primary', freshness: 'current' } }],
    decision: { mode: 'editorial-image', tier: 'stable', selection_source: 'taxonomy', reason: 'A conceptual article cover.' },
    outputs: [{ id: 'cover', render_contract: input, artifacts: [{ artifact_index: 1, id: 'cover', basename: 'cover.png', role: 'claim', source_unit_ids: ['claim'], transformation: 'compress',
      visual_plan: { core_message: 'A shared language connects separate systems.', content_type: 'idea', argument_structure: 'single-claim', visual_metaphor: 'A bridge between two objects', layout_strategy: 'Copy beside a bridge', visual_hierarchy: ['title', 'bridge'], avoid_patterns: ['glowing networks'] } }] }],
  };
  const checked = validateVisualJob(job); assert.equal(checked.valid, true, checked.errors.join('\n'));
  const largeArt = Buffer.from(fs.readFileSync(assets.png));
  largeArt.writeUInt32BE(6000, 16); largeArt.writeUInt32BE(4000, 20);
  const largePath = path.join(tmpDir, 'large-metadata.png'); fs.writeFileSync(largePath, largeArt);
  const secondPath = path.join(tmpDir, 'different-large-metadata.png');
  fs.writeFileSync(secondPath, Buffer.concat([largeArt, Buffer.from('distinct')]));
  const budgetJob = structuredClone(job);
  budgetJob.outputs[0].render_contract.cover_art.path = largePath;
  budgetJob.source_units.push({ id: 'other', excerpt: 'A bridge permits a handoff.', evidence: { kind: 'claim', strength: 'primary', freshness: 'current' } });
  const second = structuredClone(budgetJob.outputs[0]); second.id = 'second';
  second.artifacts[0] = { ...second.artifacts[0], id: 'second', basename: 'second.png', source_unit_ids: ['other'] };
  budgetJob.outputs.push(second);
  assert.doesNotMatch(validateVisualJob(budgetJob).errors.join('\n'), /aggregate budget/, 'identical art should be charged once');
  second.render_contract.cover_art.path = secondPath;
  assert.match(validateVisualJob(budgetJob).errors.join('\n'), /aggregate budget/);
  assert.match(validateVisualJob({ ...job, schema_version: 2 }).errors.join('\n'), /cover_art requires Visual Job v3/);
  const candidate = path.join(tmpDir, 'candidate');
  const rendered = renderJob({ inputPath: writeJson('job.json', job), outputDir: candidate });
  assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
  const receiptPath = path.join(candidate, 'cover.receipt.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath));
  assert.equal(receipt.media_snapshots.length, 0, 'conceptual art must not claim to be source evidence');
  assert.equal(receipt.cover_art_snapshot.sha256, sha256Bytes(fs.readFileSync(assets.png)));
  // Synthetic protocol fixture only: this is not a host aesthetic review.
  const review = { schema_version: 1, job_id: job.job_id, output_id: 'cover', artifact_index: 1, attempt: 0,
    ...Object.fromEntries(['visual_job_sha256', 'artifact_plan_sha256', 'artifact_contract_sha256', 'render_contract_sha256'].map(k => [k, receipt[k]])),
    png_sha256: receipt.png.sha256, checker_pass: true, metaphor_required: true,
    scores: { message_clarity: 4, visual_hierarchy: 4, cognitive_load: 4, style_consistency: 4, metaphor_quality: 4 }, overall_score: 8, issues: [], verdict: 'pass' };
  fs.writeFileSync(path.join(candidate, 'cover.review.json'), JSON.stringify(review));
  for (const [name, mutate] of [
    ['missing', r => { delete r.cover_art_snapshot; }],
    ['digest', r => { r.cover_art_snapshot.sha256 = 'a'.repeat(64); }],
    ['metadata', r => { r.cover_art_snapshot.width += 1; }],
  ]) {
    const bad = path.join(tmpDir, name); fs.cpSync(candidate, bad, { recursive: true });
    const changed = structuredClone(receipt); mutate(changed);
    fs.writeFileSync(path.join(bad, 'cover.receipt.json'), JSON.stringify(changed));
    const manifestPath = path.join(bad, 'candidate-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    manifest.artifacts[0].receipt_sha256 = sha256Bytes(fs.readFileSync(path.join(bad, 'cover.receipt.json')));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const rejected = publish(bad, `${name}-published`);
    assert.notEqual(rejected.status, 0, name);
    assert.match(rejected.stderr, /cover art snapshot/, rejected.stderr);
  }
  fs.writeFileSync(assets.png, 'source changed after snapshot');
  const published = publish(candidate, 'published');
  assert.equal(published.status, 0, published.stderr || published.stdout);
  console.log(`Editorial cover checks passed (${((performance.now() - started) / 1000).toFixed(1)}s)`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
