/** Semantic line planning for Big. Never edits source wording to make it fit. */
const { escapeHtml } = require('./escape');
const PAUSES = { none: 0, short: 40, long: 88 };
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s/g, '');

function validateReading(input) {
  const errors = [];
  if (input.reading_lines === undefined) return errors;
  const lines = input.reading_lines;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 6) return ['big reading_lines requires 1–6 semantic lines; split longer arguments into poster or whiteboard'];
  for (const [i, line] of lines.entries()) {
    if (!line || typeof line !== 'object' || Array.isArray(line)) { errors.push(`reading_lines[${i}] must be an object`); continue; }
    if (Object.keys(line).some(k => !['text', 'font_size', 'pause_before'].includes(k))) errors.push(`reading_lines[${i}] has unknown fields`);
    if (typeof line.text !== 'string' || !line.text.trim() || /[<>\r\n]/.test(line.text)) errors.push(`reading_lines[${i}].text must be nonempty plain text on one line`);
    if (line.font_size !== undefined && (!Number.isFinite(line.font_size) || line.font_size < 100 || line.font_size > 200)) errors.push(`reading_lines[${i}].font_size must be 100–200px`);
    if (line.pause_before !== undefined && !Object.hasOwn(PAUSES, line.pause_before)) errors.push(`reading_lines[${i}].pause_before must be none, short or long`);
    if (i === 0 && line.pause_before && line.pause_before !== 'none') errors.push('The first reading line cannot have pause_before');
  }
  if (plain(lines.map(l => l?.text || '').join('')) !== plain(input.phrase)) errors.push('reading_lines must preserve every phrase character in order, including punctuation and negation');
  if (plain(input.phrase).length > 60) errors.push('big reading_lines supports at most 60 characters; do not remove conditions to fit');
  if (/<[^>]*>/.test(input.phrase || '')) errors.push('Use a plain-text phrase with reading_lines; put emphasis in accent_words');
  const accents = input.accent_words || [];
  if (!Array.isArray(accents) || accents.length > 1 || accents.some(w => typeof w !== 'string' || !w.trim() || lines.filter(l => typeof l?.text === 'string' && l.text.includes(w)).length !== 1 || lines.map(l => l?.text || '').join('').split(w).length !== 2)) errors.push('reading_lines supports one unique accent_words phrase wholly within one line');
  return errors;
}

function renderReading(input, fallbackSize) {
  const errors = validateReading(input);
  if (errors.length) throw new Error(`input_contract: ${errors.join('; ')}`);
  return input.reading_lines.map(line => {
    const accent = input.accent_words?.[0];
    const parts = accent ? line.text.split(accent) : [line.text];
    const html = parts.map(escapeHtml).join(`<span class="accent">${escapeHtml(accent || '')}</span>`);
    return `<span class="reading-line" style="font-size:${line.font_size || fallbackSize}px;margin-top:${PAUSES[line.pause_before || 'none']}px">${html}</span>`;
  }).join('');
}

module.exports = { validateReading, renderReading };
