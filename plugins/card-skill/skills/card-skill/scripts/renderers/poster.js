/**
 * Poster mode renderer for card-skill CLI.
 * Fills poster_template.html for each card. Produces N HTML files for N cards.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml } = require('../lib/escape');
const { getDesign } = require('../lib/designs');

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/poster_template.html');
const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

/**
 * Convert structured body elements into HTML for poster_template.
 * Supported types: paragraph, heading, highlight, items, data_row, divider
 */
function renderCardBody(body) {
  return body.map(el => {
    switch (el.type) {
      case 'paragraph':
        return `<p>${escapeHtml(el.text)}</p>`;
      case 'heading':
        return `<h2>${escapeHtml(el.text)}</h2>`;
      case 'highlight':
        return `<div class="highlight"><p>${escapeHtml(el.text)}</p></div>`;
      case 'items': {
        if (!Array.isArray(el.entries)) return '';
        return el.entries.filter(e => e.label && e.text).map(e => `
          <div class="item">
            <div class="label">${escapeHtml(e.label)}</div>
            <p>${escapeHtml(e.text)}</p>
          </div>`).join('\n');
      }
      case 'data_row': {
        if (!el.key || !el.value) return '';
        return `<div class="data-row"><span class="key">${escapeHtml(el.key)}</span><span class="value">${escapeHtml(el.value)}</span></div>`;
      }
      case 'divider':
        return '<div class="divider"></div>';
      default:
        return '';
    }
  }).join('\n\n');
}

/**
 * Render poster mode from structured input.
 * Produces one HTML file per card.
 * @returns {Array<object>} - Array of { htmlPath, captureWidth, captureHeight, fullpage }
 */
function render(input, outputDir) {
  const design = getDesign(input.design || 'stripe');
  if (!design) throw new Error(`Design not found: ${input.design}`);

  // Poster template has no dark theme — reject dark-surface designs
  if (design.surface === 'dark') {
    throw new Error(`Poster mode requires a light-surface design. "${input.design}" is dark. Try one of: apple, expo, notion, claude, cursor, stripe, ibm, etc.`);
  }

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const logoPath = input.logo ? path.resolve(input.logo) : '';
  const brandName = input.brand_name ? escapeHtml(input.brand_name) : '';
  const hasBranding = Boolean(logoPath || brandName);
  const totalCards = input.cards.length;

  const results = [];

  input.cards.forEach((card, i) => {
    const isFirst = i === 0;
    const isLast = i === totalCards - 1;
    const pageNum = i + 1;

    // Build header block (empty for first card)
    let headerBlock = '';
    if (!isFirst) {
      headerBlock = `<div class="header"><span class="running-title">${escapeHtml(input.title)}</span><span class="page-indicator">${pageNum} / ${totalCards}</span></div>`;
    }

    // Build title block (only for first card)
    let titleBlock = '';
    if (isFirst) {
      titleBlock = `<div class="title-area"><h1>${escapeHtml(input.title)}</h1>${input.subtitle ? `<div class="subtitle">${escapeHtml(input.subtitle)}</div>` : ''}</div>`;
    }

    // Build colophon block (only for last card)
    let colophonBlock = '';
    if (isLast && hasBranding) {
      const brandMark = brandName ? `<div class="brand-mark"><div class="stripe-bar"></div><span>${brandName}</span></div>` : '';
      const logoMark = logoPath ? `<img class="logo-mark" src="${escapeHtml(pathToFileURL(logoPath).href)}" alt="logo">` : '';
      colophonBlock = `<div class="colophon">${brandMark}${logoMark}<span class="endmark">■</span></div>`;
    }

    // Fill template
    let html = template;
    html = html.replaceAll('{{BG_COLOR}}', design.canvas);
    html = html.replaceAll('{{ACCENT_COLOR}}', design.accent);

    // Inject remaining design tokens (not covered by Mustache placeholders)
    html = html.replace(/(--ink):\s*[^;]+;/g, `$1: ${design.ink};`);
    html = html.replace(/(--ink-muted):\s*[^;]+;/g, `$1: ${design.inkMuted};`);
    html = html.replace(/(--hairline):\s*[^;]+;/g, `$1: ${design.hairline};`);
    html = html.replace(/(--surface-1):\s*[^;]+;/g, `$1: ${design.surface1};`);
    html = html.replace(/(--surface-2):\s*[^;]+;/g, `$1: ${design.surface2};`);
    html = html.replace(/(--radius):\s*[^;]+;/g, `$1: ${design.radius};`);
    html = html.replaceAll('{{HEADER_BLOCK}}', headerBlock);
    html = html.replaceAll('{{TITLE_BLOCK}}', titleBlock);
    html = html.replaceAll('{{BODY_HTML}}', Array.isArray(card.body) ? renderCardBody(card.body) : '');
    html = html.replaceAll('{{COLOPHON_BLOCK}}', colophonBlock);
    html = html.replaceAll('{{LOGO}}', logoPath ? escapeHtml(pathToFileURL(logoPath).href) : '');
    html = html.replaceAll('{{BRAND_NAME}}', brandName);
    html = html.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));
    html = html.replaceAll('{{PAGE_INFO}}', ''); // documented in comment but not used in body

    const htmlFileName = `card_poster_${i + 1}.html`;
    const htmlPath = path.join(outputDir, htmlFileName);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    results.push({
      htmlPath,
      captureWidth: 1080,
      captureHeight: 1440,
      fullpage: false,
    });
  });

  return results;
}

module.exports = { render, renderCardBody };
