/**
 * Schema validation for card-skill CLI.
 * Each schema defines required fields, optional fields, and type checks.
 */

const SCHEMAS = {
  big: {
    required: ['mode', 'phrase'],
    optional: ['design', 'accent_words', 'ghost_char', 'font_size', 'attribution', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      phrase: 'string',
      design: 'string',
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
    optional: ['design', 'kicker', 'subtitle', 'theme', 'source', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      title: 'string',
      body: 'array',
      design: 'string',
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
    optional: ['design', 'subtitle', 'accent_words', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      title: 'string',
      steps: 'array',
      design: 'string',
      subtitle: 'string',
      accent_words: 'array',
      logo: 'string',
      brand_name: 'string',
    },
  },
  poster: {
    required: ['mode', 'title', 'cards'],
    optional: ['design', 'subtitle', 'logo', 'brand_name'],
    types: {
      mode: 'string',
      title: 'string',
      cards: 'array',
      design: 'string',
      subtitle: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
  'editorial-image': {
    required: ['mode', 'title'],
    optional: [
      'design',
      'use',
      'aspect',
      'kicker',
      'subtitle',
      'visual_metaphor',
      'art_direction',
      'text_plan',
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
      use: 'string',
      aspect: 'string',
      kicker: 'string',
      subtitle: 'string',
      visual_metaphor: 'string',
      art_direction: 'string',
      text_plan: 'string',
      source: 'string',
      custom_css: 'string',
      content_html: 'string',
      logo: 'string',
      brand_name: 'string',
    },
  },
};

const LONG_BODY_TYPES = new Set(['paragraph', 'heading', 'highlight', 'blockquote', 'layer_card', 'section_break']);
const WHITEBOARD_STEP_TYPES = new Set(['chain', 'annotation', 'layers', 'insight']);
const POSTER_BODY_TYPES = new Set(['paragraph', 'heading', 'highlight', 'items', 'data_row', 'divider']);
const EDITORIAL_ASPECTS = new Set(['wechat-cover', 'blog-hero', 'body-3-2', 'body-4-3', 'cinematic', 'square']);
const EDITORIAL_USES = new Set(['cover', 'in-article', 'metaphor']);

function validate(input) {
  const errors = [];
  const mode = input.mode;

  if (!mode) {
    return { valid: false, errors: ['Missing required field: mode'] };
  }

  const schema = SCHEMAS[mode];
  if (!schema) {
    return { valid: false, errors: [`Unknown mode: "${mode}". CLI-eligible modes (Stable tier): big, long, whiteboard, poster, editorial-image`] };
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

  // Mode-specific body/step validation
  if (mode === 'long' && Array.isArray(input.body)) {
    input.body.forEach((el, i) => {
      if (!el.type) errors.push(`body[${i}]: missing "type"`);
      else if (!LONG_BODY_TYPES.has(el.type)) errors.push(`body[${i}]: unknown type "${el.type}". Allowed: ${[...LONG_BODY_TYPES].join(', ')}`);
      if (el.type === 'heading' && el.level !== undefined && ![2, 3].includes(el.level)) {
        errors.push(`body[${i}]: heading level must be 2 or 3, got ${el.level}`);
      }
    });
  }

  if (mode === 'whiteboard' && Array.isArray(input.steps)) {
    input.steps.forEach((step, i) => {
      if (!step.type) errors.push(`steps[${i}]: missing "type"`);
      else if (!WHITEBOARD_STEP_TYPES.has(step.type)) errors.push(`steps[${i}]: unknown type "${step.type}". Allowed: ${[...WHITEBOARD_STEP_TYPES].join(', ')}`);
      if (step.type === 'chain' && !Array.isArray(step.nodes)) errors.push(`steps[${i}]: chain requires "nodes" array`);
      if (step.type === 'layers' && !Array.isArray(step.items)) errors.push(`steps[${i}]: layers requires "items" array`);
    });
  }

  if (mode === 'poster' && Array.isArray(input.cards)) {
    if (input.cards.length === 0) errors.push('cards[] must have at least 1 card');
    input.cards.forEach((card, i) => {
      if (!Array.isArray(card.body)) errors.push(`cards[${i}]: missing "body" array`);
      else {
        card.body.forEach((el, j) => {
          if (!el.type) errors.push(`cards[${i}].body[${j}]: missing "type"`);
          else if (!POSTER_BODY_TYPES.has(el.type)) errors.push(`cards[${i}].body[${j}]: unknown type "${el.type}". Allowed: ${[...POSTER_BODY_TYPES].join(', ')}`);
          if (el.type === 'items' && Array.isArray(el.entries)) {
            el.entries.forEach((e, k) => {
              if (!e.label || !e.text) errors.push(`cards[${i}].body[${j}].entries[${k}]: items entries require "label" and "text"`);
            });
          }
        });
      }
    });
  }

  if (mode === 'editorial-image') {
    if (input.aspect && !EDITORIAL_ASPECTS.has(input.aspect)) {
      errors.push(`aspect must be one of: ${[...EDITORIAL_ASPECTS].join(', ')}`);
    }
    if (input.use && !EDITORIAL_USES.has(input.use)) {
      errors.push(`use must be one of: ${[...EDITORIAL_USES].join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validate, SCHEMAS, LONG_BODY_TYPES, WHITEBOARD_STEP_TYPES, POSTER_BODY_TYPES, EDITORIAL_ASPECTS, EDITORIAL_USES };
