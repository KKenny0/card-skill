const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml: esc } = require('../lib/escape');
const { getDesign, resolveDesignNameForInput } = require('../lib/designs');
const { validateNotes } = require('../lib/whiteboard-notes');

function render(input, htmlPath) {
  const errors = validateNotes(input);
  if (errors.length) throw new Error(errors.join('; '));
  const design = getDesign(resolveDesignNameForInput(input, 'stripe'));
  const font = pathToFileURL(path.resolve(__dirname, '../../assets/fonts/XiangcuiDengcusong.ttf')).href;
  const css = fs.readFileSync(path.resolve(__dirname, '../../assets/whiteboard-notes.css'), 'utf8');
  const blocks = input.steps.map(s => {
    let content;
    if (s.type === 'chain') content = s.nodes.map(n => `<div class="node${n.highlight ? ' highlight' : ''}${n.muted ? ' muted' : ''}">${esc(n.text)}</div>`).join('');
    else if (s.type === 'layers') content = s.items.map(n => `<section class="layer"><h2>${esc(n.name)}</h2><p>${esc(n.desc)}</p></section>`).join('');
    else content = esc(s.text); // Notes are plain text, including insight; no hidden HTML.
    return `<section class="block ${s.type} ${s.layout || ''} depth-${s.depth || 0}"${s.type === 'layers' ? ` style="--columns:${s.items.length}"` : ''}>${content}</section>`;
  }).join('\n');
  const page = input.note_page;
  const entry = page ? `<div class="page-id">${esc(page.id)} · ${page.role === 'overview' ? '总览' : '局部'}</div><section class="annotation exception">${esc(page.entry)}</section>` : '';
  const exit = page ? `<footer class="navigation"><p>${esc(page.exit)}</p>${page.links.map(l => `<p class="reference">→ ${esc(l.target)} · ${esc(l.label)}</p>`).join('')}</footer>` : '';
  const brand = input.logo || input.brand_name ? `<footer class="brand">${input.logo ? `<img alt="logo" src="${esc(pathToFileURL(path.resolve(input.logo)).href)}">` : ''}${esc(input.brand_name || '')}</footer>` : '';
  const words = [...new Set(input.accent_words || [])].filter(Boolean).sort((a, b) => b.length - a.length);
  let title = '', cursor = 0;
  while (cursor < input.title.length) {
    const word = words.find(w => input.title.startsWith(w, cursor));
    title += word ? `<span class="title-accent">${esc(word)}</span>` : esc(input.title[cursor]);
    cursor += word ? word.length : 1;
  }
  const tokens = `--bg:${design.canvas};--ink:${design.ink};--muted:${design.inkMuted};--accent:${design.accent};--line:${design.hairline};--surface:${design.surface1};`;
  fs.writeFileSync(htmlPath, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>${esc(input.title)}</title><style>@font-face{font-family:Notes;src:url('${font}')} :root{${tokens}}\n${css}</style><body><main class="notes"><header>${input.subtitle ? `<p class="kicker">${esc(input.subtitle)}</p>` : ''}<h1>${title}</h1></header>${entry}${blocks}${exit}${brand}</main></body></html>`, 'utf8');
  return { htmlPath, captureWidth: 1080, captureHeight: 800, fullpage: true };
}
module.exports = { render };
