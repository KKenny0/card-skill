/**
 * Poster mode renderer for cast CLI.
 * Fills poster_template.html for each card. Produces N HTML files for N cards.
 */

const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../lib/escape');
const { getDesign } = require('../lib/designs');

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/poster_template.html');

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

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const logoPath = path.resolve(input.logo || path.resolve(__dirname, '../../assets/logo.png'));
  const brandName = escapeHtml(input.brand_name || 'cast');
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
    if (isLast) {
      colophonBlock = `<div class="colophon"><div class="brand-mark"><div class="stripe-bar"></div><span>${brandName}</span></div><img class="logo-mark" src="file://${logoPath}" alt="logo"><span class="endmark">■</span></div>`;
    }

    // Fill template
    let html = template;
    html = html.replaceAll('{{BG_COLOR}}', design.canvas);
    html = html.replaceAll('{{ACCENT_COLOR}}', design.accent);
    html = html.replaceAll('{{HEADER_BLOCK}}', headerBlock);
    html = html.replaceAll('{{TITLE_BLOCK}}', titleBlock);
    html = html.replaceAll('{{BODY_HTML}}', Array.isArray(card.body) ? renderCardBody(card.body) : '');
    html = html.replaceAll('{{COLOPHON_BLOCK}}', colophonBlock);
    html = html.replaceAll('{{LOGO}}', 'file://' + logoPath);
    html = html.replaceAll('{{BRAND_NAME}}', brandName);
    html = html.replaceAll('{{PAGE_INFO}}', ''); // documented in comment but not used in body

    const htmlFileName = `cast_poster_${Date.now()}_${i + 1}.html`;
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
