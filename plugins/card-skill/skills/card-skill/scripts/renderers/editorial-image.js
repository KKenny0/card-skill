/**
 * Editorial image renderer for card-skill CLI.
 * Provides an aspect-safe Quiet Paper canvas with an open composition slot.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { escapeHtml, escapePhrase } = require('../lib/escape');
const { getDesign, resolveEditorialDesignName } = require('../lib/designs');

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/infograph_template.html');
const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');

const ASPECTS = {
  'wechat-cover': { width: 1080, height: 460, label: '2.35:1' },
  'blog-hero': { width: 1080, height: 608, label: '16:9' },
  'body-3-2': { width: 1080, height: 720, label: '3:2' },
  'body-4-3': { width: 1080, height: 810, label: '4:3' },
  cinematic: { width: 1080, height: 463, label: '21:9' },
  square: { width: 1080, height: 1080, label: '1:1' },
};

function defaultAspect(input) {
  if (input.aspect) return input.aspect;
  if (input.use === 'in-article') return 'body-3-2';
  if (input.use === 'metaphor') return 'blog-hero';
  return 'blog-hero';
}

function renderDefaultContent(input, aspect) {
  const kicker = input.kicker ? `<p class="editorial-kicker">${escapeHtml(input.kicker)}</p>` : '';
  const title = escapePhrase(input.title);
  const subtitle = input.subtitle ? `<p class="editorial-subtitle">${escapeHtml(input.subtitle)}</p>` : '';
  const metaphor = escapeHtml(input.visual_metaphor || input.art_direction || '');

  return `
    <section class="editorial-frame editorial-${aspect.key}" data-metaphor="${metaphor}">
      <div class="editorial-copy">
        ${kicker}
        <h1>${title}</h1>
        ${subtitle}
      </div>
      <div class="editorial-visual" aria-hidden="true">
        <div class="paper-stack paper-stack-a"></div>
        <div class="paper-stack paper-stack-b"></div>
        <div class="paper-mark"></div>
        <div class="paper-thread"></div>
      </div>
    </section>
  `;
}

function baseCss(input, design, aspect) {
  const textPlan = input.text_plan ? `/* text plan: ${input.text_plan.replace(/\*\//g, '')} */` : '';

  // Dynamic h1 font-size: title visual width vs copy column capacity.
  // Copy column ~453px in the 2-col grid. At 84px CJK ≈ 5 chars/line (orphan-prone);
  // 64px ≈ 7 chars/line; 52px ≈ 9 chars/line. Pick the smallest size that lets the
  // title wrap cleanly without producing a 1-2 char orphan last line.
  // CJK weight 2, Latin/digit 1, space 0.5. Title weight ≤10 fits at 84px,
  // ≤14 fits at 64px, otherwise 52px.
  const titleWeight = [...(input.title || '')].reduce((sum, c) => {
    if (/\s/.test(c)) return sum + 0.5;
    if (c.charCodeAt(0) > 0x3400) return sum + 2;
    return sum + 1;
  }, 0);
  const titleFontSize = aspect.height <= 500 ? 64
                      : titleWeight <= 10 ? 84
                      : titleWeight <= 14 ? 64
                      : 52;

  return `
    :root {
      --bg: ${design.canvas};
      --green: ${design.surface2};
      --pink: ${design.accent};
      --accent: ${design.accent};
      --ink: ${design.ink};
      --ink-light: ${design.inkMuted};
      --surface-1: ${design.surface1};
      --surface-2: ${design.surface2};
      --hairline: ${design.hairline};
      --radius: ${design.radius};
    }

    html, body {
      width: ${aspect.width}px;
      height: ${aspect.height}px;
      overflow: hidden;
    }

    .page {
      width: ${aspect.width}px;
      height: ${aspect.height}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .colophon {
      display: ${input.logo || input.brand_name || input.source ? 'flex' : 'none'};
    }

    .editorial-frame {
      position: relative;
      min-height: 0;
      flex: 1 1 auto;
      padding: ${aspect.height <= 500 ? '40px 60px 24px' : '58px 76px 40px'};
      display: grid;
      grid-template-columns: minmax(0, 1.03fr) minmax(280px, 0.97fr);
      gap: 48px;
      align-items: center;
      isolation: isolate;
    }

    .editorial-kicker {
      font: 500 24px/1 var(--mono);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 22px;
    }

    .editorial-copy h1 {
      max-width: 680px;
      font-family: 'DM Serif Display', 'XiangcuiDengcusong', serif;
      font-size: ${titleFontSize}px;
      line-height: 1.03;
      letter-spacing: 0;
      color: var(--ink);
      text-wrap: balance;
    }

    .editorial-subtitle {
      max-width: 620px;
      margin-top: 18px;
      font: 400 ${aspect.height <= 500 ? '32px' : '38px'}/1.35 var(--zh-serif);
      color: var(--ink-light);
      text-wrap: balance;
    }

    .editorial-visual {
      position: relative;
      height: ${aspect.height <= 500 ? Math.max(190, aspect.height - 205) : Math.max(250, Math.min(460, aspect.height - 180))}px;
      min-width: 280px;
    }

    .paper-stack {
      position: absolute;
      border: 1px solid var(--hairline);
      background: color-mix(in srgb, var(--surface-1) 86%, var(--bg));
      border-radius: var(--radius);
    }

    .paper-stack-a {
      width: 58%;
      height: 72%;
      right: 15%;
      top: 6%;
      transform: rotate(-4deg);
    }

    .paper-stack-b {
      width: 64%;
      height: 76%;
      right: 2%;
      top: 16%;
      transform: rotate(5deg);
      background: color-mix(in srgb, var(--surface-2) 54%, transparent);
    }

    .paper-mark {
      position: absolute;
      right: 20%;
      top: 36%;
      width: 34%;
      height: 2px;
      background: var(--accent);
      transform: rotate(-10deg);
      opacity: 0.72;
    }

    .paper-thread {
      position: absolute;
      right: 8%;
      bottom: 17%;
      width: 48%;
      height: 48%;
      border-left: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
      transform: skewX(-17deg);
      opacity: 0.9;
    }

    .editorial-square {
      grid-template-columns: 1fr;
      align-content: center;
    }

    .editorial-square .editorial-visual {
      position: absolute;
      inset: auto 70px 80px auto;
      width: 46%;
      opacity: 0.88;
    }

    ${textPlan}
  `;
}

function render(input, outputHtmlPath) {
  const designName = resolveEditorialDesignName(input);
  const design = designName ? getDesign(designName) : null;
  if (!design) throw new Error(`Design not found: ${input.design || input.editorial_tone}`);

  const aspectKey = defaultAspect(input);
  const aspect = { ...ASPECTS[aspectKey], key: aspectKey };
  if (!aspect.width) throw new Error(`Unknown editorial-image aspect: ${aspectKey}`);

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const logoUrl = input.logo ? escapeHtml(pathToFileURL(path.resolve(input.logo)).href) : '';
  const brandName = input.brand_name ? escapeHtml(input.brand_name) : '';
  const sourceLine = input.source ? `<span class="info-source">${escapeHtml(input.source)}</span>` : '';
  const contentHtml = input.content_html || renderDefaultContent(input, aspect);
  const customCss = `${baseCss(input, design, aspect)}\n${input.custom_css || ''}`;

  template = template.replaceAll('{{CUSTOM_CSS}}', customCss);
  template = template.replaceAll('{{CONTENT_HTML}}', contentHtml);
  template = template.replaceAll('{{SOURCE_LINE}}', sourceLine);
  template = template.replaceAll('{{LOGO}}', logoUrl);
  template = template.replaceAll('{{BRAND_NAME}}', brandName);
  template = template.replaceAll('{{FONT_BASE}}', FONT_DIR.replace(/\\/g, '/'));
  const toneAttr = input.editorial_tone ? ` data-editorial-tone="${escapeHtml(input.editorial_tone)}"` : '';
  template = template.replace(
    '<div class="page">',
    `<div class="page" data-card-mode="editorial-image" data-card-design="${escapeHtml(designName)}"${toneAttr}>`,
  );

  if (!logoUrl && !brandName) {
    template = template.replace(/\s*<div class="who">[\s\S]*?<\/div>/, '');
  } else {
    if (!logoUrl) template = template.replace(/\s*<img src="" alt="">/, '');
    if (!brandName) template = template.replace(/\s*<span><\/span>/, '');
  }
  if (!logoUrl && !brandName && !sourceLine) {
    template = template.replace(/\s*<div class="colophon">\s*<\/div>/, '');
  }

  fs.writeFileSync(outputHtmlPath, template, 'utf-8');

  return {
    htmlPath: outputHtmlPath,
    captureWidth: aspect.width,
    captureHeight: aspect.height,
    fullpage: false,
  };
}

module.exports = { render, ASPECTS, defaultAspect };
