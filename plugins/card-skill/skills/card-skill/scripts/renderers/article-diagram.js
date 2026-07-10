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
  'body-2-1': { width: 1080, height: 540 },
  'body-3-2': { width: 1080, height: 720 },
  'body-4-3': { width: 1080, height: 810 },
};
const BOUNDARY_NODE_WIDTH = 218;
const BAND_NODE_WIDTH = 282;

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
  if (input.aspect) return input.aspect;
  if (isCompressionPack(input)) return analyzeFormulaCardContent(input).aspect;
  // 3+ zone boundary-model only needs the taller canvas when the diagram
  // content itself is dense. Sparse bands read better in the normal body
  // aspect because the header, stage, and caption stay balanced.
  if (boundaryModelNeedsTallAspect(input)) return 'body-4-3';
  return 'body-3-2';
}

function visualTextLength(value) {
  const text = String(value || '').trim();
  let weight = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) {
      weight += 0.4;
    } else if (/[\u3400-\u9fff]/.test(ch)) {
      weight += 2;
    } else {
      weight += 1;
    }
  }
  return weight;
}

function boundaryModelNeedsTallAspect(input) {
  if (input.family !== 'boundary-model') return false;
  const zones = (input.zones || []).slice(0, 4);
  if (zones.length < 3) return false;
  if (isSparseBoundaryBandModel(input)) return false;

  const nodes = (input.nodes || []).slice(0, 6);
  const nodesByZone = new Map();
  for (const node of nodes) {
    if (!nodesByZone.has(node.zone)) nodesByZone.set(node.zone, []);
    nodesByZone.get(node.zone).push(node);
  }

  const zoneDescriptionWeight = zones.reduce((sum, zone) => sum + visualTextLength(zone.description), 0);
  const nodeNoteWeight = nodes.reduce((sum, node) => sum + visualTextLength(node.note), 0);
  const hasStackedZone = [...nodesByZone.values()].some(zoneNodes => zoneNodes.length > 1);

  return zones.length >= 4
    || nodes.length >= 5
    || hasStackedZone
    || zoneDescriptionWeight >= 44
    || nodeNoteWeight >= 44;
}

function isSparseBoundaryBandModel(input) {
  if (input.family !== 'boundary-model') return false;
  const zones = (input.zones || []).slice(0, 4);
  if (zones.length !== 3) return false;

  const nodes = (input.nodes || []).slice(0, 6);
  if (nodes.length > zones.length) return false;
  if (zones.some(zone => zone.description)) return false;
  if (nodes.some(node => node.note)) return false;

  const zoneCounts = new Map();
  for (const node of nodes) {
    zoneCounts.set(node.zone, (zoneCounts.get(node.zone) || 0) + 1);
  }
  return [...zoneCounts.values()].every(count => count <= 1);
}

function boundaryNodeWidth(input) {
  const zones = (input.zones || []).slice(0, 4);
  if (input.family !== 'boundary-model' || zones.length < 3) return BOUNDARY_NODE_WIDTH;
  const compactLevel = boundaryCompactLevel(input);
  if (compactLevel >= 2) return 260;
  if (compactLevel >= 1) return 270;
  return BAND_NODE_WIDTH;
}

function articleDiagramOptions(input) {
  return input && typeof input.__articleDiagramSalvage === 'object'
    ? input.__articleDiagramSalvage
    : {};
}

