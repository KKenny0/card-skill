#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const { validate } = require('./lib/schema');
const { listDesigns } = require('./lib/designs');

const renderers = {
  big: require('./renderers/big'),
  long: require('./renderers/long'),
  whiteboard: require('./renderers/whiteboard'),
  poster: require('./renderers/poster'),
  'editorial-image': require('./renderers/editorial-image'),
};

const inputs = {
  big: { mode: 'big', phrase: 'Make it clear' },
  long: { mode: 'long', title: 'Clarity', body: [{ type: 'paragraph', text: 'A useful paragraph.' }] },
  whiteboard: { mode: 'whiteboard', title: 'A model', steps: [{ type: 'annotation', text: 'Start here.' }] },
  poster: { mode: 'poster', title: 'A short series', cards: [{ body: [{ type: 'paragraph', text: 'One idea.' }] }] },
  'editorial-image': { mode: 'editorial-image', title: 'A visual argument' },
};

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function readOutputs(result) {
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.map(output => stripComments(fs.readFileSync(output.htmlPath, 'utf8')));
}

function assertUnbranded(html, mode) {
  assert.doesNotMatch(html, /class="colophon"/, `${mode} rendered an empty colophon`);
  assert.doesNotMatch(html, /assets\/logo\.png/, `${mode} injected the bundled logo by default`);
  assert.doesNotMatch(html, />\s*card\s*</i, `${mode} injected the card brand by default`);
  assert.doesNotMatch(html, /\{\{[^}]+\}\}/, `${mode} left an active placeholder`);
}

function runOutputCheck(htmlPath, output) {
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'scripts', 'check-output.mjs'),
    '--html', htmlPath,
    '--width', String(output.captureWidth),
    '--height', String(output.captureHeight),
    '--skip-png',
    '--json',
  ], { encoding: 'utf8' });

  let report = null;
  try {
    report = result.stdout ? JSON.parse(result.stdout) : null;
  } catch {
    // Preserve raw stdout/stderr in the assertion below.
  }

  return { result, report };
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-skill-validate-'));

