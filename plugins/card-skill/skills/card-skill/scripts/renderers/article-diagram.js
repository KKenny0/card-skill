/**
 * Article diagram renderer for card-skill CLI.
 * Produces fixed-slot in-article explanatory diagrams.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml } = require('../lib/escape');
const { getDesign } = require('../lib/designs');

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/infograph_template.html');
const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

const ASPECTS = {
  'body-3-2': { width: 1080, height: 720 },
  'body-4-3': { width: 1080, height: 810 },
};

const CONCEPT_POSITIONS = {
  2: [[30, 52], [70, 52]],
  3: [[50, 27], [28, 68], [72, 68]],
  4: [[28, 31], [72, 31], [28, 70], [72, 70]],
  5: [[50, 23], [25, 50], [75, 50], [35, 77], [65, 77]],
};

const BOUNDARY_ZONE_BOXES = {
  2: [
    { left: 8, top: 14, width: 84, height: 72 },
    { left: 24, top: 30, width: 52, height: 42 },
  ],
  3: [
    { left: 7, top: 12, width: 86, height: 76 },
    { left: 20, top: 27, width: 60, height: 48 },
    { left: 30, top: 40, width: 40, height: 34 },
  ],
  4: [
    { left: 6, top: 10, width: 88, height: 80 },
    { left: 18, top: 23, width: 64, height: 55 },
    { left: 30, top: 36, width: 40, height: 30 },
    { left: 39, top: 47, width: 22, height: 16 },
  ],
};

const BOUNDARY_NODE_SLOTS = [
  [[19, 76], [19, 36], [82, 78]],
  [[74, 41], [74, 62], [30, 62], [30, 43]],
  [[50, 65], [50, 54]],
  [[50, 55]],
];

function defaultAspect(input) {
  return input.aspect || 'body-3-2';
}

function truncate(value, max) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function nodeTitle(node) {
  return escapeHtml(truncate(node.label, 32));
}

function nodeNote(node) {
  return node.note ? `<p class="node-caption">${escapeHtml(truncate(node.note, 58))}</p>` : '';
}

function renderHeader(input) {
  return `
      <header class="diagram-header">
        <h1>${escapeHtml(truncate(input.title, 48))}</h1>
        ${input.subtitle ? `<p class="diagram-subtitle">${escapeHtml(truncate(input.subtitle, 72))}</p>` : ''}
      </header>
  `;
}

function renderCaption(input) {
  return input.caption
    ? `<p class="diagram-caption">${escapeHtml(truncate(input.caption, 110))}</p>`
    : '';
}

function linkList(input, positionsById) {
  if (Array.isArray(input.links) && input.links.length > 0) return input.links;
  const nodes = input.nodes || [];
  if (input.family === 'concept-map' && nodes.length > 2) {
    const hub = nodes[0]?.id;
    return nodes.slice(1).map(node => ({ from: hub, to: node.id, direction: 'none' }));
  }
  return nodes.slice(1).map((node, i) => ({
    from: nodes[i].id,
    to: node.id,
    direction: input.family === 'process-flow' ? 'one-way' : 'none',
  })).filter(link => positionsById.has(link.from) && positionsById.has(link.to));
}

function visibleLinkLabels(links) {
  const labelCounts = new Map();
  for (const link of links) {
    const label = String(link.label || '').trim();
    if (!label) continue;
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
  }

  return links
    .map((link, index) => ({ link, index, label: String(link.label || '').trim() }))
    .filter(item => item.label && labelCounts.get(item.label) === 1)
    .slice(0, 4);
}

function linkLabelPosition(x1, y1, x2, y2, index) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const offset = (index % 2 === 0 ? 1 : -1) * 2.4;
  const x = x1 + dx * 0.5 + (-dy / length) * offset;
  const y = y1 + dy * 0.5 + (dx / length) * offset;
  return [
    Math.min(92, Math.max(8, x)),
    Math.min(90, Math.max(10, y)),
  ];
}

function buildConceptMapHtml(input, positionsById) {
  const nodes = input.nodes.slice(0, 5);
  const links = linkList(input, positionsById).filter(link => positionsById.has(link.from) && positionsById.has(link.to)).slice(0, 6);

  const lineSvg = links.map((link) => {
    const [x1, y1] = positionsById.get(link.from);
    const [x2, y2] = positionsById.get(link.to);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('\n');

  const linkLabelHtml = visibleLinkLabels(links).map(({ link, index, label }) => {
    const [x1, y1] = positionsById.get(link.from);
    const [x2, y2] = positionsById.get(link.to);
    const [x, y] = linkLabelPosition(x1, y1, x2, y2, index);
    return `
      <div class="diagram-link-label" data-diagram-link-label="true" style="left:${x}%; top:${y}%;">
        ${escapeHtml(truncate(label, 14))}
      </div>
    `;
  }).join('\n');

  const nodeHtml = nodes.map((node) => {
    const [x, y] = positionsById.get(node.id);
    return `
      <div class="diagram-node concept-node" style="left:${x}%; top:${y}%;">
        <strong>${nodeTitle(node)}</strong>
        ${nodeNote(node)}
      </div>
    `;
  }).join('\n');

  return `
    <section class="diagram-stage concept-map">
      <div class="diagram-connectors-plane" aria-hidden="true">
        <svg class="diagram-connectors" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${lineSvg}
        </svg>
        ${linkLabelHtml}
      </div>
      ${nodeHtml}
    </section>
  `;
}

function renderConceptMap(input, positions) {
  // positions: optional { [nodeId]: [x, y] } from layoutConceptMap.
  // If absent, fall back to legacy CONCEPT_POSITIONS hardcoded anchors.
  const nodes = input.nodes.slice(0, 5);
  let positionsById;
  if (positions) {
    positionsById = new Map(nodes.map(node => [node.id, positions[node.id]]));
  } else {
    const anchors = CONCEPT_POSITIONS[nodes.length];
    positionsById = new Map(nodes.map((node, i) => [node.id, anchors[i]]));
  }
  return buildConceptMapHtml(input, positionsById);
}

function renderProcessFlow(input) {
  const nodes = input.nodes.slice(0, 6);
  const stepHtml = nodes.map((node, i) => `
    <div class="process-step">
      <div class="step-index">${String(i + 1).padStart(2, '0')}</div>
      <strong>${nodeTitle(node)}</strong>
      ${nodeNote(node)}
    </div>
  `).join('\n');

  return `
    <section class="diagram-stage process-flow" style="--step-count:${nodes.length};">
      <div class="process-rail" aria-hidden="true"></div>
      ${stepHtml}
    </section>
  `;
}

function renderBoundaryModel(input) {
  const zones = input.zones.slice(0, 4);
  const nodes = input.nodes.slice(0, 6);
  const boxes = BOUNDARY_ZONE_BOXES[zones.length];
  const zoneIndex = new Map(zones.map((zone, i) => [zone.id, i]));
  const zoneCounts = new Map();
  const zoneHtml = zones.map((zone, i) => {
    const box = boxes[i];
    return `
      <div class="boundary-zone zone-${i + 1}" style="left:${box.left}%; top:${box.top}%; width:${box.width}%; height:${box.height}%;">
        <strong>${escapeHtml(truncate(zone.label, 28))}</strong>
        ${zone.description ? `<span class="zone-caption">${escapeHtml(truncate(zone.description, 42))}</span>` : ''}
      </div>
    `;
  }).join('\n');

  const nodeHtml = nodes.map((node, i) => {
    const zIndex = zoneIndex.get(node.zone);
    const order = zoneCounts.get(node.zone) || 0;
    zoneCounts.set(node.zone, order + 1);
    const slotPool = BOUNDARY_NODE_SLOTS[zIndex] || [[50, 52]];
    const [left, top] = slotPool[Math.min(order, slotPool.length - 1)];
    return `
      <div class="boundary-node" style="left:${left}%; top:${top}%;">
        <strong>${nodeTitle(node)}</strong>
        ${nodeNote(node)}
      </div>
    `;
  }).join('\n');

  return `
    <section class="diagram-stage boundary-model">
      ${zoneHtml}
      ${nodeHtml}
    </section>
  `;
}

function renderDiagram(input, positions) {
  if (input.family === 'concept-map') return renderConceptMap(input, positions);
  if (input.family === 'process-flow') return renderProcessFlow(input);
  if (input.family === 'boundary-model') return renderBoundaryModel(input);
  throw new Error(`Unknown article-diagram family: ${input.family}`);
}

function baseCss(input, design, aspect) {
  const isTall = aspect.height > 720;
  return `
    :root {
      --bg: ${design.canvas};
      --green: ${design.surface2};
      --pink: ${design.accent};
      --accent: ${design.accent};
      --ink: ${design.ink};
      --ink-light: ${design.inkMuted};
      --surface-1: ${design.surface1};
      --surface-2: ${design.surface2};
      --hairline: ${design.hairline};
      --radius: ${design.radius};
    }

    html, body {
      width: ${aspect.width}px;
      height: ${aspect.height}px;
      overflow: hidden;
    }

    .page {
      width: ${aspect.width}px;
      height: ${aspect.height}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .colophon {
      display: ${input.logo || input.brand_name || input.source ? 'flex' : 'none'};
      padding-top: 18px;
      padding-bottom: 22px;
    }

    .article-diagram {
      flex: 1 1 auto;
      min-height: 0;
      padding: ${isTall ? '48px 62px 34px' : '42px 60px 28px'};
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: ${isTall ? '24px' : '18px'};
      font-family: "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink);
    }

    .diagram-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 0.42fr);
      gap: 34px;
      align-items: end;
    }

    .diagram-header h1 {
      font-family: "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      font-size: ${isTall ? '54px' : '50px'};
      line-height: 1.02;
      letter-spacing: 0;
      color: var(--ink);
      text-wrap: balance;
    }

    .diagram-header p {
      font: 500 24px/1.28 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink-light);
      text-wrap: balance;
    }

    .diagram-stage {
      position: relative;
      min-height: 0;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--surface-1) 92%, var(--bg)), color-mix(in srgb, var(--surface-2) 46%, var(--bg)));
      overflow: hidden;
    }

    .diagram-stage::before {
      content: "";
      position: absolute;
      inset: 22px;
      border: 1px solid color-mix(in srgb, var(--hairline) 68%, transparent);
      border-radius: calc(var(--radius) + 2px);
      pointer-events: none;
    }

    .diagram-caption {
      max-width: 820px;
      font: 500 26px/1.3 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink-light);
      text-wrap: balance;
    }

    .diagram-connectors-plane {
      position: absolute;
      inset: 42px 56px;
      z-index: 1;
      pointer-events: none;
    }

    .diagram-connectors {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .diagram-connectors line {
      stroke: color-mix(in srgb, var(--accent) 70%, var(--hairline));
      stroke-width: 0.42;
      vector-effect: non-scaling-stroke;
    }

    .diagram-link-label {
      position: absolute;
      transform: translate(-50%, -50%);
      padding: 4px 10px 5px;
      border: 1px solid color-mix(in srgb, var(--hairline) 74%, var(--surface-1));
      border-radius: 999px;
      background: color-mix(in srgb, var(--surface-1) 96%, var(--bg));
      color: var(--ink-light);
      font: 700 24px/1 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      letter-spacing: 0;
      white-space: nowrap;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--surface-1) 82%, transparent);
    }

    .diagram-node {
      position: absolute;
      width: 220px;
      min-height: 104px;
      transform: translate(-50%, -50%);
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 94%, var(--bg));
      padding: 20px 22px;
      display: grid;
      gap: 7px;
      align-content: center;
      z-index: 2;
    }

    .diagram-node strong,
    .process-step strong,
    .boundary-node strong {
      font: 700 30px/1.04 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink);
      letter-spacing: 0;
      text-wrap: balance;
    }

    .diagram-node p,
    .process-step p,
    .boundary-node p {
      font: 500 24px/1.22 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink-light);
      letter-spacing: 0;
      text-wrap: balance;
    }

    .process-flow {
      display: grid;
      grid-template-columns: repeat(var(--step-count), minmax(0, 1fr));
      gap: 18px;
      align-items: center;
      padding: 64px 48px;
    }

    .process-rail {
      position: absolute;
      left: 88px;
      right: 88px;
      top: 50%;
      height: 2px;
      background: color-mix(in srgb, var(--accent) 72%, var(--hairline));
      transform: translateY(-1px);
    }

    .process-step {
      position: relative;
      min-height: 210px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 94%, var(--bg));
      padding: 26px 20px 22px;
      display: grid;
      align-content: start;
      gap: 12px;
      z-index: 2;
    }

    .step-index {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent) 15%, var(--surface-1));
      color: var(--accent);
      font: 700 22px/1 "JetBrains Mono", monospace;
      border: 1px solid color-mix(in srgb, var(--accent) 42%, var(--hairline));
    }

    .boundary-model {
      min-height: 0;
    }

    .boundary-zone {
      position: absolute;
      border: 1px solid color-mix(in srgb, var(--accent) 38%, var(--hairline));
      border-radius: calc(var(--radius) + 2px);
      background: color-mix(in srgb, var(--surface-1) 34%, transparent);
      padding: 16px 18px;
    }

    .boundary-zone strong {
      display: block;
      font: 700 26px/1 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--accent);
      letter-spacing: 0;
    }

    .boundary-zone span {
      display: block;
      margin-top: 6px;
      max-width: 320px;
      font: 500 24px/1.16 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
      color: var(--ink-light);
    }

    .boundary-node {
      position: absolute;
      width: 218px;
      min-height: 86px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 95%, var(--bg));
      padding: 17px 18px;
      display: grid;
      gap: 6px;
      align-content: center;
      z-index: 3;
      transform: translate(-50%, -50%);
    }
  `;
}

function render(input, outputHtmlPath, positions) {
  const designName = input.design || 'stripe';
  const design = getDesign(designName);
  if (!design) throw new Error(`Design not found: ${input.design}`);

  const aspectKey = defaultAspect(input);
  const aspect = ASPECTS[aspectKey];
  if (!aspect) throw new Error(`Unknown article-diagram aspect: ${aspectKey}`);

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const logoUrl = input.logo ? escapeHtml(pathToFileURL(path.resolve(input.logo)).href) : '';
  const brandName = input.brand_name ? escapeHtml(input.brand_name) : '';
  const sourceLine = input.source ? `<span class="info-source">${escapeHtml(input.source)}</span>` : '';
  const contentHtml = `
    <article class="article-diagram article-diagram-${input.family}">
      ${renderHeader(input)}
      ${renderDiagram(input, positions)}
      ${renderCaption(input)}
    </article>
  `;
  const customCss = baseCss(input, design, aspect);

  template = template.replaceAll('{{CUSTOM_CSS}}', customCss);
  template = template.replaceAll('{{CONTENT_HTML}}', contentHtml);
  template = template.replaceAll('{{SOURCE_LINE}}', sourceLine);
  template = template.replaceAll('{{LOGO}}', logoUrl);
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));
  template = template.replace(
    '<div class="page">',
    `<div class="page" data-card-mode="article-diagram" data-card-design="${escapeHtml(designName)}" data-diagram-family="${escapeHtml(input.family)}">`,
  );

  if (!logoUrl && !brandName) {
    template = template.replace(/\s*<div class="who">[\s\S]*?<\/div>/, '');
  } else {
    if (!logoUrl) template = template.replace(/\s*<img src="" alt="">/, '');
    if (!brandName) template = template.replace(/\s*<span><\/span>/, '');
  }
  if (!logoUrl && !brandName && !sourceLine) {
    template = template.replace(/\s*<div class="colophon">\s*<\/div>/, '');
  }

  fs.writeFileSync(outputHtmlPath, template, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: aspect.width,
    captureHeight: aspect.height,
    fullpage: false,
  };
}

// ── Two-pass measure-then-place (concept-map only for Phase 1) ──
//
// Legacy render() takes hardcoded positions from CONCEPT_POSITIONS. For
// concept-map, card.js calls renderMeasure() → capture4k --measure →
// layoutConceptMap() → render(positions=) to compute positions from actual
// node sizes. Boundary-model and process-flow keep the legacy path for now.

const MEASURE_NODE_WIDTH = 220; // matches .diagram-node width in baseCss

// Stage geometry estimate for body-3-2 (1080x720): padding 42/60/28 + header
// ~70 + caption ~35 + gap 36 → stage ≈ 960 × 509. body-4-3 (1080x810) gives
// stage ≈ 960 × 599. Both fit the same anchor percentages.
function stageBox(aspect) {
  return {
    width: aspect.width - 120,
    height: aspect.height - 42 - 28 - 70 - 35 - 36,
  };
}

// Geometric anchor centers per node count (percent of diagram-stage).
// Spread enough that two adjacent nodes with note lines cannot collide.
const CONCEPT_ANCHORS = {
  2: [[30, 50], [70, 50]],
  3: [[50, 25], [25, 75], [75, 75]],
  4: [[25, 30], [75, 30], [25, 75], [75, 75]],
  5: [[50, 20], [20, 50], [80, 50], [30, 80], [70, 80]],
};

function layoutConceptMap(input, bboxes, aspect) {
  const stage = stageBox(aspect);
  const nodes = (input.nodes || []).slice(0, 5);
  const count = nodes.length;
  const anchors = CONCEPT_ANCHORS[count] || CONCEPT_ANCHORS[5];
  const margin = 4; // percent from stage edge, half a node can extend safely

  const positions = {};
  for (let i = 0; i < count; i++) {
    const node = nodes[i];
    const [ax, ay] = anchors[i];
    const bbox = bboxes[`node-${node.id}`] || { width: MEASURE_NODE_WIDTH, height: 110 };

    const wPct = (bbox.width / stage.width) * 100;
    const hPct = (bbox.height / stage.height) * 100;
    const halfW = wPct / 2;
    const halfH = hPct / 2;

    const cx = Math.max(margin + halfW, Math.min(100 - margin - halfW, ax));
    const cy = Math.max(margin + halfH, Math.min(100 - margin - halfH, ay));

    positions[node.id] = [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10];
  }

  return positions;
}

function renderMeasure(input, outputHtmlPath) {
  // Only concept-map uses two-pass for now. Return null signals caller to
  // fall back to single-pass render().
  if (input.family !== 'concept-map') return null;

  const designName = input.design || 'stripe';
  const design = getDesign(designName);
  if (!design) throw new Error(`Design not found: ${input.design}`);

  const aspectKey = defaultAspect(input);
  const aspect = ASPECTS[aspectKey];
  if (!aspect) throw new Error(`Unknown article-diagram aspect: ${aspectKey}`);

  const nodes = (input.nodes || []).slice(0, 5);
  const fontBaseUrl = pathToFileURL(FONT_DIR).href;
  const nodeMeasureHtml = nodes.map(n => `
    <div class="measure-node" data-measure-id="node-${escapeHtml(n.id)}">
      <strong>${nodeTitle(n)}</strong>
      ${nodeNote(n)}
    </div>
  `).join('\n');

  // Inline @font-face so measure DOM uses real XiangcuiDengcusong. DM Sans
  // falls back to system sans for measure (Latin chars are close enough in
  // proportional width; CJK measurement is the load-bearing case).
  const measureHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'XiangcuiDengcusong';
    src: url('${fontBaseUrl}/XiangcuiDengcusong.ttf') format('truetype');
    font-display: block;
  }
  body {
    margin: 0;
    font-family: "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    background: ${design.canvas};
  }
  .measure-stage { width: ${aspect.width}px; padding: 0 60px; }
  .measure-node {
    visibility: hidden;
    display: block;
    width: ${MEASURE_NODE_WIDTH}px;
    margin-bottom: 16px;
    padding: 20px 22px;
    border: 1px solid ${design.hairline};
    background: color-mix(in srgb, ${design.surface1} 94%, ${design.canvas});
    border-radius: ${design.radius};
  }
  .measure-node strong {
    font: 700 30px/1.04 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    display: block;
    margin-bottom: 7px;
    color: ${design.ink};
  }
  .measure-node p {
    font: 500 24px/1.22 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    margin: 0;
    color: ${design.inkMuted};
  }
</style>
</head><body>
<div class="measure-stage">
${nodeMeasureHtml}
</div>
</body></html>`;

  fs.writeFileSync(outputHtmlPath, measureHtml, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: aspect.width,
    captureHeight: 800,
    fullpage: false,
  };
}

module.exports = { render, renderMeasure, layoutConceptMap, ASPECTS, defaultAspect };
