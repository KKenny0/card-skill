import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { validate } = require('./lib/schema');
const renderer = require('./renderers/big');
export function verifyBigReading() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'evals/fixtures/big-reading.json')));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'big-reading-'));
  const check = (name, input, mutateHtml = html => html) => {
    const file = path.join(dir, name + '.html');
    renderer.render(input, file);
    fs.writeFileSync(file, mutateHtml(fs.readFileSync(file, 'utf8')));
    const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-output.mjs'), '--html', file, '--width', '1080', '--height', '1440', '--skip-png', '--json'], { encoding: 'utf8' });
    return { status: r.status, report: JSON.parse(r.stdout), file };
  };
  for (const [name, input] of Object.entries(fixtures)) {
    assert.equal(validate(input).valid, true, JSON.stringify(validate(input)));
    const result = check(name, input);
    assert.equal(result.status, 0, name + ': ' + JSON.stringify(result.report));
    assert.equal(result.report.pass, true);
  }
  for (const mutate of [
    x => { x.reading_lines[0].text = '删除原条件'; },
    x => { x.reading_lines.push(...x.reading_lines); },
    x => { x.reading_lines[0].font_size = 60; },
    x => { x.reading_lines[0].text = '<b>注入</b>'; },
    x => { x.accent_words = ['不在主文']; },
    x => { x.reading_lines[0].pause_before = 'long'; },
  ]) {
    const input = structuredClone(fixtures.condition); mutate(input);
    assert.equal(validate(input).valid, false);
  }
  const overwide = structuredClone(fixtures.condition);
  overwide.reading_lines.forEach(l => { l.font_size = 200; });
  assert.notEqual(check('overwide', overwide).status, 0, 'overwide text must fail rather than shrink or clip');
  const overtall = structuredClone(fixtures.six);
  overtall.reading_lines.forEach((l, i) => { l.font_size = 190; l.pause_before = i ? 'long' : 'none'; });
  assert.notEqual(check('overtall', overtall).status, 0, 'too tall must fail rather than crop');
  const tinyLine = check('tiny-line', fixtures.short, html => html.replace('font-size:132px', 'font-size:60px'));
  assert.ok(tinyLine.report.issues.some(issue => issue.code === 'big_phrase_too_small'), 'actual child font must be measured');
  const legacy = { mode: 'big', phrase: fixtures.condition.reading_lines.map(l => l.text).join('<br>'), font_size: 104 };
  assert.equal(check('legacy-five-lines', legacy).status, 0, 'legacy phrase must also support five lines');
  const base = fs.readFileSync(check('palette-base', fixtures.short).file, 'utf8');
  const alternate = fs.readFileSync(check('palette-other', { ...fixtures.short, tone: 'technical' }).file, 'utf8');
  assert.equal(base.replace(/:root\{[^}]*\}/, ''), alternate.replace(/:root\{[^}]*\}/, ''), 'tone must change only color');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Big reading: six layouts, five/six-line acceptance, invalid contracts, overflow rejection and palette-only geometry passed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyBigReading();
