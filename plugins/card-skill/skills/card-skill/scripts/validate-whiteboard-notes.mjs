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
const { validateVisualJob, artifactContractProjection } = require('./lib/visual-job');
const renderer = require('./renderers/whiteboard');
export function verifyWhiteboardNotes() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'evals/fixtures/whiteboard-notes.json')));
  const series = JSON.parse(fs.readFileSync(path.join(root, 'evals/fixtures/whiteboard-notes-series.job.json')));
  assert.equal(validateVisualJob(series).valid, true, JSON.stringify(validateVisualJob(series)));
  const invalidJob = mutate => {
    const x = structuredClone(series); mutate(x); assert.equal(validateVisualJob(x).valid, false);
  };
  invalidJob(x => x.outputs[0].render_contract.note_page.links[0].target = 'missing');
  invalidJob(x => x.outputs[1].render_contract.note_page.id = '01');
  invalidJob(x => x.outputs[0].render_contract.note_page.links = []);
  invalidJob(x => x.outputs[2].render_contract.note_page.role = 'overview');
  invalidJob(x => x.outputs[1].render_contract.note_page.entry = '');
  invalidJob(x => x.outputs[1].render_contract.note_page.series = 'other');
  // Cyclic cross-page navigation terminates; reordering cannot change validity.
  const reversed = structuredClone(series); reversed.outputs.reverse();
  assert.equal(validateVisualJob(reversed).valid, true);
  const invalid = mutate => {
    const x = structuredClone(fixtures.a2a); mutate(x); assert.equal(validate(x).valid, false);
  };
  invalid(x => x.steps[1].items.push(x.steps[1].items[0]));
  invalid(x => x.steps[0].layout = 'opposition');
  invalid(x => x.steps[0].depth = 3);
  invalid(x => x.steps[0].layout = 'guess');
  invalid(x => x.steps[0] = null);
  invalid(x => x.steps[1].items[0].desc = ' ');
  assert.equal(validate({...fixtures.a2a,variant:undefined}).valid,true);
  invalid(x => x.note_page = null);
  invalid(x => x.accent_words = [42]);
  assert.doesNotThrow(() => validate({ mode:'whiteboard', title:'test', steps:{} }));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whiteboard-notes-'));
  try {
    for (const [name, input] of Object.entries(fixtures)) {
      assert.equal(validate(input).valid, true, JSON.stringify(validate(input)));
      const file = path.join(dir, name + '.html');
      const result = renderer.render(input, file);
      const run = spawnSync(process.execPath, [path.join(root, 'scripts/check-output.mjs'), '--html', file, '--width', '1080', '--height', '800', '--fullpage', '--skip-png', '--json'], { encoding:'utf8' });
      assert.equal(run.status, 0, name + '\n' + run.stdout + run.stderr);
      assert.equal(JSON.parse(run.stdout).pass, true, name);
      assert.equal(result.fullpage, true);
      const html = fs.readFileSync(file, 'utf8');
      if (input.note_page) for (const text of [input.note_page.entry, input.note_page.exit, ...input.note_page.links.map(l => l.label)]) assert.ok(html.includes(text), 'navigation must be visible');
    }
    const unsafe = structuredClone(fixtures.a2a); unsafe.steps[0].nodes[0].text = '<script>alert(1)</script>';
    const file = path.join(dir, 'escaped.html'); renderer.render(unsafe, file);
    assert.ok(fs.readFileSync(file, 'utf8').includes('&lt;script&gt;'));
    unsafe.title = 'A < B & C'; unsafe.accent_words = ['< B', '<', '&'];
    renderer.render(unsafe, file);
    const accented = fs.readFileSync(file, 'utf8');
    assert.ok(accented.includes('<span class="title-accent">&lt; B</span>'));
    assert.ok(accented.includes('<span class="title-accent">&amp;</span>'));
    assert.ok(accented.includes('<title>A &lt; B &amp; C</title>'));
    const original = artifactContractProjection(fixtures.overview, 1);
    const changed = structuredClone(fixtures.overview); changed.note_page.exit = 'Changed exit';
    assert.notDeepEqual(artifactContractProjection(changed, 1), original, 'navigation must bind to review identity');
    const classic = { mode:'whiteboard', title:'Classic', steps:[{type:'annotation',text:'Existing structured contract.'}] };
    const a = path.join(dir,'classic.html'), b = path.join(dir,'explicit.html');
    renderer.render(classic,a); renderer.render({...classic,variant:'reasoning-notes'},b);
    assert.equal(validate({...classic,variant:'classic'}).valid,false);
    assert.equal(fs.readFileSync(a,'utf8'),fs.readFileSync(b,'utf8'));
  } finally { fs.rmSync(dir, { recursive:true, force:true }); }
  console.log('Whiteboard notes: nine browser-checked fixtures, navigation graph, invalid contracts and omitted-variant default passed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyWhiteboardNotes();
