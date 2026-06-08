/**
 * Long mode renderer for cast CLI.
 * Fills long_template.html with structured input.
 * Converts typed body elements into template-supported HTML.
 */

const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../lib/escape');
const { getDesign } = require('../lib/designs');

const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

/**
 * Convert a structured body element array into HTML for long_template.
 * Supported types: paragraph, heading, highlight, blockquote, layer_card, section_break
 */
function renderBody(body) {
  return body.map(el => {
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
        return `<div${cls}><p>${escapeHtml(el.text)}</p></div>`;
      }
      case 'blockquote': {
        return `<blockquote><p>${escapeHtml(el.text)}</p></blockquote>`;
      }
      case 'layer_card': {
        const label = el.label ? escapeHtml(el.label) : '';
        return `<div class="layer-card"><div class="layer-label">${label}</div><div class="layer-text">${escapeHtml(el.text)}</div></div>`;
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
  const design = getDesign(input.design || 'claude');
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
        .replace(/--hairline:.*?;/g, `--hairline: ${design.hairline};`);
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
        .replace(/--hairline:.*?;/, `--hairline: ${design.hairline};`);
    });
  }

  const logoPath = path.resolve(input.logo || path.resolve(__dirname, '../../assets/logo.png'));
  const brandName = escapeHtml(input.brand_name || 'cast');

  // Fill placeholders
  template = template.replaceAll('{{KICKER}}', escapeHtml(input.kicker || ''));
  template = template.replaceAll('{{TITLE}}', escapeHtml(input.title || ''));
  template = template.replaceAll('{{SUBTITLE}}', escapeHtml(input.subtitle || ''));
  template = template.replaceAll('{{BODY_HTML}}', renderBody(input.body));
  template = template.replaceAll('{{SOURCE_LINE}}', input.source ? `<span class="source-line">${escapeHtml(input.source)}</span>` : '');
  template = template.replaceAll('{{LOGO}}', 'file://' + logoPath);
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));

  fs.writeFileSync(outputHtmlPath, template, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: 1080,
    captureHeight: 800,
    fullpage: true,
  };
}

module.exports = { render, renderBody };
