// Only a standalone text node may be replaced with renderer-owned image markup.
// Strip complete tags (including quoted >) and comments before counting slots.
const SLOT = '{{COMIC_ART}}';
function comicArtSlotError(input) {
  const html = typeof input.content_html === 'string' ? input.content_html : '';
  const count = html.split(SLOT).length - 1;
  if (count !== (input.comic_art ? 1 : 0)) return 'comic_art requires exactly one {{COMIC_ART}} slot; omit both for vector composition';
  if (!input.comic_art) return null;
  const active = html.replace(/<(style|textarea|title|xmp|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const text = active.replace(/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>/g, '\n');
  if (text.split(SLOT).length !== 2 || !text.split('\n').some(line => line.trim() === SLOT)) return 'COMIC_ART must be a standalone content slot, not an attribute or comment';
  return null;
}
module.exports = { comicArtSlotError };
