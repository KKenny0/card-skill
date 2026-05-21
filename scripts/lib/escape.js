/**
 * HTML entity escaping for safe template injection.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}

/**
 * Escape plain text for HTML, but preserve intentional <br> and <span class="accent">
 * tags used in big mode phrases.
 */
function escapePhrase(text) {
  if (!text) return '';
  // Split on allowed tags, escape the text segments between them
  const parts = text.split(/(<br\s*\/?>|<span\s+class=["']accent["']>|<\/span>)/i);
  return parts.map((part, i) => {
    if (/^<br\s*\/?>$/i.test(part)) return '<br>';
    if (/^<span\s+class=["']accent["']>$/i.test(part)) return '<span class="accent">';
    if (/^<\/span>$/i.test(part)) return '</span>';
    return escapeHtml(part);
  }).join('');
}

module.exports = { escapeHtml, escapePhrase };
