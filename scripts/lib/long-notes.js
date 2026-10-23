// Grouping is an editorial declaration, never inferred from adjacency alone.
function validateLongNotes(input) {
  const errors = [], groups = new Map();
  if (!Array.isArray(input.body)) return errors;
  input.body.forEach((el, i) => {
    if (!el || typeof el !== 'object') return;
    if (el.type === 'layer_card' && el.role !== undefined && !['note', 'attribution', 'footer'].includes(el.role)) errors.push(`body[${i}]: role must be note, attribution or footer`);
    if (el.type === 'layer_card' && el.role === 'footer' && i !== input.body.length - 1) errors.push(`body[${i}]: footer must be the final body element`);
    if (el.type !== 'blockquote') return;
    if (el.source_ref !== undefined && (typeof el.source_ref !== 'string' || !el.source_ref.trim() || el.source_ref.length > 240)) errors.push(`body[${i}]: source_ref must be a nonempty source identifier of at most 240 characters`);
    if (el.quote_group === undefined) return;
    if (typeof el.quote_group !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(el.quote_group)) errors.push(`body[${i}]: quote_group must be a lowercase identifier`);
    if (typeof el.source_ref !== 'string' || !el.source_ref.trim()) errors.push(`body[${i}]: quote_group requires explicit source_ref`);
    const previous = groups.get(el.quote_group);
    if (previous && (previous.source !== el.source_ref || previous.index !== i - 1)) errors.push(`body[${i}]: a quote_group must be contiguous and have one source_ref`);
    groups.set(el.quote_group, { source: el.source_ref, index: i });
  });
  return errors;
}

module.exports = { validateLongNotes };
