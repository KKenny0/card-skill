// Explicit layout and navigation contracts; never infer a relationship from text.
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const idPattern = /^[a-z0-9][a-z0-9-]{0,39}$/;
function validateNotes(input) {
  const errors = [];
  const fail = s => errors.push(`whiteboard: ${s}`);
  const text = (x, label, max = 1200) => {
    if (typeof x !== 'string' || !x.trim() || x.length > max) fail(`${label} must be non-empty text (at most ${max} characters)`);
  };
  const keys = (x, allowed, label) => {
    for (const k of Object.keys(x)) if (!allowed.includes(k)) fail(`${label}: unknown field ${k}`);
  };
  if (input.variant !== undefined && !['classic', 'reasoning-notes'].includes(input.variant)) fail('unknown variant');
  const notes = input.variant === 'reasoning-notes';
  if (input.note_page !== undefined && !notes) fail('note_page requires reasoning-notes');
  if (!notes) {
    for (const s of Array.isArray(input.steps) ? input.steps : []) if (s && (s.layout !== undefined || s.depth !== undefined)) fail('step layout/depth requires reasoning-notes');
    return errors;
  }
  text(input.title, 'title', 200);
  if (input.accent_words !== undefined && (!Array.isArray(input.accent_words) || input.accent_words.some(w => typeof w !== 'string'))) fail('accent_words must be an array of strings');
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 16) fail('steps must contain 1 to 16 blocks; split by responsibility before rendering');
  for (const [i, s] of (Array.isArray(input.steps) ? input.steps : []).entries()) {
    if (!object(s)) { fail(`steps[${i}] must be an object`); continue; }
    const layouts = { chain: ['stack', 'opposition', 'turn'], layers: ['columns', 'boundary'], annotation: ['note', 'exception'], insight: [] };
    if (!Object.hasOwn(layouts, s.type)) { fail(`steps[${i}] has unknown type`); continue; }
    keys(s, ['type', 'layout', 'depth', ...(s.type === 'chain' ? ['nodes'] : s.type === 'layers' ? ['items'] : ['text'])], `steps[${i}]`);
    if (s.layout !== undefined && !layouts[s.type].includes(s.layout)) fail(`steps[${i}] has unsupported layout`);
    if (s.depth !== undefined && (!Number.isInteger(s.depth) || s.depth < 0 || s.depth > 2)) fail(`steps[${i}].depth must be 0, 1 or 2`);
    if (s.type === 'chain') {
      if (!Array.isArray(s.nodes) || s.nodes.length < 1 || s.nodes.length > 6) fail(`steps[${i}] needs 1 to 6 nodes`);
      if (s.layout === 'opposition' && s.nodes?.length !== 3) fail('opposition needs exactly three nodes: left, relation, right');
      for (const n of Array.isArray(s.nodes) ? s.nodes : []) {
        if (!object(n)) { fail('chain node must be an object'); continue; }
        keys(n, ['text', 'highlight', 'muted'], 'node'); text(n.text, 'node.text', 600);
        for (const k of ['highlight', 'muted']) if (n[k] !== undefined && typeof n[k] !== 'boolean') fail(`node.${k} must be boolean`);
      }
    } else if (s.type === 'layers') {
      if (!Array.isArray(s.items) || s.items.length < 1 || s.items.length > 3) fail(`steps[${i}] needs 1 to 3 columns`);
      if (s.layout === 'boundary' && s.items?.length !== 2) fail('boundary needs exactly two items: internal, shared');
      for (const n of Array.isArray(s.items) ? s.items : []) {
        if (!object(n)) { fail('layer must be an object'); continue; }
        keys(n, ['name', 'desc'], 'layer'); text(n.name, 'layer.name', 120); text(n.desc, 'layer.desc');
      }
    } else text(s.text, 'step.text');
  }
  if (input.note_page !== undefined) {
    const page = input.note_page;
    if (!object(page)) { fail('note_page must be an object'); return errors; }
    keys(page, ['series', 'id', 'role', 'entry', 'exit', 'links'], 'note_page');
    for (const k of ['series', 'id']) if (typeof page[k] !== 'string' || !idPattern.test(page[k])) fail(`note_page.${k} must be a safe id`);
    if (!['overview', 'detail'].includes(page.role)) fail('note_page.role must be overview or detail');
    text(page.entry, 'note_page.entry', 500); text(page.exit, 'note_page.exit', 500);
    if (!Array.isArray(page.links) || page.links.length > 8) fail('note_page.links must be an array of at most 8 targets');
    const seen = new Set();
    for (const link of Array.isArray(page.links) ? page.links : []) {
      if (!object(link)) { fail('page link must be an object'); continue; }
      keys(link, ['target', 'label'], 'link');
      if (typeof link.target !== 'string' || !idPattern.test(link.target)) fail('link.target must be a safe id');
      text(link.label, 'link.label', 160);
      if (seen.has(link.target) || link.target === page.id) fail('page links must be unique and cannot target the same page');
      seen.add(link.target);
    }
  }
  return errors;
}

function validateNoteSeries(outputs) {
  const errors = [], groups = new Map();
  for (const output of Array.isArray(outputs) ? outputs : []) {
    const c = output?.render_contract;
    if (c?.mode !== 'whiteboard' || c.note_page === undefined) continue;
    if (validateNotes(c).length) continue; // Local errors belong to schema validation.
    const page = c.note_page;
    if (!groups.has(page.series)) groups.set(page.series, []);
    groups.get(page.series).push(page);
  }
  for (const [series, pages] of groups) {
    const fail = message => errors.push(`whiteboard series ${series}: ${message}`);
    const ids = new Set(pages.map(p => p.id)), roots = pages.filter(p => p.role === 'overview');
    if (ids.size !== pages.length) fail('duplicate page id');
    if (roots.length !== 1 || pages.length < 2) fail('requires exactly one overview and at least one detail in the same Visual Job');
    for (const page of pages) for (const link of page.links) if (!ids.has(link.target)) fail(`missing target ${link.target}`);
    if (roots.length === 1) {
      const seen = new Set(), pending = [roots[0].id];
      while (pending.length) {
        const id = pending.pop(); if (seen.has(id)) continue; seen.add(id);
        for (const link of pages.find(p => p.id === id)?.links || []) pending.push(link.target);
      }
      for (const id of ids) if (!seen.has(id)) fail(`page ${id} is unreachable from overview`);
    }
  }
  return errors;
}
module.exports = { validateNotes, validateNoteSeries };
