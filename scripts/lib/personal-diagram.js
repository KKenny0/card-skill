// Contract semantics shared by validation and the personal diagram renderer.
const LAYOUTS = ['exchange', 'convergence', 'tension', 'cycle', 'timeline', 'hierarchy'];
function analyze(input) {
  const fail = message => { throw new Error(`personal_layout: ${message}`); };
  if (!LAYOUTS.includes(input.personal_layout)) fail('unknown layout');
  if (input.family || input.render_plan !== 'structure') fail('requires compression render_plan="structure"');
  if (input.aspect && input.aspect !== 'body-3-2') fail('requires body-3-2');
  const ns = input.structure?.nodes, rs = input.structure?.relations;
  if (!Array.isArray(ns) || ns.length < 2 || ns.length > 6 || !Array.isArray(rs) || rs.length > 6) fail('requires 2–6 nodes and at most 6 relations');
  for (const n of ns) {
    if (!n || typeof n !== 'object' || typeof n.label !== 'string' || !n.label.trim() || n.label.length > 36) fail('node label must be non-empty text of at most 36 characters');
    if (n.note !== undefined && typeof n.note !== 'string') fail('node note must be text');
  }
  for (const r of rs) if (!r || typeof r !== 'object' || (r.label !== undefined && (typeof r.label !== 'string' || r.label.length > 24))) fail('relation label must be text of at most 24 characters');
  const ids = ns.map(n => n?.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) fail('node ids must be unique strings');
  const edges = rs.map(r => [ids.indexOf(r?.from), ids.indexOf(r?.to)]);
  if (edges.some(([a,b]) => a < 0 || b < 0 || a === b) || new Set(edges.map(e => e.join(','))).size !== edges.length) fail('invalid, self or duplicate relation');
  const children = ns.map((_,i) => edges.filter(e => e[0] === i).map(e => e[1]));
  const parents = ns.map((_,i) => edges.filter(e => e[1] === i).map(e => e[0]));
  let order = [], root, target;
  const kind = input.personal_layout;
  if (kind === 'convergence' || kind === 'tension') {
    target = parents.findIndex(p => p.length === ns.length - 1);
    if (target < 0 || rs.length !== ns.length - 1 || children[target].length || (kind === 'tension' && ns.length !== 3)) fail('requires independent sources converging on one target');
    order = ids.map((_,i) => i).filter(i => i !== target).concat(target);
    if (kind === 'convergence' && new Set(rs.map(r => r.label || '')).size > 1) fail('convergence requires a shared relation label');
  } else if (kind === 'exchange') {
    if (ns.length !== 3 || rs.length !== 3) fail('exchange requires two actors and one internal detail node');
    target = parents.findIndex((p,i) => p.length === 1 && children[i].length === 0);
    const actor = target >= 0 ? parents[target][0] : -1;
    const peer = ids.findIndex((_,i) => i !== target && i !== actor);
    if (actor < 0 || !children[actor].includes(peer) || !children[peer].includes(actor)) fail('exchange requires reciprocal actor edges and one internal-detail edge');
    if (rs.some(r => !r.label?.trim())) fail('exchange requires visible relation labels');
    order = [peer,actor,target];
  } else if (kind === 'cycle') {
    if (ns.length < 3 || ns.length > 4 || rs.length !== ns.length || children.some(c => c.length !== 1) || parents.some(p => p.length !== 1)) fail('only a simple 3–4 node cycle is supported; split branching feedback into separate diagrams');
    let i = 0; while (!order.includes(i)) { order.push(i); i = children[i][0]; }
    if (i !== 0 || order.length !== ns.length) fail('cycle must be connected');
  } else {
    const roots = parents.map((p,i) => p.length === 0 ? i : -1).filter(i => i >= 0);
    if (roots.length !== 1 || rs.length !== ns.length - 1 || parents.some(p => p.length > 1)) fail('requires one connected rooted tree');
    root = roots[0]; const visit = i => { if (order.includes(i)) fail('cycle in tree'); order.push(i); children[i].forEach(visit); }; visit(root);
    if (order.length !== ns.length) fail('disconnected tree');
    if (kind === 'timeline' && children.some(c => c.length > 1)) fail('timeline requires a single ordered chain');
    if (new Set(rs.map(r => r.label || '')).size > 1) fail('timeline/hierarchy require one shared relation label; otherwise split the explanation');
  }
  return { kind, ns, rs, edges, children, parents, order, root, target };
}
module.exports = { LAYOUTS, analyze };
