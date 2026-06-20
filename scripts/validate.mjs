#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

  for (const templateName of ['infograph_template.html', 'sketchnote_template.html']) {
    const template = stripComments(fs.readFileSync(path.join(ROOT, 'assets', templateName), 'utf8'));
    assert.doesNotMatch(template, /<span>\s*card\s*<\/span>/i, `${templateName} hard-codes the card brand`);
  }

  assert.ok(listDesigns().length >= 1, 'Design registry is empty');
  assert.equal(validate({ mode: 'unknown' }).valid, false, 'Unknown mode unexpectedly passed validation');

  console.log(`Validation passed: ${Object.keys(inputs).length} renderer smoke tests, branding matrix, schema, and design registry.`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
