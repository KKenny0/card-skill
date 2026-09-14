#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = [
  { id: 'cover', request: '把这段文章做成公众号头图：可靠的自动化需要留下可检查的记录，记录让人知道哪些工作完成了。', use: true, wait: false, reference: 'references/mode-editorial-image.md' },
  { id: 'quote', request: '把这句原话做成 PNG 卡片，逐字保留：“先记录，再判断。”', use: true, wait: false, reference: 'references/visual-job.md' },
  { id: 'tool-cards', request: '用以下官方说明做一组开源工具介绍 PNG：Maplet 把本地 Markdown 合成单个 HTML 文件。输入为一个 Markdown 目录；运行命令为 maplet build ./notes；输出为 notes.html。这就是当前版本的完整说明。', use: true, wait: false, reference: 'references/source-open-source-tool.md' },
  { id: 'requested-preview', request: '给这篇文章先做两个封面方向让我选，先别生成 PNG：备份的意义是让错误可以撤销。', use: true, wait: true, reference: 'references/codex-inline-preview.md' },
  { id: 'repository-analysis', request: '帮我处理这个开源工具的介绍：Maplet 把本地 Markdown 合成单个 HTML。请分析 README 的表述是否准确，给文字建议，不需要配图。', use: false, wait: false },
  { id: 'ui-card', request: '帮我写一个 React 用户资料卡片组件，有头像、姓名和关注按钮。', use: false, wait: false },
];

function arg(flag) {
  const index = process.argv.indexOf(flag);
  return index < 0 ? null : process.argv[index + 1];
}

function metadata(skill) {
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  assert.ok(frontmatter, 'SKILL.md frontmatter missing');
  const name = frontmatter.match(/^name: (.+)$/m)?.[1].trim();
  const description = frontmatter.match(/^description: (.+)$/m)?.[1].trim();
  assert.ok(name && description, 'skill name/description missing');
  return { name, description: description.startsWith('"') ? JSON.parse(description) : description };
}

function failures(testCase, answer) {
  const issues = [];
  if (answer.use_skill !== testCase.use) issues.push('skill selection');
  if (answer.wait_for_user !== testCase.wait) issues.push('user checkpoint');
  if (!testCase.use && answer.reference_files.length) issues.push('unneeded reference loading');
  return issues;
}

function summary(results, selectedCount) {
  return {
    passed: results.filter(item => item.pass === true).length,
    failed: results.filter(item => item.pass === false).length,
    errors: results.filter(item => item.pass === null).length,
    skipped: selectedCount - results.filter(item => item.id !== 'setup').length,
  };
}

if (process.argv.includes('--self-test')) {
  assert.equal(metadata('---\nname: card-skill\ndescription: "PNG cards"\n---').description, 'PNG cards');
  assert.throws(() => metadata('missing frontmatter'));
  assert.deepEqual(failures(cases[0], { use_skill: true, wait_for_user: false, reference_files: [cases[0].reference] }), []);
  assert.equal(failures(cases[0], { use_skill: false, wait_for_user: true, reference_files: [] }).length, 2);
  assert.deepEqual(failures(cases[5], { use_skill: false, wait_for_user: false, reference_files: [] }), []);
  assert.equal(failures(cases[5], { use_skill: true, wait_for_user: false, reference_files: ['references/taste.md'] }).length, 2);
  assert.deepEqual(summary([{ pass: true }, { pass: null }], 3), { passed: 1, failed: 0, errors: 1, skipped: 1 });
  assert.deepEqual(summary([{ id: 'setup', pass: null }], 3), { passed: 0, failed: 0, errors: 1, skipped: 3 });
  console.log('Discovery harness self-test passed.');
  process.exit(0);
}

const selected = arg('--case') ? cases.filter(item => item.id === arg('--case')) : cases;
assert.ok(selected.length, 'Unknown discovery case');
if (process.argv.includes('--list-cases')) {
  console.log(JSON.stringify(selected.map(({ id, use: useSkill, wait }) => ({ id, use_skill: useSkill, wait_for_user: wait })), null, 2));
  process.exit(0);
}
const skillRoot = path.resolve(arg('--skill-root') || path.join(root, 'plugins/card-skill/skills/card-skill'));
const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
const entry = metadata(skill);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'card-skill-discovery-'));
const results = [];
let activeCase;
let startedAt;
try {
  const schemaPath = path.join(temp, 'answer-schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify({
    type: 'object', additionalProperties: false,
    properties: { use_skill: { type: 'boolean' }, wait_for_user: { type: 'boolean' }, reference_files: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } },
    required: ['use_skill', 'wait_for_user', 'reference_files', 'reason'],
  }));
  for (const testCase of selected) {
    activeCase = testCase;
    const answerPath = path.join(temp, `${testCase.id}.json`);
    const prompt = [
      'This is a read-only skill discovery and routing probe, not a rendering task.',
      'Decide whether the available skill applies to the user request from its catalog entry. If it applies, read SKILL.md and follow only the references needed to determine the workflow. If not, do not load skill files.',
      'Do not render, install, update, browse, or modify files. For PowerShell commands use PowerShell 7.',
      'Return the routing decision: whether to use the skill, whether the real task must wait for user input before rendering, the relevant reference files you actually read (relative paths), and a short reason.',
      `Available skill: ${entry.name}: ${entry.description}. File: ${path.join(skillRoot, 'SKILL.md')}`,
      `User request: ${testCase.request}`,
    ].join('\n');
    const start = Date.now();
    startedAt = start;
    const result = spawnSync('codex', [
      'exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--sandbox', 'read-only',
      '--skip-git-repo-check', '--cd', skillRoot, '--json', '--output-schema', schemaPath,
      '--output-last-message', answerPath, '-',
    ], { input: prompt, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, CARD_SKILL_DISABLE_UPDATE_CHECK: '1' } });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${testCase.id}: ${result.stderr}`);
    const answer = JSON.parse(fs.readFileSync(answerPath, 'utf8'));
    const events = result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const commands = events.filter(event => event.type === 'item.completed' && event.item?.type === 'command_execution').map(event => ({ command: event.item.command, exit_code: event.item.exit_code }));
    const issues = failures(testCase, answer);
    results.push({ id: testCase.id, pass: issues.length === 0, issues, answer, expected_reference: testCase.reference || null, reference_reported: testCase.reference ? answer.reference_files.includes(testCase.reference) : null, commands, elapsed_ms: Date.now() - start, usage: events.findLast(event => event.type === 'turn.completed')?.usage || null });
    process.stderr.write(`discovery ${issues.length ? 'FAIL' : 'pass'}: ${testCase.id}\n`);
  }
} catch (error) {
  results.push({ id: activeCase?.id || 'setup', pass: null, error: error.message, elapsed_ms: startedAt ? Date.now() - startedAt : null });
  process.stderr.write(`discovery ERROR: ${activeCase?.id || 'setup'}: ${error.message}\n`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
const report = {
  schema_version: 1, prompt_profile: 'metadata-routing-v1',
  scope: { kind: arg('--case') ? 'single' : 'full', selected: selected.length, total: cases.length },
  skill_version: skill.match(/^version: "([^"]+)"/m)?.[1], description_characters: entry.description.length,
  skill_characters: skill.length, cases: results,
  summary: summary(results, selected.length),
  limits: 'Single-skill, read-only routing probe. Decisions and reference lists are model-reported; commands are observed CLI events for manual audit. Not end-to-end rendering, multi-skill competition, or proof of file-read completeness.',
};
if (arg('--report')) fs.writeFileSync(path.resolve(arg('--report')), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed || report.summary.errors) process.exitCode = 1;