try {
  for (const [mode, input] of Object.entries(inputs)) {
    const validation = validate(input);
    assert.equal(validation.valid, true, `${mode} smoke input failed schema validation: ${validation.errors.join(', ')}`);

    const target = mode === 'poster' ? tmpDir : path.join(tmpDir, `${mode}.html`);
    const rendered = renderers[mode].render(input, target);
    for (const html of readOutputs(rendered)) assertUnbranded(html, mode);
  }

  const logoPath = path.join(tmpDir, 'example " onerror="attack.png');
  const logoUrl = pathToFileURL(logoPath).href;
  for (const [mode, input] of Object.entries(inputs)) {
    const target = mode === 'poster' ? tmpDir : path.join(tmpDir, `branded-${mode}.html`);
    const rendered = renderers[mode].render({
      ...input,
      brand_name: 'Example Studio',
      logo: logoPath,
      ...(mode === 'editorial-image' ? { source: 'Example source' } : {}),
    }, target);

    for (const html of readOutputs(rendered)) {
      assert.match(html, /class="colophon"/, `${mode} dropped opt-in branding`);
      assert.match(html, />Example Studio</, `${mode} dropped the brand name`);
      assert.ok(html.includes(logoUrl), `${mode} did not encode the logo as a file URL`);
      assert.doesNotMatch(html, /"\s+onerror=/i, `${mode} allowed logo-path attribute injection`);
      if (mode === 'editorial-image') assert.match(html, />Example source</, 'editorial-image dropped the source');
    }
  }

  const sourceOnlyPath = path.join(tmpDir, 'source-only-editorial.html');
  renderers['editorial-image'].render({ ...inputs['editorial-image'], source: 'Source only' }, sourceOnlyPath);
  const sourceOnlyHtml = stripComments(fs.readFileSync(sourceOnlyPath, 'utf8'));
  assert.match(sourceOnlyHtml, /class="colophon"/);
  assert.match(sourceOnlyHtml, />Source only</);
  assert.doesNotMatch(sourceOnlyHtml, /class="who"/);

  const inArticleValidation = validate({
    mode: 'editorial-image',
    title: 'Attention has a boundary',
    use: 'in-article',
    aspect: 'body-3-2',
  });
  assert.equal(inArticleValidation.valid, true, `editorial-image in-article mapping failed: ${inArticleValidation.errors.join(', ')}`);

  const invalidUseValidation = validate({
    mode: 'editorial-image',
    title: 'Bad field mapping',
    use: 'body-3-2',
  });
  assert.equal(invalidUseValidation.valid, false, 'aspect value in use unexpectedly passed validation');
  assert.match(invalidUseValidation.errors.join('\n'), /use must be one of: cover, in-article, metaphor/);

  const authorAliasValidation = validate({ mode: 'big', phrase: 'No alias', author: 'Someone' });
  assert.equal(authorAliasValidation.valid, false, 'author alias unexpectedly passed validation');
  assert.match(authorAliasValidation.errors.join('\n'), /Use "brand_name"/);

  const photoAliasValidation = validate({ mode: 'big', phrase: 'No alias', photo: 'avatar.png' });
  assert.equal(photoAliasValidation.valid, false, 'photo alias unexpectedly passed validation');
  assert.match(photoAliasValidation.errors.join('\n'), /Use "logo"/);

  const customEditorialPath = path.join(tmpDir, 'custom-editorial.html');
  renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Attention has a boundary',
    use: 'in-article',
    aspect: 'body-3-2',
    visual_metaphor: 'A narrow beam illuminates the center of a paper workbench while outer pages fade away.',
    content_html: `
      <section class="attention-workbench">
        <div class="page-field">
          <div class="focus-beam"></div>
          <div class="center-note">ATTENTION</div>
          <div class="faded-sheet sheet-left"></div>
          <div class="faded-sheet sheet-right"></div>
        </div>
      </section>
    `,
    custom_css: `
      .attention-workbench { height: 100%; display: grid; place-items: center; }
      .page-field { position: relative; width: 70%; height: 70%; border: 1px solid var(--hairline); }
      .focus-beam { position: absolute; inset: 18% 36%; border-top: 3px solid var(--accent); }
      .center-note { position: absolute; left: 36%; top: 45%; font: 700 44px/1 var(--mono); color: var(--ink); }
      .faded-sheet { position: absolute; width: 28%; height: 42%; border: 1px solid var(--hairline); opacity: .35; }
      .sheet-left { left: 8%; top: 22%; transform: rotate(-7deg); }
      .sheet-right { right: 8%; top: 26%; transform: rotate(6deg); }
    `,
  }, customEditorialPath);
  const customEditorialHtml = stripComments(fs.readFileSync(customEditorialPath, 'utf8'));
  assert.match(customEditorialHtml, /attention-workbench/, 'custom editorial composition was not rendered');
  assert.match(customEditorialHtml, /focus-beam/, 'custom editorial subject was not rendered');
  assert.match(customEditorialHtml, /data-card-mode="editorial-image"/, 'editorial-image render did not mark its output mode');
  assert.doesNotMatch(customEditorialHtml, /<section class="editorial-frame/, 'custom editorial render fell back to the scaffold content');
  assert.doesNotMatch(customEditorialHtml, /<div class="paper-stack/, 'custom editorial render injected scaffold paper stack nodes');

  const allowedFontPath = path.join(tmpDir, 'allowed-editorial-font.html');
  const allowedFontOutput = renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Controlled font stack',
    use: 'in-article',
    aspect: 'body-3-2',
    content_html: `
      <section class="font-fixture">
        <div class="font-fixture-body">Controlled font stack</div>
      </section>
    `,
    custom_css: `
      .font-fixture { width: 100%; height: 100%; display: grid; place-items: center; font-family: "DM Sans", Arial, sans-serif; }
      .font-fixture-body { font-size: 42px; font-weight: 700; }
    `,
  }, allowedFontPath);
  const allowedFontCheck = runOutputCheck(allowedFontPath, allowedFontOutput);
  assert.equal(allowedFontCheck.result.status, 0, `allowed editorial font stack failed output check: ${allowedFontCheck.result.stdout}\n${allowedFontCheck.result.stderr}`);
  assert.equal(allowedFontCheck.report?.pass, true, 'allowed editorial font stack did not pass');

  const rejectedFontPath = path.join(tmpDir, 'rejected-editorial-font.html');
  const rejectedFontOutput = renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Rejected font stack',
    use: 'in-article',
    aspect: 'body-3-2',
    content_html: `
      <section class="font-fixture">
        <div class="font-fixture-body">Rejected font stack</div>
      </section>
    `,
    custom_css: `
      .font-fixture { width: 100%; height: 100%; display: grid; place-items: center; font-family: Inter, Arial, sans-serif; }
      .font-fixture-body { font-size: 42px; font-weight: 700; }
    `,
  }, rejectedFontPath);
  const rejectedFontCheck = runOutputCheck(rejectedFontPath, rejectedFontOutput);
  assert.notEqual(rejectedFontCheck.result.status, 0, 'rejected editorial font stack unexpectedly passed output check');
  assert.equal(rejectedFontCheck.report?.pass, false, 'rejected editorial font stack did not produce a failing report');
  assert.match(
    rejectedFontCheck.report?.issues?.map(item => item.code).join('\n') || '',
    /editorial_font_primary_not_allowed/,
    `rejected editorial font stack failed for the wrong reason: ${rejectedFontCheck.result.stdout}\n${rejectedFontCheck.result.stderr}`,
  );

  const allowedBoxTextPath = path.join(tmpDir, 'allowed-box-text.html');
  const allowedBoxTextOutput = renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Framed label fits',
    use: 'in-article',
    aspect: 'body-3-2',
    content_html: `
      <section class="box-fixture">
        <div class="label-box"><span>COMMANDS</span></div>
      </section>
    `,
    custom_css: `
      .box-fixture { width: 100%; height: 100%; display: grid; place-items: center; font-family: "DM Sans", Arial, sans-serif; }
      .label-box { width: 300px; height: 96px; border: 1px solid var(--hairline); display: flex; align-items: center; justify-content: center; }
      .label-box span { font-size: 42px; font-weight: 700; white-space: nowrap; }
    `,
  }, allowedBoxTextPath);
  const allowedBoxTextCheck = runOutputCheck(allowedBoxTextPath, allowedBoxTextOutput);
  assert.equal(allowedBoxTextCheck.result.status, 0, `fitting framed text failed output check: ${allowedBoxTextCheck.result.stdout}\n${allowedBoxTextCheck.result.stderr}`);
  assert.equal(allowedBoxTextCheck.report?.pass, true, 'fitting framed text did not pass');

  const rejectedBoxTextPath = path.join(tmpDir, 'rejected-box-text.html');
  const rejectedBoxTextOutput = renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Framed label overflows',
    use: 'in-article',
    aspect: 'body-3-2',
    content_html: `
      <section class="box-fixture">
        <div class="label-box"><span>COMMANDS</span></div>
      </section>
    `,
    custom_css: `
      .box-fixture { width: 100%; height: 100%; display: grid; place-items: center; font-family: "DM Sans", Arial, sans-serif; }
      .label-box { width: 150px; height: 96px; border: 1px solid var(--hairline); display: flex; align-items: center; justify-content: center; }
      .label-box span { font-size: 42px; font-weight: 700; white-space: nowrap; }
    `,
  }, rejectedBoxTextPath);
  const rejectedBoxTextCheck = runOutputCheck(rejectedBoxTextPath, rejectedBoxTextOutput);
  assert.notEqual(rejectedBoxTextCheck.result.status, 0, 'overflowing framed text unexpectedly passed output check');
  assert.equal(rejectedBoxTextCheck.report?.pass, false, 'overflowing framed text did not produce a failing report');
  assert.match(
    rejectedBoxTextCheck.report?.issues?.map(item => item.code).join('\n') || '',
    /html_text_box_overflow/,
    `overflowing framed text failed for the wrong reason: ${rejectedBoxTextCheck.result.stdout}\n${rejectedBoxTextCheck.result.stderr}`,
  );

  const rejectedVisualSystemPath = path.join(tmpDir, 'rejected-editorial-visual-system.html');
  const rejectedVisualSystemOutput = renderers['editorial-image'].render({
    mode: 'editorial-image',
    title: 'Visual system drift',
    use: 'in-article',
    aspect: 'body-3-2',
    content_html: `
      <section class="visual-fixture">
        <div class="loud-module"><span>MODULE</span></div>
      </section>
    `,
    custom_css: `
      .visual-fixture { width: 100%; height: 100%; display: grid; place-items: center; font-family: "DM Sans", Arial, sans-serif; }
      .loud-module { width: 320px; height: 180px; border: 4px solid #191816; background: #f4d35e; display: flex; align-items: center; justify-content: center; }
      .loud-module span { font-size: 42px; font-weight: 700; white-space: nowrap; }
    `,
  }, rejectedVisualSystemPath);
  const rejectedVisualSystemCheck = runOutputCheck(rejectedVisualSystemPath, rejectedVisualSystemOutput);
  assert.notEqual(rejectedVisualSystemCheck.result.status, 0, 'editorial visual-system drift unexpectedly passed output check');
  assert.equal(rejectedVisualSystemCheck.report?.pass, false, 'editorial visual-system drift did not produce a failing report');
  assert.match(
    rejectedVisualSystemCheck.report?.issues?.map(item => item.code).join('\n') || '',
    /editorial_visual_system_violation/,
    `editorial visual-system drift failed for the wrong reason: ${rejectedVisualSystemCheck.result.stdout}\n${rejectedVisualSystemCheck.result.stderr}`,
  );

  for (const templateName of ['infograph_template.html', 'sketchnote_template.html']) {
    const template = stripComments(fs.readFileSync(path.join(ROOT, 'assets', templateName), 'utf8'));
    assert.doesNotMatch(template, /<span>\s*card\s*<\/span>/i, `${templateName} hard-codes the card brand`);
  }

  assert.ok(listDesigns().length >= 1, 'Design registry is empty');
  assert.equal(validate({ mode: 'unknown' }).valid, false, 'Unknown mode unexpectedly passed validation');

  console.log(`Validation passed: ${Object.keys(inputs).length} renderer smoke tests, branding matrix, editorial-image field checks, custom composition, schema, and design registry.`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
