/**
 * Schema validation for card-skill CLI.
 * Each schema defines required fields, optional fields, and type checks.
 */

const {
  EDITORIAL_TONES,
  getDesign,
  isValidDesignName,
  listDesigns,
  resolveDesignNameForInput,
} = require('./designs');
const fs = require('fs');
const path = require('path');
const {
  MAX_LOGO_BYTES,
  MAX_LOGO_DIMENSION,
  MAX_LOGO_PIXELS,
  inspectLocalImage,
  isSafeAbsoluteLocalPath,
} = require('./file-access');

const SCHEMAS = {
  big: {
    required: ['mode', 'phrase'],
    optional: ['design', 'tone', 'accent_words', 'ghost_char', 'font_size', 'attribution', 'logo', 'brand_name', 'reading_lines'],
    types: {
      mode: 'string',
      phrase: 'string',
      reading_lines: 'array',
      design: 'string',
      tone: 'string',
      accent_words: 'array',
      ghost_char: 'string',
      font_size: 'number',
      attribution: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  long: {
    required: ['mode', 'title', 'body'],
    optional: ['design', 'tone', 'kicker', 'subtitle', 'theme', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      title: 'string',
      body: 'array',
      design: 'string',
      tone: 'string',
      kicker: 'string',
      subtitle: 'string',
      theme: 'string',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  whiteboard: {
    required: ['mode', 'title', 'steps'],
    optional: ['design', 'tone', 'subtitle', 'accent_words', 'logo', 'brand_name', 'variant', 'note_page'],
    types: {
      mode: 'string',
      variant: 'string',
      note_page: 'object',
      title: 'string',
      steps: 'array',
      design: 'string',
      tone: 'string',
      subtitle: 'string',
      accent_words: 'array',
      logo: 'string',
      brand_name: 'string',
    },
  },
  poster: {
    required: ['mode', 'title', 'cards'],
    optional: ['variant', 'design', 'tone', 'kicker', 'subtitle', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      title: 'string',
      cards: 'array',
      variant: 'string',
      design: 'string',
      tone: 'string',
      kicker: 'string',
      subtitle: 'string',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  'editorial-image': {
    required: ['mode', 'title'],
    optional: [
      'design',
      'editorial_tone',
      'use',
      'aspect',
      'kicker',
      'subtitle',
      'visual_metaphor',
      'cover_motif',
      'cover_art',
      'cover_series',
      'art_direction',
      'text_plan',
      'composition_required',
      'source',
      'custom_css',
      'content_html',
      'logo',
      'brand_name',
    ],
    types: {
      mode: 'string',
      title: 'string',
      design: 'string',
      editorial_tone: 'string',
      use: 'string',
      aspect: 'string',
      kicker: 'string',
      subtitle: 'string',
      visual_metaphor: 'string',
      cover_motif: 'string',
      cover_art: 'object',
      cover_series: 'string',
      art_direction: 'string',
      text_plan: 'string',
      composition_required: 'boolean',
      source: 'string',
      custom_css: 'string',
      content_html: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  'article-diagram': {
    required: ['mode', 'title'],
    optional: [
      'design',
      'tone',
      'aspect',
      'family',
      'subtitle',
      'formula',
      'sentence',
      'structure',
      'render_plan',
      'personal_layout',
      'caption',
      'nodes',
      'links',
      'zones',
      'source',
      'logo',
      'brand_name',
    ],
    types: {
      mode: 'string',
      family: 'string',
      design: 'string',
      tone: 'string',
      aspect: 'string',
      title: 'string',
      subtitle: 'string',
      formula: 'string',
      sentence: 'string',
      structure: 'object',
      render_plan: 'string',
      personal_layout: 'string',
      caption: 'string',
      nodes: 'array',
      links: 'array',
      zones: 'array',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  infograph: {
    required: ['mode', 'title', 'composition_required', 'content_html', 'custom_css'],
    optional: ['variant', 'design', 'tone', 'subtitle', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      variant: 'string',
      title: 'string',
      composition_required: 'boolean',
      content_html: 'string',
      custom_css: 'string',
      design: 'string',
      tone: 'string',
      subtitle: 'string',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  comic: {
    required: ['mode', 'title', 'composition_required', 'content_html', 'custom_css'],
    optional: ['variant', 'comic_art', 'design', 'tone', 'subtitle', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      variant: 'string',
      comic_art: 'object',
      title: 'string',
      composition_required: 'boolean',
      content_html: 'string',
      custom_css: 'string',
      design: 'string',
      tone: 'string',
      subtitle: 'string',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  sketchnote: {
    required: ['mode', 'title', 'composition_required', 'content_html', 'custom_css'],
    optional: ['variant', 'design', 'tone', 'subtitle', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      variant: 'string',
      title: 'string',
      composition_required: 'boolean',
      content_html: 'string',
      custom_css: 'string',
      design: 'string',
      tone: 'string',
      subtitle: 'string',
      source: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
};

const LONG_BODY_TYPES = new Set(['paragraph', 'heading', 'highlight', 'blockquote', 'layer_card', 'section_break']);
const WHITEBOARD_STEP_TYPES = new Set(['chain', 'annotation', 'layers', 'insight']);
const POSTER_BODY_TYPES = new Set(['paragraph', 'heading', 'highlight', 'items', 'data_row', 'divider', 'reading_unit', 'media', 'process']);
const POSTER_VARIANTS = new Set(['field-notes']);
const POSTER_MAX_CARDS = 20;
const POSTER_MAX_BODY_ELEMENTS = 24;
const POSTER_MAX_TOTAL_TEXT = 40_000;
const EDITORIAL_ASPECTS = new Set(['wechat-cover', 'blog-hero', 'body-3-2', 'body-4-3', 'cinematic', 'square']);
const EDITORIAL_USES = new Set(['cover', 'in-article', 'metaphor']);
const MAX_COMPOSITION_HTML_CHARS = 1_000_000;
const MAX_COMPOSITION_CSS_CHARS = 262_144;

function safeCodePoint(value) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : '\ufffd';
}

function validateCompositionSafety(mode, input, errors) {
  if (typeof input.content_html === 'string' && input.content_html.length > MAX_COMPOSITION_HTML_CHARS) {
    errors.push(`${mode} content_html must be at most ${MAX_COMPOSITION_HTML_CHARS} characters`);
  }
  if (typeof input.custom_css === 'string' && input.custom_css.length > MAX_COMPOSITION_CSS_CHARS) {
    errors.push(`${mode} custom_css must be at most ${MAX_COMPOSITION_CSS_CHARS} characters`);
  }
  if (typeof input.content_html === 'string'
      && (/<(?:script|iframe|object|embed|link|base|animate|animatetransform|animatemotion|set)\b|\son[a-z]+\s*=|javascript:/i.test(input.content_html)
        || /<template\b[^>]*\bshadowrootmode\s*=/i.test(input.content_html))) {
    errors.push(`${mode} content_html cannot contain executable or embedded-resource markup`);
  }
  if (typeof input.content_html === 'string') {
    const normalizedResourceText = input.content_html
      .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => safeCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => safeCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#([0-9]+);?/g, (_, decimal) => safeCodePoint(Number.parseInt(decimal, 10)))
      .replace(/&colon;/gi, ':');
    if (/data\s*:\s*image\//i.test(normalizedResourceText)) {
      errors.push(`${mode} content_html cannot embed authored data:image resources; use a bounded renderer media or logo field`);
    }
  }
  if (typeof input.content_html === 'string'
      && /@keyframes\b|(?:^|[;{\s"'])animation(?:-[a-z-]+)?\s*:|(?:^|[;{\s"'])transition(?:-[a-z-]+)?\s*:|scroll-behavior\s*:/i.test(input.content_html)) {
    errors.push(`${mode} content_html cannot contain time-dependent animation or transition rules`);
  }
  if (typeof input.custom_css === 'string'
      && /<\/style\b|@import\b|url\s*\(\s*['"]?\s*(?:file|javascript|data):/i.test(input.custom_css)) {
    errors.push(`${mode} custom_css cannot escape its style element, import stylesheets, or reference unsafe URLs`);
  }
  if (typeof input.custom_css === 'string'
      && /@keyframes\b|(?:^|[;{\s])animation(?:-[a-z-]+)?\s*:|(?:^|[;{\s])transition(?:-[a-z-]+)?\s*:|scroll-behavior\s*:/i.test(input.custom_css)) {
    errors.push(`${mode} custom_css cannot contain time-dependent animation or transition rules`);
  }
}
const EDITORIAL_COVER_MOTIFS = new Set(['paper-stack', 'drawer', 'window', 'lens', 'path', 'archive', 'layers']);
const ARTICLE_DIAGRAM_FAMILIES = new Set(['concept-map', 'process-flow', 'boundary-model']);
const ARTICLE_DIAGRAM_ASPECTS = new Set(['body-2-1', 'body-3-2', 'body-4-3']);
const ARTICLE_DIAGRAM_RENDER_PLANS = new Set(['auto', 'summary', 'structure', 'split']);
const STUDIO_MODES = new Set(['infograph', 'comic', 'sketchnote']);
const DESIGN_NAMES = listDesigns().map(design => design.name);

function hasPosterContent(body) {
  const hasText = value => typeof value === 'string' && value.trim() !== '';
  return body.some((el) => {
    if (!el || typeof el !== 'object') return false;
    if (el.type === 'reading_unit') return hasText(el.quote);
    if (el.type === 'items') {
      return Array.isArray(el.entries) && el.entries.some(entry => hasText(entry?.label) && hasText(entry?.text));
    }
    if (el.type === 'data_row') return hasText(el.key) && hasText(el.value);
    if (el.type === 'media') return hasText(el.path) && hasText(el.alt);
    if (el.type === 'process') return Array.isArray(el.steps) && el.steps.some(step => hasText(step?.title));
    if (['paragraph', 'heading', 'highlight'].includes(el.type)) {
      return hasText(el.text);
    }
    return false;
  });
}

function totalStringLength(value, stopAfter = Number.POSITIVE_INFINITY) {
  const stack = [value];
  const seen = new WeakSet();
  let total = 0;
  while (stack.length) {
    const item = stack.pop();
    if (typeof item === 'string') {
      total += item.length;
      if (total > stopAfter) return total;
    } else if (item && typeof item === 'object') {
      if (seen.has(item)) continue;
      seen.add(item);
      const children = Array.isArray(item) ? item : Object.values(item);
      for (const child of children) stack.push(child);
    }
  }
  return total;
}

function validate(input, { checkLocalFiles = true } = {}) {
  const errors = [];
  const mode = input.mode;

  if (!mode) {
    return { valid: false, errors: ['Missing required field: mode'] };
  }

  const schema = SCHEMAS[mode];
  if (!schema) {
    return { valid: false, errors: [`Unknown mode: "${mode}". Supported modes: big, long, whiteboard, poster, editorial-image, article-diagram, infograph, comic, sketchnote`] };
  }

  if (input.author !== undefined) {
    errors.push('Field "author" is not supported. Use "brand_name" for an opt-in signature or brand label.');
  }
  if (input.photo !== undefined) {
    errors.push('Field "photo" is not supported. Use "logo" for an opt-in avatar or brand image path.');
  }
  const allowedFields = new Set([...schema.required, ...schema.optional]);
  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) errors.push(`Unknown field for ${mode}: "${field}"`);
  }

  // Check required fields
  for (const field of schema.required) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check types
  for (const [field, expected] of Object.entries(schema.types)) {
    if (input[field] === undefined) continue;
    const actual = Array.isArray(input[field]) ? 'array' : typeof input[field];
    if (actual !== expected) {
      errors.push(`Field "${field}" must be ${expected}, got ${actual}`);
    }
  }

  if (typeof input.design === 'string' && !isValidDesignName(input.design)) {
    errors.push(`design must be one of: ${DESIGN_NAMES.join(', ')}`);
  }
  if (input.tone !== undefined && !EDITORIAL_TONES.has(input.tone)) {
    errors.push(`tone must be one of: ${[...EDITORIAL_TONES].join(', ')}`);
  }
  if (input.logo !== undefined) {
    if (typeof input.logo !== 'string' || input.logo.length > 1024 || !isSafeAbsoluteLocalPath(input.logo)) {
      errors.push('logo must be a safe absolute local path of at most 1024 characters, not a network share or device path');
    } else if (checkLocalFiles) {
      try {
        inspectLocalImage(input.logo, {
          label: 'Logo',
          maxBytes: MAX_LOGO_BYTES,
          maxDimension: MAX_LOGO_DIMENSION,
          maxPixels: MAX_LOGO_PIXELS,
        });
      } catch (error) {
        errors.push(`logo must point to a bounded PNG, JPEG, or WebP image: ${error.message}`);
      }
    }
  }

  if (mode === 'comic') {
    if (input.variant !== undefined && input.variant !== 'moment-notes') errors.push('comic variant must be moment-notes');
    if (Object.hasOwn(input, 'comic_art')) {
      const art = input.comic_art;
      if (!art || typeof art !== 'object' || Array.isArray(art)) {
        errors.push('comic_art must be an object with path and alt');
      } else {
        for (const key of Object.keys(art)) {
          if (!['path', 'alt'].includes(key)) errors.push(`Unknown comic_art field: ${key}`);
        }
        if (typeof art.path !== 'string' || art.path.length > 1024 || !isSafeAbsoluteLocalPath(art.path)) {
          errors.push('comic_art.path must be a safe absolute local path of at most 1024 characters');
        } else if (checkLocalFiles) {
          try { inspectLocalImage(art.path, { label: 'Comic art' }); }
          catch (error) { errors.push(`comic_art must point to a bounded static PNG, JPEG, or WebP: ${error.message}`); }
        }
        if (typeof art.alt !== 'string' || !art.alt.trim() || art.alt.length > 500) errors.push('comic_art.alt must be non-empty text of at most 500 characters');
      }
    }
    const slotError = require('./comic-art').comicArtSlotError(input);
    if (slotError) errors.push(slotError);
  }
  if (mode === 'infograph' && input.variant !== undefined && input.variant !== 'comparison-notes') {
    errors.push('infograph variant must be comparison-notes; omit variant to use comparison-notes');
  }

  if (mode === 'big') errors.push(...require('./big-reading').validateReading(input));

  if (mode === 'sketchnote' && input.variant !== undefined && input.variant !== 'wandering-notes') {
    errors.push('sketchnote variant must be wandering-notes; omit variant to use wandering-notes');
  }

  if (STUDIO_MODES.has(mode)) {
    if (input.composition_required !== true) {
      errors.push(`${mode} requires composition_required=true`);
    }
    if (typeof input.content_html !== 'string' || input.content_html.trim() === '') {
      errors.push(`${mode} requires non-empty "content_html"`);
    }
    if (typeof input.custom_css !== 'string' || input.custom_css.trim() === '') {
      errors.push(`${mode} requires non-empty "custom_css"`);
    }
    validateCompositionSafety(mode, input, errors);
    const resolvedDesign = getDesign(resolveDesignNameForInput(input, 'claude'));
    if ((mode === 'infograph' || mode === 'sketchnote') && resolvedDesign?.surface === 'dark') {
      errors.push(`${mode} requires a light-surface design`);
    }
  }

  // Mode-specific body/step validation
  if (mode === 'long' && Array.isArray(input.body)) {
    const allowedLongFields = {
      paragraph: new Set(['type', 'text', 'dropcap']),
      heading: new Set(['type', 'text', 'level']),
      highlight: new Set(['type', 'text', 'accent']),
      blockquote: new Set(['type', 'text', 'source_ref', 'quote_group']),
      layer_card: new Set(['type', 'label', 'text', 'role']),
      section_break: new Set(['type']),
    };
    input.body.forEach((el, i) => {
      if (!el || typeof el !== 'object' || Array.isArray(el)) {
        errors.push(`body[${i}] must be an object`);
        return;
      }
      if (!el.type) errors.push(`body[${i}]: missing "type"`);
      else if (!LONG_BODY_TYPES.has(el.type)) errors.push(`body[${i}]: unknown type "${el.type}". Allowed: ${[...LONG_BODY_TYPES].join(', ')}`);
      else {
        for (const field of Object.keys(el)) {
          if (!allowedLongFields[el.type].has(field)) errors.push(`body[${i}]: unknown field "${field}" for ${el.type}`);
        }
      }
      if (el.type === 'heading' && el.level !== undefined && ![2, 3].includes(el.level)) {
        errors.push(`body[${i}]: heading level must be 2 or 3, got ${el.level}`);
      }
      if (['paragraph', 'heading', 'highlight', 'blockquote', 'layer_card'].includes(el.type)
          && (typeof el.text !== 'string' || !el.text.trim())) {
        errors.push(`body[${i}]: ${el.type} requires non-empty "text"`);
      }
      if (el.type === 'paragraph' && el.dropcap !== undefined && typeof el.dropcap !== 'boolean') errors.push(`body[${i}]: paragraph dropcap must be boolean`);
      if (el.type === 'highlight' && el.accent !== undefined && typeof el.accent !== 'boolean') errors.push(`body[${i}]: highlight accent must be boolean`);
      if (el.type === 'layer_card' && el.label !== undefined && typeof el.label !== 'string') errors.push(`body[${i}]: layer_card label must be a string`);
    });
  }

  if (mode === 'long') errors.push(...require('./long-notes').validateLongNotes(input));

  if (mode === 'whiteboard') errors.push(...require('./whiteboard-notes').validateNotes(input));
  if (mode === 'poster' && Array.isArray(input.cards)) {
    if (totalStringLength(input, POSTER_MAX_TOTAL_TEXT) > POSTER_MAX_TOTAL_TEXT) errors.push(`poster visible and contract text must total at most ${POSTER_MAX_TOTAL_TEXT} characters`);
    for (const [field, maximum] of [['title', 240], ['kicker', 160], ['subtitle', 500], ['source', 500], ['brand_name', 160]]) {
      if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > maximum)) errors.push(`${field} must be a string of at most ${maximum} characters`);
    }
    if (input.variant !== undefined && !POSTER_VARIANTS.has(input.variant)) {
      errors.push(`variant must be one of: ${[...POSTER_VARIANTS].join(', ')}`);
    }
    if (input.cards.length === 0) errors.push('cards[] must have at least 1 card');
    if (input.cards.length > POSTER_MAX_CARDS) errors.push(`poster supports at most ${POSTER_MAX_CARDS} cards per batch`);

    input.cards.forEach((card, i) => {
      if (!card || typeof card !== 'object' || Array.isArray(card)) {
        errors.push(`cards[${i}] must be an object`);
        return;
      }
      for (const key of Object.keys(card)) if (!['title', 'body'].includes(key)) errors.push(`cards[${i}]: unknown field "${key}"`);
      if (card.title !== undefined && (typeof card.title !== 'string' || card.title.trim() === '')) {
        errors.push(`cards[${i}].title must be a non-empty string when provided`);
      }
      if (typeof card.title === 'string' && card.title.length > 200) errors.push(`cards[${i}].title must be at most 200 characters`);

      if (!Array.isArray(card.body)) errors.push(`cards[${i}]: missing "body" array`);
      else {
        if (card.body.length > POSTER_MAX_BODY_ELEMENTS) errors.push(`cards[${i}].body supports at most ${POSTER_MAX_BODY_ELEMENTS} elements`);
        if (!hasPosterContent(card.body)) {
          errors.push(`cards[${i}].body must contain actual visible content`);
        }
        card.body.forEach((el, j) => {
          if (!el || typeof el !== 'object' || Array.isArray(el)) {
            errors.push(`cards[${i}].body[${j}] must be an object`);
            return;
          }
          if (!el.type) errors.push(`cards[${i}].body[${j}]: missing "type"`);
          else if (!POSTER_BODY_TYPES.has(el.type)) errors.push(`cards[${i}].body[${j}]: unknown type "${el.type}". Allowed: ${[...POSTER_BODY_TYPES].join(', ')}`);
          if (el.type === 'items') {
            const allowed = new Set(['type', 'entries']);
            for (const key of Object.keys(el)) if (!allowed.has(key)) errors.push(`cards[${i}].body[${j}]: unknown items field "${key}"`);
            if (!Array.isArray(el.entries) || el.entries.length < 1 || el.entries.length > 8) errors.push(`cards[${i}].body[${j}].entries must contain 1 to 8 entries`);
            else el.entries.forEach((e, k) => {
              if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(`cards[${i}].body[${j}].entries[${k}] must be an object`); return; }
              for (const key of Object.keys(e)) if (!['label', 'text'].includes(key)) errors.push(`cards[${i}].body[${j}].entries[${k}]: unknown field "${key}"`);
              if (typeof e.label !== 'string' || !e.label.trim() || e.label.length > 80) errors.push(`cards[${i}].body[${j}].entries[${k}].label must be a non-empty string of at most 80 characters`);
              if (typeof e.text !== 'string' || !e.text.trim() || e.text.length > 500) errors.push(`cards[${i}].body[${j}].entries[${k}].text must be a non-empty string of at most 500 characters`);
            });
          }
          if (['paragraph', 'heading', 'highlight'].includes(el.type)) {
            const maximum = el.type === 'heading' ? 240 : (el.type === 'highlight' ? 600 : 1200);
            if (typeof el.text !== 'string' || !el.text.trim() || el.text.length > maximum) errors.push(`cards[${i}].body[${j}].text must be a non-empty string of at most ${maximum} characters`);
          }
          if (el.type === 'data_row') {
            const allowed = new Set(['type', 'key', 'value']);
            for (const key of Object.keys(el)) if (!allowed.has(key)) errors.push(`cards[${i}].body[${j}]: unknown data_row field "${key}"`);
            if (typeof el.key !== 'string' || !el.key.trim() || el.key.length > 80) errors.push(`cards[${i}].body[${j}].key must be a non-empty string of at most 80 characters`);
            if (typeof el.value !== 'string' || !el.value.trim() || el.value.length > 240) errors.push(`cards[${i}].body[${j}].value must be a non-empty string of at most 240 characters`);
          }
          if (el.type === 'media') {
            const allowed = new Set(['type', 'path', 'alt', 'caption', 'fit', 'position']);
            for (const key of Object.keys(el)) if (!allowed.has(key)) errors.push(`cards[${i}].body[${j}]: unknown media field "${key}"`);
            if (!isSafeAbsoluteLocalPath(el.path)) errors.push(`cards[${i}].body[${j}].path must be an absolute local path, not a network share or device path`);
            if (typeof el.path === 'string' && el.path.length > 1024) errors.push(`cards[${i}].body[${j}].path must be at most 1024 characters`);
            if (typeof el.path === 'string' && !/\.(?:png|jpe?g|webp)$/i.test(el.path)) errors.push(`cards[${i}].body[${j}].path must use PNG, JPEG, or WebP`);
            if (checkLocalFiles && typeof el.path === 'string' && el.path.length <= 1024 && isSafeAbsoluteLocalPath(el.path)) {
              try {
                const stat = fs.statSync(el.path);
                if (!stat.isFile()) errors.push(`cards[${i}].body[${j}].path must point to a file`);
                if (stat.size > 32 * 1024 * 1024) errors.push(`cards[${i}].body[${j}].path must be at most 32 MiB`);
              } catch {
                errors.push(`cards[${i}].body[${j}].path must point to a readable local file`);
              }
            }
            if (typeof el.alt !== 'string' || el.alt.trim() === '' || el.alt.length > 240) errors.push(`cards[${i}].body[${j}].alt must be a non-empty string of at most 240 characters`);
            if (el.caption !== undefined && (typeof el.caption !== 'string' || el.caption.trim() === '' || el.caption.length > 500)) errors.push(`cards[${i}].body[${j}].caption must be a non-empty string of at most 500 characters when provided`);
            if (el.fit !== undefined && !['cover', 'contain'].includes(el.fit)) errors.push(`cards[${i}].body[${j}].fit must be cover or contain`);
            if (el.position !== undefined && !['center', 'top', 'bottom', 'left', 'right'].includes(el.position)) errors.push(`cards[${i}].body[${j}].position must be center, top, bottom, left, or right`);
          }
          if (el.type === 'process') {
            const allowed = new Set(['type', 'steps']);
            for (const key of Object.keys(el)) if (!allowed.has(key)) errors.push(`cards[${i}].body[${j}]: unknown process field "${key}"`);
            if (!Array.isArray(el.steps) || el.steps.length < 2 || el.steps.length > 5) errors.push(`cards[${i}].body[${j}].steps must contain 2 to 5 entries`);
            else el.steps.forEach((step, k) => {
              if (!step || typeof step !== 'object' || Array.isArray(step)) { errors.push(`cards[${i}].body[${j}].steps[${k}] must be an object`); return; }
              const stepFields = new Set(['label', 'title', 'text']);
              for (const key of Object.keys(step)) if (!stepFields.has(key)) errors.push(`cards[${i}].body[${j}].steps[${k}]: unknown field "${key}"`);
              if (typeof step.title !== 'string' || step.title.trim() === '' || step.title.length > 160) errors.push(`cards[${i}].body[${j}].steps[${k}].title must be a non-empty string of at most 160 characters`);
              if (step.label !== undefined && (typeof step.label !== 'string' || step.label.trim() === '' || step.label.length > 24)) errors.push(`cards[${i}].body[${j}].steps[${k}].label must be a non-empty string of at most 24 characters when provided`);
              if (step.text !== undefined && (typeof step.text !== 'string' || step.text.trim() === '' || step.text.length > 400)) errors.push(`cards[${i}].body[${j}].steps[${k}].text must be a non-empty string of at most 400 characters when provided`);
            });
          }


          if (el.type === 'reading_unit') {

            if (typeof el.quote !== 'string' || el.quote.trim() === '') {
              errors.push(`cards[${i}].body[${j}].quote must be a non-empty string`);
            }
            if (typeof el.quote === 'string' && el.quote.length > 1200) errors.push(`cards[${i}].body[${j}].quote must be at most 1200 characters`);
            if (el.thought !== undefined && typeof el.thought !== 'string') {
              errors.push(`cards[${i}].body[${j}].thought must be a string when provided`);
            }
            if (typeof el.thought === 'string' && el.thought.length > 1200) errors.push(`cards[${i}].body[${j}].thought must be at most 1200 characters`);
          }
        });
      }
    });
  }

  if (mode === 'editorial-image') {
    const cover = !input.use || input.use === 'cover';
    if (cover) {
      if (input.cover_series !== undefined && input.cover_series !== 'paper-wilderness') errors.push('cover_series must be paper-wilderness');
      if (!input.cover_art) errors.push('Paper Wilderness cover requires cover_art; supply a suitable local illustration or generate it before rendering');
      if (input.aspect && input.aspect !== 'wechat-cover') errors.push('Paper Wilderness currently supports only wechat-cover; other ratios need a verified series adaptation');
      if (input.cover_motif !== undefined || input.content_html !== undefined || input.composition_required === true) errors.push('Legacy cover motif/free composition retired; migrate to Paper Wilderness cover_art');
    } else if (input.cover_series !== undefined) errors.push('cover_series is only supported for cover use');

    if (Object.hasOwn(input, 'cover_art')) {
      const art = input.cover_art;
      if (!art || typeof art !== 'object' || Array.isArray(art)) {
        errors.push('cover_art must be an object with path and alt');
      } else {
        for (const key of Object.keys(art)) {
          if (!['path', 'alt'].includes(key)) errors.push(`Unknown cover_art field: ${key}`);
        }
        if (typeof art.path !== 'string' || art.path.length > 1024 || !isSafeAbsoluteLocalPath(art.path)) {
          errors.push('cover_art.path must be a safe absolute local path of at most 1024 characters');
        } else if (checkLocalFiles) {
          try { inspectLocalImage(art.path, { label: 'Cover art' }); }
          catch (error) { errors.push(`cover_art must point to a bounded static PNG, JPEG, or WebP: ${error.message}`); }
        }
        if (typeof art.alt !== 'string' || !art.alt.trim() || art.alt.length > 500) errors.push('cover_art.alt must be non-empty text of at most 500 characters');
      }
      if (input.use !== undefined && input.use !== 'cover') errors.push('cover_art requires use=cover or omitted use');
      if (input.aspect !== undefined && !['blog-hero', 'wechat-cover', 'cinematic'].includes(input.aspect)) errors.push('cover_art requires blog-hero, wechat-cover, or cinematic aspect');
      if (Object.hasOwn(input, 'cover_motif') || Object.hasOwn(input, 'content_html') || input.composition_required === true) errors.push('cover_art cannot be combined with cover_motif, content_html, or composition_required=true');
      validateCompositionSafety('editorial-image', input, errors);
    }
    if (input.editorial_tone && !EDITORIAL_TONES.has(input.editorial_tone)) {
      errors.push(`editorial_tone must be one of: ${[...EDITORIAL_TONES].join(', ')}`);
    }
    if (input.aspect && !EDITORIAL_ASPECTS.has(input.aspect)) {
      errors.push(`aspect must be one of: ${[...EDITORIAL_ASPECTS].join(', ')}`);
    }
    if (input.use && !EDITORIAL_USES.has(input.use)) {
      errors.push(`use must be one of: ${[...EDITORIAL_USES].join(', ')}`);
    }
    if (input.cover_motif && !EDITORIAL_COVER_MOTIFS.has(input.cover_motif)) {
      errors.push(`cover_motif must be one of: ${[...EDITORIAL_COVER_MOTIFS].join(', ')}`);
    }
    if (input.cover_motif && input.use && input.use !== 'cover') {
      errors.push('cover_motif is only supported when use is "cover" (or omitted, which defaults to cover behavior)');
    }

    const creativeUse = input.use === 'in-article' || input.use === 'metaphor';
    if (creativeUse && input.composition_required !== true) {
      errors.push(`editorial-image use=${input.use} requires composition_required=true with non-empty "content_html" and "custom_css"`);
    }
    if (input.composition_required === true || creativeUse) {
      if (typeof input.content_html !== 'string' || input.content_html.trim() === '') {
        errors.push('composition_required=true requires non-empty "content_html"');
      }
      if (typeof input.custom_css !== 'string' || input.custom_css.trim() === '') {
        errors.push('composition_required=true requires non-empty "custom_css"');
      }
      validateCompositionSafety('editorial-image', input, errors);
    }
  }

  if (mode === 'article-diagram') {
    if (!input.personal_layout) errors.push('article-diagram requires personal_layout; legacy families and formula-only cards are retired. Replan the source using a supported relation layout');
    for (const field of ['family', 'nodes', 'links', 'zones']) if (input[field] !== undefined) errors.push(`Retired article-diagram field ${field}; use structure.nodes/structure.relations and personal_layout`);
    try { require('./personal-diagram').analyze(input); }
    catch (error) { errors.push(error.message); }
    for (const key of ['formula', 'sentence']) if (typeof input[key] !== 'string' || !input[key].trim()) errors.push(`${key} must be non-empty text`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validate,
  SCHEMAS,
  LONG_BODY_TYPES,
  WHITEBOARD_STEP_TYPES,
  POSTER_BODY_TYPES,
  POSTER_VARIANTS,
  EDITORIAL_ASPECTS,
  EDITORIAL_USES,
  EDITORIAL_COVER_MOTIFS,
  EDITORIAL_TONES,
  ARTICLE_DIAGRAM_FAMILIES,
  ARTICLE_DIAGRAM_ASPECTS,
  ARTICLE_DIAGRAM_RENDER_PLANS,
};
