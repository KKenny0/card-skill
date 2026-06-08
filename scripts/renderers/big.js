/**
 * Big mode renderer for cast CLI.
 * Fills big_template.html with structured input.
 */

const fs = require('fs');
const path = require('path');
const { escapePhrase, escapeHtml } = require('../lib/escape');
const { cssOverrides, getDesign } = require('../lib/designs');

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/big_template.html');
const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

/**
 * Calculate font size from phrase character count.
 * Rules from references/mode-big.md:
 *   <=10 chars → 220px, 11-20 → 190px, 21+ → 160px
 * Count excludes HTML tags for accurate character measurement.
 */
function calcFontSize(phraseHtml) {
  const plain = phraseHtml.replace(/<[^>]+>/g, '');
  const len = plain.length;
  if (len <= 10) return '220px';
  if (len <= 20) return '190px';
  return '160px';
}

/**
 * Derive ghost character from phrase or accent_words.
 */
function deriveGhostChar(phraseHtml, accentWords) {
  if (accentWords && accentWords.length > 0) {
    return escapeHtml(accentWords[0]).charAt(0).toUpperCase();
  }
  const plain = phraseHtml.replace(/<[^>]+>/g, '');
  // Take first CJK char or first letter
  const cjk = plain.match(/[\u4e00-\u9fff\u3400-\u4dbf]/);
  if (cjk) return cjk[0];
  return plain.charAt(0).toUpperCase();
}

/**
 * Wrap accent_words in the phrase with <span class="accent">.
 * Only applies if phrase doesn't already contain accent spans.
 */
function applyAccentWords(phraseHtml, accentWords) {
  if (!accentWords || accentWords.length === 0) return phraseHtml;
  if (phraseHtml.includes('class="accent"')) return phraseHtml;
  let result = phraseHtml;
  for (const word of accentWords) {
    result = result.replace(new RegExp(escapeRegex(word), 'g'), `<span class="accent">${word}</span>`);
  }
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render big mode from structured input.
 * @param {object} input - Validated input object
 * @param {string} outputHtmlPath - Where to write the filled HTML
 * @returns {object} - { htmlPath, captureWidth, captureHeight, fullpage }
 */
function render(input, outputHtmlPath) {
  const design = getDesign(input.design || 'vercel');
  if (!design) throw new Error(`Design not found: ${input.design}`);

  let phraseHtml = escapePhrase(input.phrase);
  phraseHtml = applyAccentWords(phraseHtml, input.accent_words);

  const fontSize = input.font_size || calcFontSize(phraseHtml);
  const ghostChar = input.ghost_char || deriveGhostChar(input.phrase, input.accent_words);
  const attribution = input.attribution ? escapeHtml(input.attribution) : '';

  const logoPath = path.resolve(input.logo || path.resolve(__dirname, '../../assets/logo.png'));
  const brandName = escapeHtml(input.brand_name || 'cast');

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // Set theme class based on design surface
  const theme = design.surface === 'dark' ? 'dark' : 'light';
  template = template.replace('class="dark"', `class="${theme}"`);

  // Inject design tokens
  const overrides = cssOverrides(input.design || 'vercel');
  template = template.replace(/(:root\s*\{[^}]*\})/s, (match) => {
    return match.replace(/--bg:.*?;/, `--bg: ${design.canvas};`)
               .replace(/--accent:.*?;/, `--accent: ${design.accent};`)
               .replace(/--ink:.*?;/, `--ink: ${design.ink};`)
               .replace(/--ink-muted:.*?;/, `--ink-muted: ${design.inkMuted};`)
               .replace(/--surface-1:.*?;/, `--surface-1: ${design.surface1};`)
               .replace(/--hairline:.*?;/, `--hairline: ${design.hairline};`);
  });

  // Fill placeholders (replaceAll because each placeholder appears in both
  // the HTML comment docs and the actual body — replace() only hits the first)
  template = template.replaceAll('{{PHRASE_HTML}}', phraseHtml);
  template = template.replaceAll('{{FONT_SIZE}}', fontSize);
  template = template.replaceAll('{{GHOST_CHAR}}', ghostChar);
  template = template.replaceAll('{{ATTRIBUTION}}', attribution);
  template = template.replaceAll('{{LOGO}}', 'file://' + logoPath);
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));

  fs.writeFileSync(outputHtmlPath, template, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: 1080,
    captureHeight: 1440,
    fullpage: false,
  };
}

module.exports = { render, calcFontSize };
