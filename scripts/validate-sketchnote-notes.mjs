import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { validate } = require('./lib/schema');
const { validateVisualJob } = require('./lib/visual-job');
const renderer = require('./renderers/studio-composition');
const { chromium } = require('playwright');

export async function verifySketchnoteNotes() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketchnote-notes-'));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1800 } });
    const fixture = name => JSON.parse(fs.readFileSync(path.join(root, 'evals/fixtures/sketchnote-wandering-notes', `${name}.json`), 'utf8'));
    for (const name of ['rousseau', 'uncertainty', 'a2a']) {
      const job = fixture(name), input = job.outputs[0].render_contract;
      assert.equal(validateVisualJob(job).valid, true, JSON.stringify(validateVisualJob(job)));
      const json = path.join(dir, `${name}.json`), png = path.join(dir, `${name}.png`);
      fs.writeFileSync(json, JSON.stringify(input));
      const run = spawnSync(process.execPath, [path.join(root, 'scripts/card.js'), '--input', json, '--output', png], {
        encoding: 'utf8', env: { ...process.env, CARD_SKILL_DISABLE_UPDATE_CHECK: '1', CARD_SKILL_DISABLE_AUTO_UPDATE: '1' },
      });
      assert.equal(run.status, 0, run.stdout + run.stderr);
      assert.ok(fs.existsSync(png));
      const html = path.join(dir, `${name}-geometry.html`);
      renderer.render(input, html);
      await page.goto(pathToFileURL(html).href);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const lines = selector => {
          const el = document.querySelector(selector); if (!el) return [];
          const range = document.createRange(); range.selectNodeContents(el);
          return [...new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.y)))];
        };
        const textRects = [];
        const walk = document.createTreeWalker(document.querySelector('.page'), NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          if (!walk.currentNode.textContent.trim() || walk.currentNode.parentElement.closest('svg')) continue;
          const range = document.createRange(); range.selectNodeContents(walk.currentNode);
          for (const r of range.getClientRects()) textRects.push({x:r.x,y:r.y,right:r.right,bottom:r.bottom});
        }
        const art = document.querySelector('.return-sketch')?.getBoundingClientRect();
        return {
          variant: document.querySelector('.page').dataset.cardVariant,
          bodySize: getComputedStyle(document.querySelector('.head + p')).fontSize,
          demandLines: lines('.demand p').length,
          questionLines: [...document.querySelectorAll('.question .line')].map(e=>e.getBoundingClientRect().height),
          overlap: !!art && textRects.some(r => r.x < art.right && r.right > art.x && r.y < art.bottom && r.bottom > art.y),
          overflow: document.documentElement.scrollWidth > 1080,
        };
      });
      assert.equal(geometry.variant, 'wandering-notes');
      assert.equal(geometry.bodySize, '44px');
      assert.equal(geometry.overflow, false);
      assert.equal(geometry.overlap, false, 'Inset metaphor intersects actual text');
      if (name === 'uncertainty') {
        assert.equal(geometry.demandLines, 1, 'Short question was fragmented');
        assert.deepEqual(geometry.questionLines, [78, 78], 'Core question must retain two complete clauses');
      }
      if (name === 'a2a') assert.match(input.content_html, /资质与风险，<br>交给外部机构的 Agent 评估/);
    }
    const input = fixture('uncertainty').outputs[0].render_contract;
    assert.equal(validate({...input,variant:'unknown'}).valid, false);
    assert.equal(validate({...input,variant:42}).valid, false);
    assert.equal(validate({...input,mode:'comic'}).valid, false);
    assert.equal(validate({...input,custom_css:''}).valid, false);
    const legacy = {...input}; delete legacy.variant;
    assert.equal(validate(legacy).valid, true);
    const legacyPath = path.join(dir,'legacy.html'); renderer.render(legacy,legacyPath);
    const legacyHtml = fs.readFileSync(legacyPath,'utf8');
    assert.doesNotMatch(legacyHtml,/data-card-variant|Shared geometry for explicit/);
    // Palette choice may change tokens, never the shared layout or metaphor markup.
    const shapes = [];
    for (const tone of ['reflective','sharp','warm','technical']) {
      const f = path.join(dir,`${tone}.html`); renderer.render({...input,tone},f);
      shapes.push(fs.readFileSync(f,'utf8').replace(/data-card-design="[^"]+"/g,'data-card-design="COLOR"').replace(/#[0-9a-f]{3,8}\b/gi,'#COLOR'));
    }
    for (const shape of shapes.slice(1)) assert.equal(shape,shapes[0]);
    console.log('Sketchnote notes: 3 PNGs, semantic line breaks, inset/text separation, contract compatibility and palette-only geometry passed.');
  } finally {
    if (browser) await browser.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifySketchnoteNotes();
