/**
 * Long mode renderer for card-skill CLI.
 * Fills long_template.html with structured input.
 * Converts typed body elements into template-supported HTML.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml, escapePhrase } = require('../lib/escape');
const { getDesign, resolveDesignNameForInput } = require('../lib/designs');

const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

/**
 * Convert a structured body element array into HTML for long_template.
 * Supported types: paragraph, heading, highlight, blockquote, layer_card, section_break
 */
function renderBody(body) {
  const errors = require('../lib/long-notes').validateLongNotes({ body });
  if (errors.length) throw new Error('input_contract: ' + errors.join('; '));
  return body.map((el, i) => {
    switch (el.type) {
      case 'paragraph': {
        const cls = el.dropcap ? ' class="dropcap"' : '';
        return `<p${cls}>${escapeHtml(el.text)}</p>`;
      }
      case 'heading': {
        const tag = el.level === 3 ? 'h3' : 'h2';
        return `<${tag}>${escapeHtml(el.text)}</${tag}>`;
      }
      case 'highlight': {
        const cls = el.accent ? ' class="highlight accent-highlight"' : ' class="highlight"';
        return `<div${cls}><p>${el.text.split(/(?<=[，。？！])/u).filter(Boolean).map(part => `<span class="reading-phrase">${escapeHtml(part)}</span>`).join('')}</p></div>`;
      }
      case 'blockquote': {
        const grouped = el.quote_group !== undefined;
        const previous = body[i - 1], next = body[i + 1];
        const continues = grouped && previous?.type === 'blockquote' && previous.quote_group === el.quote_group && previous.source_ref === el.source_ref;
        const continuesNext = grouped && next?.type === 'blockquote' && next.quote_group === el.quote_group && next.source_ref === el.source_ref;
        return (continues ? '' : '<blockquote>') + '<p>' + escapeHtml(el.text) + '</p>' + (continuesNext ? '' : '</blockquote>');
      }
      case 'layer_card': {
        const label = el.label ? escapeHtml(el.label) : '';
        return `<div class="layer-card note-${el.role || 'note'}"><div class="layer-label">${label}</div><div class="layer-text">${escapeHtml(el.text)}</div></div>`;
      }
      case 'section_break': {
        return '<div class="section-break"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
      }
      default:
        return '';
    }
  }).join('\n\n');
}

/**
 * Render long mode from structured input.
 */
function render(input, outputHtmlPath) {
  const design = getDesign(resolveDesignNameForInput(input, 'claude'));
  if (!design) throw new Error(`Design not found: ${input.design}`);

  const templateFile = path.resolve(__dirname, '../../assets/long_template.html');
  let template = fs.readFileSync(templateFile, 'utf-8');

  // Set theme class
  const theme = input.theme || (design.surface === 'dark' ? 'dark' : 'light');
  template = template.replace('class="light"', `class="${theme}"`);

  // Inject design tokens (override :root variables)
  template = template.replace(/(html\.dark\s*\{[^}]*\})/s, (match) => {
    // Only modify dark theme block if we're using dark
    if (theme === 'dark') {
      return match
        .replace(/--bg:.*?;/g, `--bg: ${design.canvas};`)
        .replace(/--surface-1:.*?;/g, `--surface-1: ${design.surface1};`)
        .replace(/--surface-2:.*?;/g, `--surface-2: ${design.surface2};`)
        .replace(/--accent:.*?;/g, `--accent: ${design.accent};`)
        .replace(/--ink:.*?;/g, `--ink: ${design.ink};`)
        .replace(/--ink-muted:.*?;/g, `--ink-muted: ${design.inkMuted};`)
        .replace(/--hairline:.*?;/g, `--hairline: ${design.hairline};`)
        .replace(/--radius:.*?;/g, `--radius: ${design.radius};`);
    }
    return match;
  });

  // Override light theme :root
  if (theme === 'light') {
    template = template.replace(/(:root\s*\{[^}]*\})/s, (match) => {
      return match
        .replace(/--bg:.*?;/, `--bg: ${design.canvas};`)
        .replace(/--surface-1:.*?;/, `--surface-1: ${design.surface1};`)
        .replace(/--surface-2:.*?;/, `--surface-2: ${design.surface2};`)
        .replace(/--accent:.*?;/, `--accent: ${design.accent};`)
        .replace(/--ink:.*?;/, `--ink: ${design.ink};`)
        .replace(/--ink-muted:.*?;/, `--ink-muted: ${design.inkMuted};`)
        .replace(/--hairline:.*?;/, `--hairline: ${design.hairline};`)
        .replace(/--radius:.*?;/, `--radius: ${design.radius};`);
    });
  }

  const logoPath = input.logo ? path.resolve(input.logo) : '';
  const brandName = input.brand_name ? escapeHtml(input.brand_name) : '';
  const hasBranding = Boolean(logoPath || brandName);

  // Fill placeholders
  template = template.replaceAll('{{KICKER}}', escapeHtml(input.kicker || ''));
  template = template.replaceAll('{{TITLE}}', escapePhrase(input.title || ''));
  template = template.replaceAll('{{SUBTITLE}}', escapeHtml(input.subtitle || ''));
  template = template.replaceAll('{{BODY_HTML}}', renderBody(input.body));
  template = template.replaceAll('{{SOURCE_LINE}}', input.source ? `<span class="source-line">${escapeHtml(input.source)}</span>` : '');
  template = template.replaceAll('{{LOGO}}', logoPath ? escapeHtml(pathToFileURL(logoPath).href) : '');
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));

  if (!hasBranding) {
    template = template.replace(/\s*<footer class="colophon">[\s\S]*?<\/footer>/, '');
  } else {
    if (!logoPath) template = template.replace(/\s*<img src="" alt="logo">/, '');
    if (!brandName) template = template.replace(/\s*<span class="name"><\/span>/, '');
  }

  fs.writeFileSync(outputHtmlPath, template, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: 1080,
    captureHeight: 800,
    fullpage: true,
  };
}

module.exports = { render, renderBody };