function boundaryCompactLevel(input) {
  const level = Number(articleDiagramOptions(input).boundaryCompactLevel || 0);
  return Number.isFinite(level) ? Math.max(0, Math.min(2, level)) : 0;
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

function isCompressionPack(input) {
  return !input.family && (input.formula || input.sentence || input.structure);
}

function compressionPlan(input) {
  const plan = input.render_plan || 'auto';
  if (plan === 'auto') return 'summary';
  return plan;
}

function formulaCardTerms(input) {
  return parseFormulaCard(input).terms;
}

function parseFormulaCard(input) {
  const formulaText = String(input.formula || '').trim();
  const relationMatch = formulaText.match(/\s*(=>|→|=)\s*/);
  if (!relationMatch) {
    return { result: formulaText, relation: '', terms: [] };
  }

  const relationIndex = relationMatch.index;
  const result = formulaText.slice(0, relationIndex).trim();
  const termsSource = formulaText.slice(relationIndex + relationMatch[0].length).trim();
  const relation = relationMatch[1] === '=>' ? '→' : relationMatch[1];
  const terms = termsSource
    .split(/\s*\+\s*/)
    .map(term => term.trim())
    .filter(Boolean);
  return { result, relation, terms };
}

const FORMULA_TYPE_SCALES = [
  {
    id: 'large', resultSize: 72, termSize: 42, noteSize: 29,
    shellWidth: 890, noteWidth: 760, expressionGap: 24, rowGap: 10, noteGap: 36,
    maxRows: 1,
  },
  {
    id: 'medium', resultSize: 66, termSize: 38, noteSize: 28,
    shellWidth: 860, noteWidth: 730, expressionGap: 23, rowGap: 10, noteGap: 34,
    maxRows: 2,
  },
  {
    id: 'small', resultSize: 64, termSize: 37, noteSize: 28,
    shellWidth: 900, noteWidth: 820, expressionGap: 27, rowGap: 13, noteGap: 43,
    maxRows: 3,
  },
];

function fallbackTextWidth(value, fontSize) {
  return visualTextLength(value) * fontSize * 0.52;
}

function measuredWidth(bboxes, key, value, fontSize) {
  return bboxes?.[key]?.width || fallbackTextWidth(value, fontSize);
}

function measuredHeight(bboxes, key, fallback) {
  return bboxes?.[key]?.height || fallback;
}

function contiguousPartitions(items, lineCount) {
  if (lineCount <= 1) return [[items]];
  if (lineCount > items.length) return [];
  const output = [];
  const visit = (start, remaining, lines) => {
    if (remaining === 1) {
      output.push([...lines, items.slice(start)]);
      return;
    }
    const lastBreak = items.length - remaining + 1;
    for (let end = start + 1; end <= lastBreak; end += 1) {
      visit(end, remaining - 1, [...lines, items.slice(start, end)]);
    }
  };
  visit(0, lineCount, []);
  return output;
}

function formulaLineWidth(line, termWidths, plusWidth) {
  const termWidth = line.reduce((sum, term) => sum + termWidths.get(term), 0);
  const plusCount = Math.max(0, line.length - 1);
  return 50 + termWidth + plusCount * (plusWidth + 26);
}

function formulaCardCandidates(input, bboxes) {
  const parsed = parseFormulaCard(input);
  if (parsed.terms.length > 6) {
    throw new Error('article_diagram_formula_too_dense: formula cards support at most 6 semantic terms. Compress the formula before rendering.');
  }

  const aspectIds = input.aspect ? [input.aspect] : ['body-2-1', 'body-3-2'];
  const candidates = [];
  for (const scale of FORMULA_TYPE_SCALES) {
    const resultHeight = measuredHeight(bboxes, `formula-result-${scale.id}`, scale.resultSize * 1.02);
    const resultWidth = measuredWidth(bboxes, `formula-result-${scale.id}`, parsed.result, scale.resultSize);
    if (resultWidth > scale.shellWidth) continue;
    const termHeight = measuredHeight(bboxes, `formula-term-${scale.id}-0`, scale.termSize * 1.12);
    const plusWidth = measuredWidth(bboxes, `formula-plus-${scale.id}`, '+', scale.termSize * 0.62);
    const termWidths = new Map(parsed.terms.map((term, index) => [
      term,
      measuredWidth(bboxes, `formula-term-${scale.id}-${index}`, term, scale.termSize),
    ]));
    const rowCounts = parsed.terms.length === 0
      ? [0]
      : Array.from({ length: Math.min(scale.maxRows, parsed.terms.length) }, (_, index) => index + 1);

    for (const rowCount of rowCounts) {
      const partitions = rowCount === 0 ? [[]] : contiguousPartitions(parsed.terms, rowCount);
      for (const termLines of partitions) {
        const lineWidths = termLines.map(line => formulaLineWidth(line, termWidths, plusWidth));
        if (lineWidths.some(width => width > scale.shellWidth)) continue;
        const maxLineWidth = Math.max(0, ...lineWidths);
        const minLineWidth = Math.min(maxLineWidth, ...lineWidths);
        const orphanPenalty = rowCount > 1 && minLineWidth < maxLineWidth * 0.42 ? 90 : 0;
        const raggedness = rowCount > 1
          ? lineWidths.reduce((sum, width) => sum + ((maxLineWidth - width) / maxLineWidth) ** 2, 0) * 80
          : 0;

        for (const aspectId of aspectIds) {
          const aspect = ASPECTS[aspectId];
          if (!aspect) continue;
          const maxRowsForAspect = aspect.height <= 540 ? 2 : 3;
          if (rowCount > maxRowsForAspect) continue;
          const noteKey = `formula-note-${scale.id}-${scale.noteWidth}`;
          const noteHeight = measuredHeight(
            bboxes,
            noteKey,
            Math.max(1, Math.ceil(fallbackTextWidth(input.sentence, scale.noteSize) / scale.noteWidth)) * scale.noteSize * 1.3,
          );
          const noteLines = Math.max(1, Math.round(noteHeight / (scale.noteSize * 1.3)));
          if (noteLines > 2) continue;

          const expressionHeight = rowCount > 0
            ? rowCount * termHeight + Math.max(0, rowCount - 1) * scale.rowGap
            : 0;
          const groupHeight = resultHeight + 19
            + (rowCount > 0 ? scale.expressionGap + expressionHeight : 0)
            + scale.noteGap + noteHeight;
          const verticalFill = groupHeight / aspect.height;
          if (verticalFill < 0.4 || verticalFill > 0.72) continue;

          const targetFill = aspect.height <= 540 ? 0.48 : 0.52;
          const aspectPenalty = aspect.height <= 540 ? 0 : 18;
          const scalePenalty = scale.id === 'large' ? 0 : scale.id === 'medium' ? 18 : 36;
          const notePenalty = noteLines > 1 ? 4 : 0;
          const score = Math.abs(verticalFill - targetFill) * 180
            + aspectPenalty + scalePenalty + notePenalty + orphanPenalty + raggedness;
          candidates.push({
            variant: 'editorial-equation',
            density: aspect.height <= 540 ? 'compact' : 'standard',
            aspect: aspectId,
            result: parsed.result,
            relation: parsed.relation,
            terms: parsed.terms,
            termLines,
            formulaRows: rowCount,
            noteLines,
            groupHeight: Math.round(groupHeight),
            verticalFill: Math.round(verticalFill * 1000) / 1000,
            score,
            ...scale,
          });
        }
      }
    }
  }
  return candidates.sort((a, b) => a.score - b.score);
}

function analyzeFormulaCardContent(input, bboxes = null) {
  const formulaWeight = visualTextLength(input.formula);
  const sentenceWeight = visualTextLength(input.sentence);
  const candidates = formulaCardCandidates(input, bboxes);
  if (candidates.length === 0) {
    throw new Error('article_diagram_formula_too_dense: no readable Editorial Equation candidate fits. Shorten the formula or sentence instead of shrinking the type.');
  }
  return {
    ...candidates[0],
    formulaWeight,
    sentenceWeight,
  };
}

function outputPathWithSuffix(outputHtmlPath, suffix) {
  const parsed = path.parse(outputHtmlPath);
  return path.join(parsed.dir, `${parsed.name}_${suffix}${parsed.ext || '.html'}`);
}

function structureNodes(input) {
  return Array.isArray(input.structure?.nodes) ? input.structure.nodes.slice(0, 6) : [];
}

function structureRelations(input) {
  return Array.isArray(input.structure?.relations) ? input.structure.relations.slice(0, 6) : [];
}

function relationLabelFor(input, id) {
  return structureNodes(input).find(node => node.id === id)?.label || id;
}

function compressionText(input) {
  const nodes = structureNodes(input);
  const relations = structureRelations(input);
  return [
    input.title,
    input.subtitle,
    input.formula,
    input.sentence,
    input.caption,
    ...nodes.flatMap(node => [node.label, node.note]),
    ...relations.map(relation => relation.label),
  ].filter(Boolean).join(' ').toLowerCase();
}

function compressionStructureKind(input) {
  const nodes = structureNodes(input);
  const relations = structureRelations(input);
  const text = compressionText(input);
  const boundaryPattern = /boundary|inside|outside|guard|permission|trust|sandbox|writer|write|control|isolation|isolate|权限|边界|内外|写入|主线|旁路|隔离|受控|信任|闸门/;
  const chainPattern = /sequence|loop|pipeline|flow|step|cause|next|order|顺序|流程|链路|因果|循环|下一轮|回写/;

  if (boundaryPattern.test(text)) return 'boundary';
  if (chainPattern.test(text) || relations.length >= Math.max(2, nodes.length - 1)) return 'chain';
  if (nodes.length <= 3) return 'triad';
  return 'matrix';
}

function compressionLabels(input) {
  const cjkPattern = /[\u3400-\u9fff]/;
  const text = compressionText(input);
  if (cjkPattern.test(text)) {
    return {
      formula: '公式',
      sentence: '一句话',
      structure: '结构',
    };
  }
  return {
    formula: 'FORMULA',
    sentence: 'ONE SENTENCE',
    structure: 'STRUCTURE',
  };
}

function renderCompressionFormula(analysis) {
  const rows = analysis.formulaRows > 0 ? analysis.termLines.map((line, rowIndex) => {
    const terms = line.map((term, termIndex) => `
      ${termIndex > 0 ? '<span class="formula-plus">+</span>' : ''}
      <span class="formula-term">${escapeHtml(term)}</span>
    `).join('');
    const operator = rowIndex === 0 ? analysis.relation : '+';
    return `
      <div class="formula-row" data-formula-row="true">
        <span class="formula-operator">${escapeHtml(operator)}</span>
        <div class="formula-terms">${terms}</div>
      </div>
    `;
  }).join('\n') : '';

  return `
    <h1 class="formula-result-major">${escapeHtml(analysis.result)}</h1>
    <div class="formula-rule"></div>
    ${rows ? `<div class="formula-expression">${rows}</div>` : ''}
  `;
}

function renderCompressionSummary(input, layoutPlan = null) {
  const analysis = layoutPlan || analyzeFormulaCardContent(input);
  return `
    <section class="diagram-stage formula-card-plate">
      <div class="formula-card-body formula-layout-editorial-equation formula-density-${analysis.density}" data-formula-card="true" data-formula-scale="${analysis.id}" data-formula-rows="${analysis.formulaRows}" data-note-lines="${analysis.noteLines}">
        ${renderCompressionFormula(analysis)}
        <p class="formula-card-deck" data-formula-note="true">${escapeHtml(input.sentence || '')}</p>
      </div>
    </section>
  `;
}

function renderCompressionStructure(input) {
  const labels = compressionLabels(input);
  const { kind, structureCols, nodeHtml, relationHtml } = compressionStructureParts(input);

  return `
    <section class="diagram-stage compression-plate structure-plate structure-${kind}" style="--structure-count:${structureNodes(input).length}; --structure-cols:${structureCols};">
      <div class="plate-label">${escapeHtml(labels.structure)}</div>
      <div class="structure-map">
        ${nodeHtml}
      </div>
      <div class="structure-relations">
        ${relationHtml}
      </div>
    </section>
  `;
}

function compressionStructureParts(input) {
  const nodes = structureNodes(input);
  const relations = structureRelations(input);
  const kind = compressionStructureKind(input);
  const structureCols = kind === 'chain'
    ? Math.max(2, Math.min(4, nodes.length))
    : kind === 'triad'
      ? Math.max(2, Math.min(3, nodes.length))
      : 2;
  const relationHtml = relations.length > 0
    ? relations.map(relation => `
        <div class="structure-relation">
          <span>${escapeHtml(truncate(relationLabelFor(input, relation.from), 18))}</span>
          <b>${escapeHtml(truncate(relation.label || 'leads to', 18))}</b>
          <span>${escapeHtml(truncate(relationLabelFor(input, relation.to), 18))}</span>
        </div>
      `).join('\n')
    : `<div class="structure-relation structure-relation-muted">
        <span>${escapeHtml(truncate(nodes[0]?.label || 'A', 18))}</span>
        <b>structures</b>
        <span>${escapeHtml(truncate(nodes[1]?.label || 'B', 18))}</span>
        </div>`;

  const nodeHtml = nodes.map((node, index) => `
    <div class="structure-node" data-index="${String(index + 1).padStart(2, '0')}" data-kind="${kind}">
      <strong>${escapeHtml(truncate(node.label, 28))}</strong>
      ${node.note ? `<p class="node-caption">${escapeHtml(truncate(node.note, 48))}</p>` : ''}
    </div>
  `).join('\n');

  return { kind, structureCols, nodeHtml, relationHtml };
}

function renderCompressionFigureSheet(input) {
  const { kind, structureCols, nodeHtml, relationHtml } = compressionStructureParts(input);
  return `
    <section class="diagram-stage figure-sheet figure-${kind}" style="--structure-count:${structureNodes(input).length}; --structure-cols:${structureCols};">
      <div class="argument-strip">
        <div class="argument-formula">
          ${renderCompressionFormula(input.formula)}
        </div>
        <div class="argument-sentence">${escapeHtml(truncate(input.sentence || '', 68))}</div>
      </div>
      <div class="figure-structure">
        <div class="structure-map">
          ${nodeHtml}
        </div>
        <div class="structure-relations">
          ${relationHtml}
        </div>
      </div>
    </section>
  `;
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

function visibleLinkLabels(links, input = {}) {
  const options = articleDiagramOptions(input);
  if (options.hideLinkLabels) return [];
  const maxLabels = Number.isFinite(options.linkLabelLimit)
    ? Math.max(0, Math.min(4, Math.floor(options.linkLabelLimit)))
    : 4;
  const labelCounts = new Map();
  for (const link of links) {
    const label = String(link.label || '').trim();
    if (!label) continue;
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
  }

  return links
    .map((link, index) => ({ link, index, label: String(link.label || '').trim() }))
    .filter(item => item.label && labelCounts.get(item.label) === 1)
    .slice(0, maxLabels);
}

function linkLabelPosition(x1, y1, x2, y2, index) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  // Perpendicular offset grows with link index so 4-5 node layouts (where
  // multiple labels cluster near node bbox edges) push labels clear of the
  // connector line and the node rectangles. 2.4 was too tight for nodes
  // with notes; 5 gives ~24px / ~48px of clearance on body-3-2 stage.
  const offset = (index % 2 === 0 ? 1 : -1) * 5;
  const x = x1 + dx * 0.5 + (-dy / length) * offset;
  const y = y1 + dy * 0.5 + (dx / length) * offset;
  return [
    Math.min(92, Math.max(8, x)),
    Math.min(90, Math.max(10, y)),
  ];
}

function rectsOverlap(a, b, pad = 0) {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

function linkLabelRectInStage(x, y, label, stage) {
  const centerXPct = x;
  const centerYPct = y;
  const widthPx = Math.max(62, Math.min(210, 26 + visualTextLength(label) * 15));
  const heightPx = 34;
  const halfWPct = ((widthPx / stage.width) * 100) / 2;
  const halfHPct = ((heightPx / stage.height) * 100) / 2;
  return {
    left: centerXPct - halfWPct,
    right: centerXPct + halfWPct,
    top: centerYPct - halfHPct,
    bottom: centerYPct + halfHPct,
  };
}

function linkLabelCandidates(x1, y1, x2, y2, index, hubBias = 'none') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const tValues = hubBias === 'from'
    ? [0.72, 0.62, 0.82, 0.5, 0.42, 0.58, 0.34, 0.66]
    : hubBias === 'to'
      ? [0.28, 0.38, 0.18, 0.5, 0.58, 0.42, 0.66, 0.34]
      : [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74];
  const offsets = [7, -7, 11, -11, 15, -15, 4, -4, 0];
  const preferredSign = index % 2 === 0 ? 1 : -1;
  const candidates = [];

  for (const t of tValues) {
    for (const offset of offsets.map(value => value * preferredSign)) {
      candidates.push([
        Math.min(94, Math.max(6, x1 + dx * t + normalX * offset)),
        Math.min(92, Math.max(8, y1 + dy * t + normalY * offset)),
      ]);
    }
  }

  return candidates;
}

function placeConceptLinkLabels(labelItems, positionsById) {
  const meta = positionsById.layoutMeta;
  if (!meta) {
    return labelItems.map(({ link, index, label }) => {
      const [x1, y1] = positionsById.get(link.from);
      const [x2, y2] = positionsById.get(link.to);
      const [x, y] = linkLabelPosition(x1, y1, x2, y2, index);
      return { link, index, label, x, y };
    });
  }

  const placed = [];
  const placedRects = [];
  const blockers = meta.nodeRects || [];
  const endpointCounts = new Map();
  for (const item of labelItems) {
    endpointCounts.set(item.link.from, (endpointCounts.get(item.link.from) || 0) + 1);
    endpointCounts.set(item.link.to, (endpointCounts.get(item.link.to) || 0) + 1);
  }
  const hasHub = [...endpointCounts.values()].some(count => count >= 3);
  const itemsToPlace = hasHub ? labelItems.slice(0, 2) : labelItems;

  for (const item of itemsToPlace) {
    const { link, index, label } = item;
    const [x1, y1] = positionsById.get(link.from);
    const [x2, y2] = positionsById.get(link.to);
    const hubBias = endpointCounts.get(link.from) >= 3
      ? 'from'
      : endpointCounts.get(link.to) >= 3
        ? 'to'
        : 'none';

    for (const [x, y] of linkLabelCandidates(x1, y1, x2, y2, index, hubBias)) {
      const rect = linkLabelRectInStage(x, y, label, meta.stage);
      const insideStage = rect.left >= 2 && rect.right <= 98 && rect.top >= 3 && rect.bottom <= 97;
      if (!insideStage) continue;
      if (blockers.some(blocker => rectsOverlap(rect, blocker, 3))) continue;
      if (placedRects.some(other => rectsOverlap(rect, other, 2.2))) continue;
      placed.push({ ...item, x, y });
      placedRects.push(rect);
      break;
    }
  }

  return placed;
}

function buildConceptMapHtml(input, positionsById) {
  const nodes = input.nodes.slice(0, 5);
  const links = linkList(input, positionsById).filter(link => positionsById.has(link.from) && positionsById.has(link.to)).slice(0, 6);

  const lineSvg = links.map((link) => {
    const [x1, y1] = positionsById.get(link.from);
    const [x2, y2] = positionsById.get(link.to);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('\n');

  const linkLabelHtml = placeConceptLinkLabels(visibleLinkLabels(links, input), positionsById).map(({ label, x, y }) => {
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
    positionsById.layoutMeta = positions.__layoutMeta__;
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

function buildBandsHtml(input, nodePositions, zones) {
  // 3+ zone boundary-model: horizontal indented bands instead of centered
  // nested boxes. Each zone = one band. Indent expresses nesting level.
  // Band heights come from layoutBands via nodePositions.__bandGeometries__
  // so visual bands and node positions stay in sync.
  const bands = (nodePositions && nodePositions.__bandGeometries__) || [];

  const zoneBandHtml = zones.map((zone, zi) => {
    const g = bands[zi] || {
      topPct: zi * 34,
      heightPct: 32,
      indentPx: 36 * zi,
    };
    return `
      <div class="boundary-band" data-level="${zi}" style="left:${g.indentPx}px; right:${g.indentPx}px; top:${g.topPct}%; height:${g.heightPct}%;">
        <div class="band-header">
          <strong>${escapeHtml(truncate(zone.label, 28))}</strong>
          ${zone.description ? `<span class="band-caption">${escapeHtml(truncate(zone.description, 42))}</span>` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  const nodes = (input.nodes || []).slice(0, 6);
  const nodeHtml = nodes.map((node) => {
    let left = 50, top = 50;
    if (nodePositions && nodePositions[node.id]) {
      [left, top] = nodePositions[node.id];
    }
    return `
      <div class="boundary-node band-node" style="left:${left}%; top:${top}%;">
        <strong>${nodeTitle(node)}</strong>
        ${nodeNote(node)}
      </div>
    `;
  }).join('\n');

  return `
    <section class="diagram-stage boundary-model boundary-bands">
      ${zoneBandHtml}
      ${nodeHtml}
    </section>
  `;
}

function buildBoundaryModelHtml(input, nodePositions) {
  const zones = input.zones.slice(0, 4);

  // 3+ zones: switch to indented bands paradigm. Centered nested boxes
  // mathematically cannot fit 218px nodes in all zone rings on a 960px
  // stage (4 × 218 = 872px consumed by rings alone, leaving 88px for the
  // innermost zone). Bands avoid the ring constraint entirely.
  if (zones.length >= 3) {
    return buildBandsHtml(input, nodePositions, zones);
  }

  const nodes = input.nodes.slice(0, 6);
  const boxes = BOUNDARY_ZONE_BOXES[zones.length];
  const zoneIndex = new Map(zones.map((zone, i) => [zone.id, i]));

  const zoneHtml = zones.map((zone, i) => {
    const box = boxes[i];
    return `
      <div class="boundary-zone zone-${i + 1}" style="left:${box.left}%; top:${box.top}%; width:${box.width}%; height:${box.height}%;">
        <strong>${escapeHtml(truncate(zone.label, 28))}</strong>
        ${zone.description ? `<span class="zone-caption">${escapeHtml(truncate(zone.description, 42))}</span>` : ''}
      </div>
    `;
  }).join('\n');

  // Legacy slot fallback (used when positions are not provided, e.g. if
  // measure pass is skipped). Same logic as before: count nodes per zone,
  // pull from BOUNDARY_NODE_SLOTS[zIndex].
  const zoneCounts = new Map();
  const legacySlotFor = (node) => {
    const zIndex = zoneIndex.get(node.zone);
    const order = zoneCounts.get(node.zone) || 0;
    zoneCounts.set(node.zone, order + 1);
    const slotPool = BOUNDARY_NODE_SLOTS[zIndex] || [[50, 52]];
    return slotPool[Math.min(order, slotPool.length - 1)];
  };

  const nodeHtml = nodes.map((node) => {
    let left, top;
    if (nodePositions && nodePositions[node.id]) {
      [left, top] = nodePositions[node.id];
    } else {
      [left, top] = legacySlotFor(node);
    }
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

function renderBoundaryModel(input, positions) {
  return buildBoundaryModelHtml(input, positions);
}

function renderDiagram(input, positions) {
  if (input.family === 'concept-map') return renderConceptMap(input, positions);
  if (input.family === 'process-flow') return renderProcessFlow(input);
  if (input.family === 'boundary-model') return renderBoundaryModel(input, positions);
  throw new Error(`Unknown article-diagram family: ${input.family}`);
}

function renderCompressionDiagram(input, view, layoutPlan = null) {
  if (view === 'summary') return renderCompressionSummary(input, layoutPlan);
  if (view === 'structure') return renderCompressionStructure(input);
  return renderCompressionFigureSheet(input);
}

function baseCss(input, design, aspect, formulaLayoutPlan = null) {
  const isTall = aspect.height > 720;
  const options = articleDiagramOptions(input);
  const compactLevel = boundaryCompactLevel(input);
  const captionCompact = Boolean(options.captionCompact);
  const titleWeight = visualTextLength(input.title);
  const titleFontSize = titleWeight > 34
    ? (isTall ? 44 : 42)
    : titleWeight > 22
      ? (isTall ? 48 : 46)
      : (isTall ? 52 : 50);
  const titleMaxWidth = titleWeight > 34 ? 650 : 700;
  const headerColumns = input.subtitle
    ? 'minmax(0, 1fr) minmax(250px, 300px)'
    : 'minmax(0, 1fr)';
  const captionFontSize = captionCompact ? 22 : (isTall ? 24 : 23);
  const captionMaxWidth = captionCompact ? 956 : 920;
  const captionTextWrap = captionCompact ? 'wrap' : 'pretty';
  const boundaryNodeWidthPx = boundaryNodeWidth(input);
  const bandCaptionFontSize = compactLevel >= 2 ? 21 : compactLevel >= 1 ? 22 : 23;
  const bandCaptionLineHeight = compactLevel >= 2 ? 1.08 : compactLevel >= 1 ? 1.1 : 1.12;
  const bandCaptionMaxWidth = compactLevel >= 2 ? 270 : compactLevel >= 1 ? 285 : 300;
  const bandNodeMinHeight = compactLevel >= 2 ? 64 : compactLevel >= 1 ? 68 : 72;
  const bandNodePadding = compactLevel >= 2 ? '7px 14px' : compactLevel >= 1 ? '8px 15px' : '10px 16px';
  const bandNodeGap = compactLevel >= 2 ? 2 : compactLevel >= 1 ? 3 : 4;
  const bandNodeTitleSize = compactLevel >= 2 ? 26 : compactLevel >= 1 ? 27 : 28;
  const bandNodeNoteSize = compactLevel >= 2 ? 21 : compactLevel >= 1 ? 22 : 23;
  const processStepCount = (input.nodes || []).slice(0, 6).length;
  const denseProcessFlow = input.family === 'process-flow' && processStepCount >= 5;
  const formulaPlan = isCompressionPack(input) ? formulaLayoutPlan : null;
  const formulaCardCompact = isCompressionPack(input) && aspect.height <= 540;
  const formulaCardPadding = aspect.height <= 540 ? '54px 72px' : '54px 72px';
  const formulaTermSize = formulaCardCompact ? 50 : 58;
  const formulaResultSize = formulaCardCompact ? 56 : 66;
  const formulaSentenceSize = 36;
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
      --paper-shadow: color-mix(in srgb, var(--ink) 5%, transparent);
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
      font-family: "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink);
    }

    .article-diagram-compression-pack {
      padding: ${formulaCardCompact ? '36px 54px 30px' : '48px 62px 36px'};
      grid-template-rows: minmax(0, 1fr);
    }

    .diagram-header {
      display: grid;
      grid-template-columns: ${headerColumns};
      gap: ${isTall ? '30px' : '28px'};
      align-items: center;
    }

    .diagram-header h1 {
      font-family: "DM Serif Display", "XiangcuiDengcusong", serif;
      max-width: ${titleMaxWidth}px;
      font-size: ${titleFontSize}px;
      line-height: 1.04;
      letter-spacing: 0;
      color: var(--ink);
      text-wrap: balance;
    }

    .diagram-header p {
      justify-self: end;
      max-width: 300px;
      font: 400 24px/1.28 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      text-wrap: balance;
    }

    .diagram-stage {
      position: relative;
      min-height: 0;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--surface-1) 74%, var(--bg)), color-mix(in srgb, var(--surface-2) 24%, var(--bg)));
      overflow: hidden;
    }

    .diagram-stage::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.28;
      background:
        radial-gradient(circle at 22% 30%, color-mix(in srgb, var(--ink) 8%, transparent) 0 0.7px, transparent 1.4px),
        radial-gradient(circle at 72% 66%, color-mix(in srgb, var(--surface-1) 44%, transparent) 0 1px, transparent 1.6px);
      background-size: 20px 20px, 26px 26px;
      mix-blend-mode: multiply;
      z-index: 0;
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
      width: 100%;
      max-width: ${captionMaxWidth}px;
      justify-self: center;
      margin: 0 auto;
      font: 400 ${captionFontSize + 1}px/1.26 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      text-wrap: ${captionTextWrap};
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
      stroke: color-mix(in srgb, var(--accent) 46%, var(--hairline));
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
      font: 500 23px/1 "XiangcuiDengcusong", "DM Sans", serif;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .diagram-node {
      position: absolute;
      width: 220px;
      min-height: 104px;
      transform: translate(-50%, -50%);
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 86%, var(--bg));
      padding: 20px 22px;
      display: grid;
      gap: 7px;
      align-content: center;
      z-index: 2;
    }

    .diagram-node strong,
    .process-step strong,
    .boundary-node strong {
      font: 500 31px/1.05 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink);
      letter-spacing: 0;
      text-wrap: balance;
    }

    .diagram-node p,
    .process-step p,
    .boundary-node p {
      font: 400 25px/1.24 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      letter-spacing: 0;
      text-wrap: balance;
    }

    .process-flow {
      display: grid;
      grid-template-columns: repeat(var(--step-count), minmax(0, 1fr));
      gap: ${denseProcessFlow ? '14px' : '18px'};
      align-items: center;
      padding: ${denseProcessFlow ? '58px 36px' : '64px 48px'};
    }

    .process-rail {
      position: absolute;
      left: 88px;
      right: 88px;
      top: 50%;
      height: 2px;
      background: color-mix(in srgb, var(--accent) 42%, var(--hairline));
      transform: translateY(-1px);
    }

    .process-step {
      position: relative;
      min-height: 210px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 84%, var(--bg));
      padding: ${denseProcessFlow ? '24px 16px 20px' : '26px 20px 22px'};
      display: grid;
      align-content: start;
      gap: ${denseProcessFlow ? '10px' : '12px'};
      z-index: 2;
    }

    .step-index {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--surface-2) 62%, var(--bg));
      color: var(--accent);
      font: 700 22px/1 "JetBrains Mono", monospace;
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--hairline));
    }

    .boundary-model {
      min-height: 0;
    }

    .boundary-zone {
      position: absolute;
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--hairline));
      border-radius: calc(var(--radius) + 2px);
      background: color-mix(in srgb, var(--surface-1) 24%, transparent);
      padding: 16px 18px;
    }

    .boundary-zone strong {
      display: block;
      font: 500 27px/1 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--accent);
      letter-spacing: 0;
    }

    .boundary-zone span {
      display: block;
      margin-top: 6px;
      max-width: 320px;
      font: 400 24px/1.18 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
    }

    .boundary-node {
      position: absolute;
      width: ${boundaryNodeWidthPx}px;
      min-height: 86px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface-1) 88%, var(--bg));
      padding: 17px 18px;
      display: grid;
      gap: 6px;
      align-content: center;
      z-index: 3;
      transform: translate(-50%, -50%);
    }

    .boundary-band {
      position: absolute;
      border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--hairline));
      border-left: 2px solid color-mix(in srgb, var(--accent) 38%, var(--hairline));
      border-radius: calc(var(--radius) + 2px);
      background: color-mix(in srgb, var(--surface-1) 18%, transparent);
      padding: 14px 18px;
    }

    .boundary-band[data-level="1"] {
      background: color-mix(in srgb, var(--surface-1) 30%, transparent);
    }

    .boundary-band[data-level="2"] {
      background: color-mix(in srgb, var(--surface-1) 42%, transparent);
    }

    .band-header strong {
      display: block;
      font: 500 27px/1 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--accent);
      letter-spacing: 0;
    }

    .band-caption {
      display: block;
      margin-top: 5px;
      max-width: ${bandCaptionMaxWidth}px;
      font: 400 ${bandCaptionFontSize}px/${bandCaptionLineHeight} "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .band-node {
      z-index: 3;
      min-height: ${bandNodeMinHeight}px;
      padding: ${bandNodePadding};
      gap: ${bandNodeGap}px;
    }

    .band-node strong {
      font: 500 ${bandNodeTitleSize}px/1.02 "XiangcuiDengcusong", "DM Sans", serif;
    }

    .band-node p {
      font: 500 ${bandNodeNoteSize}px/1.16 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    }

    .article-diagram-compression-pack .diagram-stage {
      border: 0;
      background: transparent;
      box-shadow: none;
      overflow: visible;
    }

    .article-diagram-compression-pack .diagram-stage::before,
    .article-diagram-compression-pack .diagram-stage::after {
      content: none;
    }

    .formula-card-plate {
      min-height: 0;
      display: grid;
      align-items: center;
      justify-items: center;
      padding: ${formulaCardPadding};
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--surface-1) 62%, transparent), color-mix(in srgb, var(--surface-2) 18%, transparent)),
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent 44%);
    }

    .formula-card-body {
      position: relative;
      z-index: 1;
      width: min(100%, ${formulaCardCompact ? '760px' : '900px'});
      min-width: 0;
      display: grid;
      gap: ${formulaCardCompact ? '24px' : '28px'};
      justify-items: start;
    }

    .article-diagram-compression-pack {
      padding: 0;
    }

    .formula-card-plate {
      padding: ${formulaCardPadding};
      background:
        repeating-linear-gradient(0deg, color-mix(in srgb, var(--ink) 1.2%, transparent) 0 1px, transparent 1px 4px),
        linear-gradient(135deg, color-mix(in srgb, var(--surface-1) 72%, var(--bg)), var(--bg));
    }

    .formula-layout-editorial-equation {
      width: min(100%, ${formulaPlan?.shellWidth || 860}px);
      display: grid;
      gap: 0;
      justify-items: start;
    }

    .formula-layout-editorial-equation .formula-result-major {
      margin: 0;
      max-width: 100%;
      color: var(--ink);
      font: 500 ${formulaPlan?.resultSize || 66}px/1.02 "XiangcuiDengcusong", "DM Serif Display", serif;
      letter-spacing: 0;
      text-wrap: balance;
      overflow-wrap: normal;
    }

    .formula-rule {
      width: 72px;
      height: 2px;
      margin-top: 17px;
      background: var(--accent);
      opacity: 0.82;
    }

    .formula-expression {
      width: 100%;
      margin-top: ${formulaPlan?.expressionGap || 23}px;
      display: grid;
      gap: ${formulaPlan?.rowGap || 10}px;
    }

    .formula-row {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: 14px;
      align-items: baseline;
    }

    .formula-operator,
    .formula-plus {
      color: var(--accent);
      font-family: "JetBrains Mono", Consolas, monospace;
      font-weight: 400;
    }

    .formula-operator {
      font-size: ${(formulaPlan?.termSize || 38) * 0.88}px;
      line-height: 1;
      text-align: center;
    }

    .formula-layout-editorial-equation .formula-terms {
      min-width: 0;
      display: flex;
      flex-wrap: nowrap;
      align-items: baseline;
      gap: 13px;
    }

    .formula-layout-editorial-equation .formula-term {
      display: inline;
      width: auto;
      max-width: none;
      min-height: 0;
      padding: 0;
      border: 0;
      color: var(--ink);
      font: 500 ${formulaPlan?.termSize || 38}px/1.12 "XiangcuiDengcusong", "DM Serif Display", serif;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .formula-layout-editorial-equation .formula-plus {
      font-size: ${(formulaPlan?.termSize || 38) * 0.74}px;
      line-height: 1;
      transform: none;
    }

    .formula-layout-editorial-equation .formula-card-deck {
      width: ${formulaPlan?.noteWidth || 730}px;
      max-width: 100%;
      margin: ${formulaPlan?.noteGap || 34}px 0 0;
      padding-left: 17px;
      border-left: 2px solid color-mix(in srgb, var(--accent) 58%, var(--hairline));
      color: var(--ink-light);
      font: 400 ${formulaPlan?.noteSize || 28}px/1.3 "XiangcuiDengcusong", "DM Sans", serif;
      letter-spacing: 0;
      text-wrap: pretty;
      overflow-wrap: normal;
    }

    .compression-plate {
      position: relative;
      display: grid;
      min-height: 0;
      padding: ${isTall ? '50px 58px 46px' : '42px 54px 38px'};
      border-top: 1px solid color-mix(in srgb, var(--hairline) 78%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--hairline) 66%, transparent);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--surface-1) 58%, transparent), color-mix(in srgb, var(--surface-2) 24%, transparent)),
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 9%, transparent), transparent 42%);
    }

    .plate-label {
      position: relative;
      z-index: 1;
      color: color-mix(in srgb, var(--accent) 74%, var(--ink-light));
      font: 700 24px/1 "JetBrains Mono", monospace;
      letter-spacing: 0;
    }

    .formula-plate {
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: ${isTall ? '24px' : '20px'};
    }

    .formula-field {
      position: relative;
      z-index: 1;
      align-self: center;
      max-width: 1120px;
      padding: ${isTall ? '30px 0 34px' : '26px 0 30px'};
      border-top: 1px solid color-mix(in srgb, var(--hairline) 58%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--hairline) 72%, transparent);
    }

    .formula-line {
      max-width: 1040px;
      font: 500 ${isTall ? 52 : 46}px/1.14 "XiangcuiDengcusong", "DM Serif Display", serif;
      color: var(--ink);
      text-wrap: balance;
      overflow-wrap: anywhere;
    }

    .formula-equation {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) auto minmax(0, 0.95fr);
      gap: ${isTall ? '26px' : '22px'};
      align-items: center;
    }

    .formula-terms {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .formula-term {
      display: inline-flex;
      align-items: center;
      min-height: 54px;
      border-bottom: 1px solid color-mix(in srgb, var(--accent) 42%, var(--hairline));
      padding: 0 4px 8px;
      color: var(--ink);
      font: 500 ${isTall ? 42 : 38}px/1.06 "XiangcuiDengcusong", "DM Serif Display", serif;
      white-space: nowrap;
    }

    .formula-arrow {
      color: var(--accent);
      font: 500 ${isTall ? 44 : 40}px/1 "XiangcuiDengcusong", "DM Sans", serif;
    }

    .formula-result {
      color: var(--ink);
      font: 500 ${isTall ? 48 : 43}px/1.08 "XiangcuiDengcusong", "DM Serif Display", serif;
      text-wrap: balance;
    }

    .figure-sheet {
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: ${isTall ? '22px' : '18px'};
      padding: ${isTall ? '28px 42px 34px' : '24px 40px 30px'};
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--surface-1) 52%, transparent), color-mix(in srgb, var(--surface-2) 18%, transparent));
    }

    .argument-strip {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(300px, 0.82fr);
      gap: ${isTall ? '26px' : '22px'};
      align-items: center;
      padding: ${isTall ? '15px 0 17px' : '13px 0 15px'};
      border-top: 1px solid color-mix(in srgb, var(--hairline) 58%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--hairline) 70%, transparent);
    }

    .argument-formula {
      min-width: 0;
    }

    .figure-sheet .formula-equation {
      grid-template-columns: minmax(0, 1.18fr) auto minmax(0, 0.82fr);
      gap: 14px;
    }

    .figure-sheet .formula-terms {
      gap: 8px 10px;
    }

    .figure-sheet .formula-term {
      min-height: 44px;
      padding: 0 2px 6px;
      font-size: 36px;
      line-height: 1.06;
    }

    .figure-sheet .formula-arrow {
      font-size: 36px;
    }

    .figure-sheet .formula-result,
    .figure-sheet .formula-line {
      font-size: 36px;
      line-height: 1.12;
    }

    .argument-sentence {
      color: var(--ink-light);
      font: 400 ${isTall ? 37 : 36}px/1.16 "XiangcuiDengcusong", "DM Sans", serif;
      text-wrap: balance;
    }

    .sentence-block {
      position: relative;
      z-index: 1;
      max-width: 1060px;
      display: grid;
      grid-template-columns: 118px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    .sentence-kicker {
      color: color-mix(in srgb, var(--accent) 74%, var(--ink-light));
      font: 700 25px/1.08 "XiangcuiDengcusong", "DM Sans", serif;
      letter-spacing: 0;
    }

    .sentence-block p {
      margin: 0;
      font: 400 ${isTall ? 38 : 36}px/1.18 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      text-wrap: balance;
    }

    .structure-plate {
      grid-template-rows: auto auto auto;
      align-content: start;
      gap: ${isTall ? '24px' : '20px'};
    }

    .structure-map {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(var(--structure-cols), minmax(0, 1fr));
      gap: ${isTall ? '18px' : '16px'};
      align-content: center;
    }

    .structure-map::before {
      content: "";
      position: absolute;
      inset: 50% 22px auto;
      height: 1px;
      background: color-mix(in srgb, var(--accent) 34%, var(--hairline));
      z-index: 0;
    }

    .structure-triad .structure-map::before,
    .structure-matrix .structure-map::before {
      inset: auto 28px 52px;
    }

    .structure-boundary .structure-map {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: stretch;
    }

    .structure-boundary .structure-map::before {
      inset: 18px 50% 18px auto;
      width: 1px;
      height: auto;
    }

    .structure-node {
      position: relative;
      z-index: 1;
      min-height: ${isTall ? 164 : 148}px;
      border: 1px solid color-mix(in srgb, var(--hairline) 86%, transparent);
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in srgb, var(--surface-1) 84%, var(--bg));
      padding: 19px 22px 17px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      align-content: start;
      gap: 10px;
    }

    .structure-node::before {
      content: attr(data-index);
      width: 44px;
      height: 32px;
      display: grid;
      place-items: center;
      border-bottom: 1px solid color-mix(in srgb, var(--accent) 48%, var(--hairline));
      color: var(--accent);
      font: 700 23px/1 "JetBrains Mono", monospace;
    }

    .structure-node strong {
      font: 500 ${isTall ? 31 : 29}px/1.06 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink);
      text-wrap: balance;
    }

    .structure-node p {
      margin: 0;
      font: 400 ${isTall ? 25 : 24}px/1.2 "XiangcuiDengcusong", "DM Sans", serif;
      color: var(--ink-light);
      text-wrap: balance;
    }

    .structure-chain .structure-node {
      min-height: ${isTall ? 180 : 166}px;
    }

    .structure-boundary .structure-node {
      min-height: ${isTall ? 138 : 126}px;
      padding: ${isTall ? '17px 20px 15px' : '15px 18px 14px'};
    }

    .structure-boundary .structure-node:nth-child(odd) {
      margin-right: ${isTall ? '16px' : '12px'};
    }

    .structure-boundary .structure-node:nth-child(even) {
      margin-left: ${isTall ? '16px' : '12px'};
    }

    .structure-boundary .structure-node strong {
      font-size: ${isTall ? 30 : 28}px;
    }

    .figure-structure {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: ${isTall ? '14px' : '12px'};
    }

    .figure-sheet .structure-map {
      min-height: 0;
      align-content: stretch;
    }

    .figure-sheet .structure-map::before {
      opacity: 0.72;
    }

    .figure-boundary .structure-map {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .figure-boundary .structure-map::before {
      inset: 18px 50% 18px auto;
      width: 1px;
      height: auto;
    }

    .figure-sheet .structure-node {
      min-height: 0;
      padding: ${isTall ? '18px 20px 16px' : '16px 18px 15px'};
      grid-template-rows: auto auto;
      align-content: center;
      gap: ${isTall ? '9px' : '8px'};
    }

    .figure-sheet:not(.figure-chain) .structure-node::before {
      content: none;
      display: none;
    }

    .figure-sheet .structure-node strong {
      font-size: ${isTall ? 30 : 28}px;
      line-height: 1.08;
    }

    .figure-sheet .structure-node p {
      font-size: ${isTall ? 24 : 23}px;
      line-height: 1.18;
    }

    .figure-sheet .structure-relations {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 12px;
      border-top: 1px solid color-mix(in srgb, var(--hairline) 70%, transparent);
    }

    .figure-boundary .structure-relations,
    .figure-chain .structure-relations {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .structure-relations {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 12px;
    }

    .structure-chain .structure-relations,
    .structure-boundary .structure-relations {
      grid-template-columns: 1fr;
    }

    .structure-relation {
      min-height: 48px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-top: 1px solid color-mix(in srgb, var(--hairline) 78%, transparent);
      color: var(--ink-light);
      font: 400 24px/1.08 "XiangcuiDengcusong", "DM Sans", serif;
    }

    .structure-relation b {
      display: inline-grid;
      place-items: center;
      min-width: 82px;
      color: var(--accent);
      font: 500 24px/1 "XiangcuiDengcusong", "DM Sans", serif;
      white-space: nowrap;
    }

    .structure-relation b::before,
    .structure-relation b::after {
      content: "";
      display: inline-block;
      width: 18px;
      height: 1px;
      margin: 0 7px 5px;
      background: color-mix(in srgb, var(--accent) 42%, var(--hairline));
      vertical-align: middle;
    }

    .structure-relation span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .structure-relation span:first-child {
      text-align: right;
    }

    .figure-sheet .structure-relation {
      min-height: 42px;
      padding: 8px 8px;
      gap: 8px;
      font-size: 24px;
      line-height: 1.06;
    }

    .figure-sheet .structure-relation b {
      min-width: 58px;
      font-size: 24px;
    }

    .figure-sheet .structure-relation b::before,
    .figure-sheet .structure-relation b::after {
      width: 10px;
      margin: 0 5px 4px;
    }

    .structure-relation-muted {
      grid-column: 1 / -1;
      max-width: 640px;
      justify-self: center;
    }

    .compression-combined {
      min-height: 0;
      display: grid;
      grid-template-rows: 0.88fr 1.12fr;
      gap: 18px;
    }

    .compression-combined .diagram-stage {
      min-height: 0;
    }
  `;
}

function renderSingleHtml(input, outputHtmlPath, positions, compressionView = null) {
  const designName = input.design || 'stripe';
  const design = getDesign(designName);
  if (!design) throw new Error(`Design not found: ${input.design}`);

  const formulaLayoutPlan = isCompressionPack(input) && compressionView !== 'structure'
    ? (positions?.__formulaCardPlan__ || analyzeFormulaCardContent(input))
    : null;
  const aspectKey = isCompressionPack(input) && compressionView === 'structure' && !input.aspect
    ? 'body-3-2'
    : (formulaLayoutPlan?.aspect || defaultAspect(input));
  const aspect = ASPECTS[aspectKey];
  if (!aspect) throw new Error(`Unknown article-diagram aspect: ${aspectKey}`);

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const compressionPack = isCompressionPack(input);
  const logoUrl = !compressionPack && input.logo ? escapeHtml(pathToFileURL(path.resolve(input.logo)).href) : '';
  const brandName = !compressionPack && input.brand_name ? escapeHtml(input.brand_name) : '';
  const sourceLine = !compressionPack && input.source ? `<span class="info-source">${escapeHtml(input.source)}</span>` : '';
  const familyName = compressionPack ? 'compression-pack' : input.family;
  const bodyHtml = compressionPack
    ? renderCompressionDiagram(input, compressionView || 'summary', formulaLayoutPlan)
    : renderDiagram(input, positions);
  const headerHtml = compressionPack ? '' : renderHeader(input);
  const captionHtml = compressionPack ? '' : renderCaption(input);
  const contentHtml = `
    <article class="article-diagram article-diagram-${familyName}">
      ${headerHtml}
      ${bodyHtml}
      ${captionHtml}
    </article>
  `;
  const customCss = baseCss(input, design, aspect, formulaLayoutPlan);

  template = template.replaceAll('{{CUSTOM_CSS}}', customCss);
  template = template.replaceAll('{{CONTENT_HTML}}', contentHtml);
  template = template.replaceAll('{{SOURCE_LINE}}', sourceLine);
  template = template.replaceAll('{{LOGO}}', logoUrl);
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));
  template = template.replace(
    '<div class="page">',
    `<div class="page" data-card-mode="article-diagram" data-card-design="${escapeHtml(designName)}" data-diagram-family="${escapeHtml(familyName)}"${compressionView ? ` data-compression-view="${escapeHtml(compressionView)}"` : ''}>`,
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

function render(input, outputHtmlPath, positions) {
  if (!isCompressionPack(input)) {
    return renderSingleHtml(input, outputHtmlPath, positions);
  }

  const plan = compressionPlan(input);
  if (plan === 'split') {
    return [
      renderSingleHtml(input, outputPathWithSuffix(outputHtmlPath, 'summary'), positions, 'summary'),
      renderSingleHtml(input, outputPathWithSuffix(outputHtmlPath, 'structure'), positions, 'structure'),
    ];
  }
  if (plan === 'summary' || plan === 'structure') {
    return renderSingleHtml(input, outputHtmlPath, positions, plan);
  }

  return renderSingleHtml(input, outputHtmlPath, positions, 'summary');
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
// stage ≈ 960 × 599 before the optional source/brand colophon is present.
function stageBox(aspect, input = {}) {
  const colophonHeightPx = input.logo || input.brand_name || input.source ? 70 : 0;
  return {
    width: aspect.width - 120,
    height: aspect.height - 42 - 28 - 70 - 35 - 36 - colophonHeightPx,
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
  const stage = stageBox(aspect, input);
  const nodes = (input.nodes || []).slice(0, 5);
  const count = nodes.length;
  const anchors = CONCEPT_ANCHORS[count] || CONCEPT_ANCHORS[5];
  const margin = 4; // percent from stage edge, half a node can extend safely

  const positions = {};
  const nodeRects = [];
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

    const roundedCx = Math.round(cx * 10) / 10;
    const roundedCy = Math.round(cy * 10) / 10;
    positions[node.id] = [roundedCx, roundedCy];
    nodeRects.push({
      left: roundedCx - halfW,
      right: roundedCx + halfW,
      top: roundedCy - halfH,
      bottom: roundedCy + halfH,
    });
  }

  positions.__layoutMeta__ = { stage, nodeRects };
  return positions;
}

function renderFormulaMeasure(input, outputHtmlPath, design) {
  const parsed = parseFormulaCard(input);
  const fontBaseUrl = pathToFileURL(FONT_DIR).href;
  const scaleHtml = FORMULA_TYPE_SCALES.map(scale => {
    const termHtml = parsed.terms.map((term, index) => `
      <span class="measure-inline" data-measure-id="formula-term-${scale.id}-${index}" style="font-size:${scale.termSize}px;line-height:1.12;">${escapeHtml(term)}</span>
    `).join('\n');
    return `
      <section>
        <span class="measure-inline" data-measure-id="formula-result-${scale.id}" style="font-size:${scale.resultSize}px;line-height:1.02;">${escapeHtml(parsed.result)}</span>
        <span class="measure-symbol" data-measure-id="formula-plus-${scale.id}" style="font-size:${scale.termSize * 0.74}px;">+</span>
        ${termHtml}
        <p class="measure-note" data-measure-id="formula-note-${scale.id}-${scale.noteWidth}" style="width:${scale.noteWidth}px;font-size:${scale.noteSize}px;line-height:1.3;">${escapeHtml(input.sentence || '')}</p>
      </section>
    `;
  }).join('\n');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: 'XiangcuiDengcusong';
    src: url('${fontBaseUrl}/XiangcuiDengcusong.ttf') format('truetype');
    font-display: block;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; background: ${design.canvas}; }
  section { margin-bottom: 24px; }
  .measure-inline {
    visibility: hidden;
    display: inline-block;
    width: max-content;
    font-family: 'XiangcuiDengcusong', 'DM Serif Display', serif;
    font-weight: 500;
    white-space: nowrap;
  }
  .measure-symbol {
    visibility: hidden;
    display: inline-block;
    width: max-content;
    font-family: 'JetBrains Mono', Consolas, monospace;
    line-height: 1;
  }
  .measure-note {
    visibility: hidden;
    margin: 0;
    font-family: 'XiangcuiDengcusong', 'DM Sans', serif;
    font-weight: 400;
  }
</style></head><body>${scaleHtml}</body></html>`;

  fs.writeFileSync(outputHtmlPath, html, 'utf-8');
  return {
    htmlPath: outputHtmlPath,
    captureWidth: 1080,
    captureHeight: 1200,
    fullpage: false,
  };
}

function layoutFormulaCard(input, bboxes) {
  return { __formulaCardPlan__: analyzeFormulaCardContent(input, bboxes) };
}

function renderMeasure(input, outputHtmlPath) {
  const designName = input.design || 'stripe';
  const design = getDesign(designName);
  if (!design) throw new Error(`Design not found: ${input.design}`);

  if (isCompressionPack(input)) {
    if (compressionPlan(input) === 'structure') return null;
    return renderFormulaMeasure(input, outputHtmlPath, design);
  }

  // concept-map and boundary-model use two-pass measure-then-place.
  // process-flow is CSS grid (no absolute positioning) and stays single-pass.
  if (input.family !== 'concept-map' && input.family !== 'boundary-model') return null;

  const aspectKey = defaultAspect(input);
  const aspect = ASPECTS[aspectKey];
  if (!aspect) throw new Error(`Unknown article-diagram aspect: ${aspectKey}`);

  const fontBaseUrl = pathToFileURL(FONT_DIR).href;
  const nodes = (input.nodes || []).slice(0, 6);
  const boundaryZonesForMeasure = input.family === 'boundary-model'
    ? (input.zones || []).slice(0, 4)
    : [];
  const usesBoundaryBands = boundaryZonesForMeasure.length >= 3;
  const boundaryNodeWidthPx = boundaryNodeWidth(input);
  const compactLevel = boundaryCompactLevel(input);
  const bandCaptionFontSize = compactLevel >= 2 ? 21 : compactLevel >= 1 ? 22 : 23;
  const bandCaptionLineHeight = compactLevel >= 2 ? 1.08 : compactLevel >= 1 ? 1.1 : 1.12;
  const bandCaptionMaxWidth = compactLevel >= 2 ? 270 : compactLevel >= 1 ? 285 : 300;
  const bandNodeMinHeight = compactLevel >= 2 ? 64 : compactLevel >= 1 ? 68 : 72;
  const bandNodePadding = compactLevel >= 2 ? '7px 14px' : compactLevel >= 1 ? '8px 15px' : '10px 16px';
  const bandNodeGap = compactLevel >= 2 ? 2 : compactLevel >= 1 ? 3 : 4;
  const bandNodeTitleSize = compactLevel >= 2 ? 26 : compactLevel >= 1 ? 27 : 28;
  const bandNodeNoteSize = compactLevel >= 2 ? 21 : compactLevel >= 1 ? 22 : 23;

  // Measure node dimensions must match the final render CSS for each family.
  // .diagram-node (concept-map): width 220, padding 20/22
  // .boundary-node (boundary-model): width 218 for nested 2-zone, 282 for bands
  const nodeMeasureClass = input.family === 'boundary-model'
    ? `measure-node-boundary${usesBoundaryBands ? ' measure-node-band' : ''}`
    : 'measure-node';

  const nodeItemsHtml = nodes.map(n => `
    <div class="${nodeMeasureClass}" data-measure-id="node-${escapeHtml(n.id)}">
      <strong>${nodeTitle(n)}</strong>
      ${nodeNote(n)}
    </div>
  `).join('\n');

  // For boundary-model, also measure each zone's header band (label +
  // optional description). Width is set to the zone's real inner width so
  // description wrapping matches the final render and the measured height
  // is the true header band height.
  let zoneHeaderItemsHtml = '';
  if (input.family === 'boundary-model') {
    const zones = boundaryZonesForMeasure;
    const zoneBoxes = BOUNDARY_ZONE_BOXES[zones.length];
    const stageWidth = aspect.width - 120; // matches stageBox()
    const usesBands = usesBoundaryBands;
    zones.forEach((z, i) => {
      const innerWidthPx = usesBands
        ? stageWidth - (36 * i) * 2 - 36
        : (zoneBoxes[i].width / 100) * stageWidth - 36; // padding 18 each side
      zoneHeaderItemsHtml += `
        <div class="measure-zone-header${usesBands ? ' measure-zone-header-band' : ''}" data-measure-id="zone-header-${escapeHtml(z.id)}" style="width: ${innerWidthPx}px;">
          <strong>${escapeHtml(truncate(z.label, 28))}</strong>
          ${z.description ? `<span>${escapeHtml(truncate(z.description, 42))}</span>` : ''}
        </div>
      `;
    });
  }

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
    box-sizing: border-box;
    visibility: hidden;
    display: block;
    width: ${MEASURE_NODE_WIDTH}px;
    margin-bottom: 16px;
    padding: 20px 22px;
    border: 1px solid ${design.hairline};
    background: color-mix(in srgb, ${design.surface1} 94%, ${design.canvas});
    border-radius: ${design.radius};
  }
  .measure-node-boundary {
    box-sizing: border-box;
    visibility: hidden;
    display: block;
    width: ${boundaryNodeWidthPx}px;
    margin-bottom: 16px;
    padding: 17px 18px;
    border: 1px solid ${design.hairline};
    background: color-mix(in srgb, ${design.surface1} 95%, ${design.canvas});
    border-radius: ${design.radius};
  }
  .measure-node-band {
    box-sizing: border-box;
    display: grid;
    align-content: center;
    gap: ${bandNodeGap}px;
    min-height: ${bandNodeMinHeight}px;
    padding: ${bandNodePadding};
  }
  .measure-node strong,
  .measure-node-boundary strong {
    font: 700 30px/1.04 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    display: block;
    margin-bottom: 7px;
    color: ${design.ink};
  }
  .measure-node p,
  .measure-node-boundary p {
    font: 500 24px/1.22 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    margin: 0;
    color: ${design.inkMuted};
  }
  .measure-zone-header {
    visibility: hidden;
    display: block;
    margin-bottom: 16px;
    padding: 16px 18px;
    border: 1px solid ${design.hairline};
    background: color-mix(in srgb, ${design.surface1} 34%, transparent);
    border-radius: calc(${design.radius} + 2px);
  }
  .measure-zone-header strong {
    font: 700 26px/1 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    display: block;
    color: ${design.accent};
  }
  .measure-zone-header span {
    display: block;
    margin-top: 6px;
    max-width: 320px;
    font: 500 24px/1.16 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    color: ${design.inkMuted};
  }
  .measure-node-band strong {
    font: 700 ${bandNodeTitleSize}px/1.02 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    margin-bottom: 0;
  }
  .measure-node-band p {
    font: 500 ${bandNodeNoteSize}px/1.16 "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
  }
  .measure-zone-header-band {
    padding: 0;
    border: 0;
    background: transparent;
  }
  .measure-zone-header-band span {
    max-width: ${bandCaptionMaxWidth}px;
    margin-top: 5px;
    font: 500 ${bandCaptionFontSize}px/${bandCaptionLineHeight} "DM Sans", "XiangcuiDengcusong", Arial, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
</head><body>
<div class="measure-stage">
${zoneHeaderItemsHtml}
${nodeItemsHtml}
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

function layoutBands(input, bboxes, aspect, zones) {
  // 3+ zone boundary-model: vertical bands with indent. Band heights are
  // content-based (not equal split): each zone gets at least its header +
  // node stack, then leftover space is distributed evenly.
  const stage = stageBox(aspect, input);
  const sparseBands = isSparseBoundaryBandModel(input);
  const compactLevel = boundaryCompactLevel(input);
  const nodeWidthPx = boundaryNodeWidth(input);
  const INDENT_PX = 36;
  const PADDING_X_PX = sparseBands ? 10 : compactLevel >= 2 ? 10 : compactLevel >= 1 ? 12 : 16;
  const BAND_PADDING_TOP_PX = compactLevel >= 2 ? 10 : compactLevel >= 1 ? 12 : 14;
  const BAND_PADDING_BOTTOM_PX = compactLevel >= 2 ? 6 : compactLevel >= 1 ? 7 : 8;
  const HEADER_NODE_GAP_PX = compactLevel >= 2 ? 5 : compactLevel >= 1 ? 6 : 8;
  const NODE_ROW_GAP_PX = compactLevel >= 2 ? 10 : compactLevel >= 1 ? 12 : 16;
  const BAND_GAP_PX = 6;

  const zoneHeaderHeightPx = new Map();
  for (const zone of zones) {
    const measured = bboxes[`zone-header-${zone.id}`];
    zoneHeaderHeightPx.set(zone.id, measured ? measured.height : (zone.description ? 76 : 42));
  }

  const nodesByZone = new Map();
  for (const node of input.nodes || []) {
    if (!nodesByZone.has(node.zone)) nodesByZone.set(node.zone, []);
    nodesByZone.get(node.zone).push(node);
  }

  // Compute each zone's minimum content height.
  const zoneMinHeights = zones.map((zone) => {
    const headerPx = zoneHeaderHeightPx.get(zone.id);
    const zoneNodes = nodesByZone.get(zone.id) || [];
    if (zoneNodes.length === 0) return BAND_PADDING_TOP_PX + headerPx + BAND_PADDING_BOTTOM_PX;

    const zi = zones.indexOf(zone);
    const zoneIndentPx = INDENT_PX * zi;
    const nodeAreaWidthPx = stage.width - zoneIndentPx * 2 - PADDING_X_PX * 2;

    const cols = Math.max(1, Math.min(zoneNodes.length,
      Math.floor((nodeAreaWidthPx + NODE_ROW_GAP_PX) / (nodeWidthPx + NODE_ROW_GAP_PX))));
    const rows = Math.ceil(zoneNodes.length / cols);
    const maxNodeHeight = Math.max(...zoneNodes.map(n =>
      (bboxes[`node-${n.id}`] || { height: 110 }).height));
    const nodesHeight = rows * maxNodeHeight + Math.max(0, rows - 1) * NODE_ROW_GAP_PX;
    return BAND_PADDING_TOP_PX + headerPx + HEADER_NODE_GAP_PX + nodesHeight + BAND_PADDING_BOTTOM_PX;
  });

  const totalMin = zoneMinHeights.reduce((a, b) => a + b, 0);
  const totalGaps = BAND_GAP_PX * (zones.length - 1);
  const totalNeeded = totalMin + totalGaps;

  if (totalNeeded > stage.height + 0.5) {
    throw new Error(
      `boundary-model bands: total content height ${Math.round(totalNeeded)}px (min per zone: ${zoneMinHeights.map(h => Math.round(h)).join('+')}px + gaps) exceeds stage height ${Math.round(stage.height)}px. Shorten notes, drop zone descriptions, or reduce the zone count.`
    );
  }

  // Distribute leftover space evenly across bands. Sparse 3-zone diagrams get
  // only a small amount of breathing room and stay centered instead of filling
  // the entire stage with low-density content.
  const leftover = stage.height - totalNeeded;
  const extraPerBand = sparseBands
    ? Math.min(leftover / zones.length, 16)
    : leftover / zones.length;
  const topOffsetPx = sparseBands
    ? Math.max(0, (leftover - (extraPerBand * zones.length)) / 2)
    : 0;

  const positions = {};

  let currentTopPx = topOffsetPx;
  const bandGeometries = [];
  zones.forEach((zone, zi) => {
    const bandHeightPx = zoneMinHeights[zi] + extraPerBand;
    const bandTopPx = currentTopPx;
    bandGeometries.push({
      topPct: (bandTopPx / stage.height) * 100,
      heightPct: (bandHeightPx / stage.height) * 100,
      indentPx: INDENT_PX * zi,
    });

    const zoneNodes = nodesByZone.get(zone.id) || [];
    const headerPx = zoneHeaderHeightPx.get(zone.id);

    const innerTopPx = bandTopPx + BAND_PADDING_TOP_PX + headerPx + HEADER_NODE_GAP_PX;
    const innerBottomPx = bandTopPx + bandHeightPx - BAND_PADDING_BOTTOM_PX;

    const zoneIndentPx = INDENT_PX * zi;
    const nodeAreaLeftPx = zoneIndentPx + PADDING_X_PX;
    const nodeAreaRightPx = stage.width - zoneIndentPx - PADDING_X_PX;
    const nodeAreaWidthPx = nodeAreaRightPx - nodeAreaLeftPx;

    zoneNodes.forEach((node, order) => {
      const nodeBbox = bboxes[`node-${node.id}`] || { width: nodeWidthPx, height: 110 };
      const halfWidthPx = nodeBbox.width / 2;
      const halfHeightPx = nodeBbox.height / 2;

      const gapPx = NODE_ROW_GAP_PX;
      const cols = Math.max(1, Math.min(zoneNodes.length,
        Math.floor((nodeAreaWidthPx + gapPx) / (nodeBbox.width + gapPx))));
      const col = order % cols;
      const row = Math.floor(order / cols);
      const cellWidth = nodeAreaWidthPx / cols;
      const cellHeight = nodeBbox.height + gapPx;

      let cx = nodeAreaLeftPx + cellWidth * (col + 0.5);
      let cy = innerTopPx + halfHeightPx + row * cellHeight;
      if (!sparseBands && zone.description && zoneNodes.length === 1) {
        cx = nodeAreaLeftPx + nodeAreaWidthPx * 0.62;
      }

      if (cx - halfWidthPx < nodeAreaLeftPx) cx = nodeAreaLeftPx + halfWidthPx;
      if (cx + halfWidthPx > nodeAreaRightPx) cx = nodeAreaRightPx - halfWidthPx;
      if (cy + halfHeightPx > innerBottomPx) cy = innerBottomPx - halfHeightPx;

      if (cy - halfHeightPx < innerTopPx - 0.5) {
        throw new Error(
          `boundary-model bands: zone "${zone.id}" cannot fit node "${node.id}" in its band.`
        );
      }

      positions[node.id] = [
        Math.round((cx / stage.width) * 1000) / 10,
        Math.round((cy / stage.height) * 1000) / 10,
      ];
    });

    currentTopPx += bandHeightPx + BAND_GAP_PX;
  });

  // Attach band geometries for buildBandsHtml to read (same file, same
  // process — avoids threading geometry through the render chain).
  positions.__bandGeometries__ = bandGeometries;

  return positions;
}

function layoutBoundaryModel(input, bboxes, aspect) {
  const stage = stageBox(aspect, input);
  const zones = (input.zones || []).slice(0, 4);

  // 3+ zones: dispatch to band layout (indented horizontal bands).
  if (zones.length >= 3) {
    return layoutBands(input, bboxes, aspect, zones);
  }

  const boxes = BOUNDARY_ZONE_BOXES[zones.length];
  if (!boxes) throw new Error(`No zone box geometry for ${zones.length} zones`);

  const zoneIndex = new Map(zones.map((z, i) => [z.id, i]));

  // Measured header band height per zone, falling back to estimate if the
  // measure pass didn't return a value (e.g. AI didn't fill description).
  const zoneHeaderHeightPx = new Map();
  for (const zone of zones) {
    const measured = bboxes[`zone-header-${zone.id}`];
    zoneHeaderHeightPx.set(zone.id, measured ? measured.height : (zone.description ? 76 : 42));
  }

  // Group nodes by zone, preserving input order.
  const nodesByZone = new Map();
  for (const node of input.nodes || []) {
    if (!nodesByZone.has(node.zone)) nodesByZone.set(node.zone, []);
    nodesByZone.get(node.zone).push(node);
  }

  const positions = {};
  const PADDING_PX = 16; // matches .boundary-zone padding in baseCss

  for (const zone of zones) {
    const zoneNodes = nodesByZone.get(zone.id) || [];
    if (zoneNodes.length === 0) continue;

    const zi = zoneIndex.get(zone.id);
    const zoneBox = boxes[zi];
    const zoneTopPx = (zoneBox.top / 100) * stage.height;
    const zoneBottomPx = zoneTopPx + (zoneBox.height / 100) * stage.height;
    const zoneLeftPx = (zoneBox.left / 100) * stage.width;
    const zoneRightPx = zoneLeftPx + (zoneBox.width / 100) * stage.width;
    const headerPx = zoneHeaderHeightPx.get(zone.id);

    // Node's center y must be at least headerPx + padding + half_node height
    // below zone top, so the node sits below the header band.
    const slotPool = BOUNDARY_NODE_SLOTS[zi] || [[50, 52]];

    zoneNodes.forEach((node, order) => {
      const [baseX, baseY] = slotPool[Math.min(order, slotPool.length - 1)];
      const nodeBbox = bboxes[`node-${node.id}`] || { width: BOUNDARY_NODE_WIDTH, height: 110 };
      const halfHeightPx = nodeBbox.height / 2;
      const halfWidthPx = nodeBbox.width / 2;

      const innerTopPx = zoneTopPx + headerPx + PADDING_PX;
      const innerBottomPx = zoneBottomPx - PADDING_PX;
      const innerLeftPx = zoneLeftPx + PADDING_PX;
      const innerRightPx = zoneRightPx - PADDING_PX;

      // Y: push below header band, then clamp above zone bottom.
      let nodeCenterYPx = (baseY / 100) * stage.height;
      if (nodeCenterYPx - halfHeightPx < innerTopPx) {
        nodeCenterYPx = innerTopPx + halfHeightPx;
      }
      if (nodeCenterYPx + halfHeightPx > innerBottomPx) {
        nodeCenterYPx = innerBottomPx - halfHeightPx;
      }
      if (nodeCenterYPx - halfHeightPx < innerTopPx) {
        throw new Error(
          `boundary-model: zone "${zone.id}" cannot fit node "${node.id}" (height ${nodeBbox.height}px) below its ${headerPx}px header. Shorten the note, remove the zone description, or simplify the diagram.`
        );
      }

      // X: clamp so node stays horizontally inside the zone box.
      let nodeCenterXPx = (baseX / 100) * stage.width;
      if (nodeCenterXPx - halfWidthPx < innerLeftPx) {
        nodeCenterXPx = innerLeftPx + halfWidthPx;
      }
      if (nodeCenterXPx + halfWidthPx > innerRightPx) {
        nodeCenterXPx = innerRightPx - halfWidthPx;
      }
      // ponytail: 0.5px tolerance for float comparison so a clamp that lands
      // exactly on innerLeft doesn't false-trigger the throw.
      if (nodeCenterXPx - halfWidthPx < innerLeftPx - 0.5) {
        throw new Error(
          `boundary-model: zone "${zone.id}" is too narrow (width ${zoneBox.width}%) to fit node "${node.id}" (width ${nodeBbox.width}px).`
        );
      }

      // V2.2: inner-zone avoidance. Detect significant bbox overlap with
      // any nested inner zone. If overlap > 25% of node area, try shifting
      // x (then y) to escape. If no escape keeps node in zone, fail with a
      // specific error naming the inner zone and the overlap percent.
      // Threshold 25% lets minor edge-touching (visually acceptable, where
      // a corner of the node crosses an inner-zone edge) pass while
      // catching severe collisions where the node visually sits on top of
      // an inner zone. Tuned against 2-zone (≈11% corner overlap, passes)
      // and 3-zone middle-on-inner (≈33% body overlap, fails).
      const INNER_MARGIN_PX = 8;
      const OVERLAP_THRESHOLD = 0.25;
      const innerZones = zones.slice(zi + 1);
      const nodeArea = nodeBbox.width * nodeBbox.height;

      const rectOverlap = (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) => {
        const ox = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
        const oy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
        return ox * oy;
      };

      const findWorstOverlap = (cx, cy) => {
        let worst = { pct: 0, zoneId: null, box: null };
        for (const innerZ of innerZones) {
          const innerZoneIdx = zoneIndex.get(innerZ.id);
          const ib = boxes[innerZoneIdx];
          const ix1 = (ib.left / 100) * stage.width;
          const iy1 = (ib.top / 100) * stage.height;
          const ix2 = ix1 + (ib.width / 100) * stage.width;
          const iy2 = iy1 + (ib.height / 100) * stage.height;
          const ov = rectOverlap(
            cx - halfWidthPx, cy - halfHeightPx, cx + halfWidthPx, cy + halfHeightPx,
            ix1, iy1, ix2, iy2,
          );
          const pct = ov / nodeArea;
          if (pct > worst.pct) worst = { pct, zoneId: innerZ.id, box: ib };
        }
        return worst;
      };

      let worst = findWorstOverlap(nodeCenterXPx, nodeCenterYPx);
      if (worst.pct > OVERLAP_THRESHOLD) {
        // Try x shift first (most common escape), then y shift.
        const ib = worst.box;
        const innerLeftPx = (ib.left / 100) * stage.width;
        const innerRightPx = innerLeftPx + (ib.width / 100) * stage.width;
        const innerTopPx = (ib.top / 100) * stage.height;
        const innerBottomPx = innerTopPx + (ib.height / 100) * stage.height;

        const candidates = [];
        const xShiftLeft = innerLeftPx - INNER_MARGIN_PX - halfWidthPx;
        const xShiftRight = innerRightPx + INNER_MARGIN_PX + halfWidthPx;
        if (xShiftLeft - halfWidthPx >= zoneLeftPx + PADDING_PX - 0.5
            && xShiftLeft + halfWidthPx <= zoneRightPx - PADDING_PX + 0.5) {
          candidates.push([xShiftLeft, nodeCenterYPx]);
        }
        if (xShiftRight - halfWidthPx >= zoneLeftPx + PADDING_PX - 0.5
            && xShiftRight + halfWidthPx <= zoneRightPx - PADDING_PX + 0.5) {
          candidates.push([xShiftRight, nodeCenterYPx]);
        }
        const yShiftUp = innerTopPx - INNER_MARGIN_PX - halfHeightPx;
        const yShiftDown = innerBottomPx + INNER_MARGIN_PX + halfHeightPx;
        if (yShiftUp - halfHeightPx >= innerTopPx - 0.5
            && yShiftUp + halfHeightPx <= innerBottomPx + 0.5) {
          candidates.push([nodeCenterXPx, yShiftUp]);
        }
        if (yShiftDown - halfHeightPx >= innerTopPx - 0.5
            && yShiftDown + halfHeightPx <= innerBottomPx + 0.5) {
          candidates.push([nodeCenterXPx, yShiftDown]);
        }

        // Pick candidate with lowest residual overlap.
        let best = null;
        for (const [cx, cy] of candidates) {
          const ov = findWorstOverlap(cx, cy);
          if (!best || ov.pct < best.ov.pct) best = { cx, cy, ov };
        }

        if (best && best.ov.pct <= OVERLAP_THRESHOLD) {
          nodeCenterXPx = best.cx;
          nodeCenterYPx = best.cy;
        } else {
          throw new Error(
            `boundary-model: node "${node.id}" in zone "${zone.id}" overlaps inner zone "${worst.zoneId}" (${Math.round(worst.pct * 100)}% of node area) and no in-zone position avoids it. Reduce the note length, simplify the diagram, or use fewer zones so each zone's ring is wider than the node.`
          );
        }
      }

      positions[node.id] = [
        Math.round((nodeCenterXPx / stage.width) * 1000) / 10,
        Math.round((nodeCenterYPx / stage.height) * 1000) / 10,
      ];
    });
  }

  return positions;
}

module.exports = {
  render,
  renderMeasure,
  layoutFormulaCard,
  layoutConceptMap,
  layoutBoundaryModel,
  analyzeFormulaCardContent,
  ASPECTS,
  defaultAspect,
};
