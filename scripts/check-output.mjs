#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    html: null,
    png: null,
    width: 1080,
    height: 800,
    dpr: 2,
    fullpage: false,
    fix: false,
    skipPng: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--html':
        opts.html = argv[++i];
        break;
      case '--png':
        opts.png = argv[++i];
        break;
      case '--width':
        opts.width = parseInt(argv[++i], 10) || opts.width;
        break;
      case '--height':
        opts.height = parseInt(argv[++i], 10) || opts.height;
        break;
      case '--dpr':
        opts.dpr = parseFloat(argv[++i]) || opts.dpr;
        break;
      case '--fullpage':
        opts.fullpage = true;
        break;
      case '--fix':
        opts.fix = true;
        break;
      case '--skip-png':
        opts.skipPng = true;
        break;
      case '--json':
        opts.json = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`card-skill output checker

Usage:
  node scripts/check-output.mjs --html <file> --png <file> --width 1080 --height 800 [--fullpage]
  node scripts/check-output.mjs --html <file> --fix --skip-png

Options:
  --html <file>   HTML file to inspect
  --png <file>    PNG file to verify
  --width <px>    Capture viewport width (default: 1080)
  --height <px>   Capture viewport height (default: 800)
  --dpr <n>       Device pixel ratio used for PNG capture (default: 2)
  --fullpage      The PNG was captured as a full-page image
  --fix           Apply low-risk HTML guards before checking
  --skip-png      Do not require a PNG file
  --json          Print JSON report
`);
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, details };
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function fileUrl(filePath) {
  return 'file://' + path.resolve(filePath).replace(/\\/g, '/');
}

function applySafeFixes(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  let fixed = false;

  const logoUrl = fileUrl(path.join(ROOT, 'assets', 'logo.png'));
  const avatarUrl = fileUrl(path.join(ROOT, 'assets', 'avatar.png'));
  const fontBase = path.join(ROOT, 'assets', 'fonts').replace(/\\/g, '/');

  const replacements = [
    ['{{LOGO}}', logoUrl],
    ['{{AVATAR}}', avatarUrl],
    ['{{PHOTO}}', avatarUrl],
    ['{{FONT_BASE}}', fontBase],
  ];

  for (const [needle, value] of replacements) {
    if (html.includes(needle)) {
      html = html.replaceAll(needle, value);
      fixed = true;
    }
  }

  if (!html.includes('data-card-output-check')) {
    const guard = `<style data-card-output-check>
html, body { max-width: 100%; overflow-x: hidden; }
img { max-width: 100%; height: auto; }
</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${guard}\n</head>`);
      fixed = true;
    }
  }

  if (fixed) fs.writeFileSync(htmlPath, html, 'utf-8');
  return fixed;
}

function readPngSize(pngPath) {
  const buf = fs.readFileSync(pngPath);
  const signature = '89504e470d0a1a0a';
  if (buf.length < 24 || buf.subarray(0, 8).toString('hex') !== signature) {
    return null;
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length,
  };
}

function checkPng(opts, issues) {
  if (opts.skipPng) return;
  if (!opts.png) {
    issues.push(issue('error', 'png_missing_arg', 'PNG path was not provided.'));
    return;
  }

  const pngPath = path.resolve(opts.png);
  if (!fs.existsSync(pngPath)) {
    issues.push(issue('error', 'png_missing', 'PNG file was not generated.', { pngPath }));
    return;
  }

  const stat = fs.statSync(pngPath);
  if (stat.size < 1024) {
    issues.push(issue('error', 'png_empty', 'PNG file is empty or too small.', { pngPath, bytes: stat.size }));
    return;
  }

  const size = readPngSize(pngPath);
  if (!size) {
    issues.push(issue('error', 'png_invalid', 'PNG file is not a valid PNG image.', { pngPath }));
    return;
  }

  const expectedWidth = Math.round(opts.width * opts.dpr);
  if (Math.abs(size.width - expectedWidth) > 2) {
    issues.push(issue('error', 'png_width_mismatch', 'PNG width does not match the capture settings.', {
      expected: expectedWidth,
      actual: size.width,
    }));
  }

  if (!opts.fullpage) {
    const expectedHeight = Math.round(opts.height * opts.dpr);
    if (Math.abs(size.height - expectedHeight) > 2) {
      issues.push(issue('error', 'png_height_mismatch', 'PNG height does not match the fixed canvas settings.', {
        expected: expectedHeight,
        actual: size.height,
      }));
    }
  }
}

function checkPlaceholders(html, issues) {
  const activeHtml = stripHtmlComments(html);
  const matches = activeHtml.match(/\{\{[^}]+\}\}/g) || [];
  const unique = [...new Set(matches)];
  if (unique.length > 0) {
    issues.push(issue('error', 'unreplaced_placeholder', 'HTML still contains unreplaced placeholders.', {
      placeholders: unique.slice(0, 10),
    }));
  }
}

async function inspectPage(opts, issues) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: opts.fullpage ? 5000 : opts.height },
      deviceScaleFactor: opts.dpr,
    });
    const page = await context.newPage();
    await page.goto(fileUrl(opts.html), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const report = await page.evaluate(({ width, height, fullpage }) => {
      const viewportWidth = width;
      const viewportHeight = fullpage ? document.documentElement.scrollHeight : height;
      const doc = document.documentElement;
      const body = document.body;

      function isVisible(el) {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return cs.display !== 'none'
          && cs.visibility !== 'hidden'
          && parseFloat(cs.opacity || '1') > 0
          && rect.width > 1
          && rect.height > 1;
      }

      function hasVisibleTextChild(el) {
        return [...el.children].some(child => isVisible(child) && (child.textContent || '').trim().length > 0);
      }

      function getLineBreaks(el, minFontSize = 36) {
        const cs = window.getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize) || 0;
        if (fontSize < minFontSize) return null;

        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length < 6) return null;

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            return (node.nodeValue || '').trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        });

        const chars = [];
        const range = document.createRange();
        let node;
        while ((node = walker.nextNode())) {
          for (let i = 0; i < node.nodeValue.length; i++) {
            const ch = node.nodeValue[i];
            if (!ch || /\r|\n|\t/.test(ch)) continue;
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = [...range.getClientRects()].find(item => item.width > 0 || item.height > 0);
            if (!rect) continue;
            chars.push({
              ch,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            });
          }
        }
        range.detach();

        if (chars.length === 0) return null;

        const tolerance = Math.max(3, fontSize * 0.18);
        const lines = [];
        for (const item of chars.sort((a, b) => a.top - b.top || a.left - b.left)) {
          let line = lines.find(candidate => Math.abs(candidate.top - item.top) <= tolerance);
          if (!line) {
            line = { top: item.top, chars: [] };
            lines.push(line);
          }
          line.chars.push(item);
          line.top = (line.top + item.top) / 2;
        }

        const normalized = lines
          .sort((a, b) => a.top - b.top)
          .map(line => {
            const sorted = line.chars.sort((a, b) => a.left - b.left);
            return {
              text: sorted.map(item => item.ch).join('').replace(/\s+/g, ' ').trim(),
              width: Math.round(Math.max(...sorted.map(item => item.right)) - Math.min(...sorted.map(item => item.left))),
            };
          })
          .filter(line => line.text.length > 0 && line.width > 0);

        if (normalized.length < 2) return null;

        const widths = normalized.map(line => line.width);
        const maxWidth = Math.max(...widths);
        const last = normalized[normalized.length - 1];
        return {
          tag: el.tagName,
          className: typeof el.className === 'string' ? el.className : '',
          text: text.slice(0, 100),
          fontSize,
          maxWidth,
          lineCount: normalized.length,
          lines: normalized,
          lastLineRatio: maxWidth > 0 ? last.width / maxWidth : 1,
        };
      }

      const badImages = [...document.images]
        .filter(img => isVisible(img) && (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0))
        .map(img => ({
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || '',
        }));

      const bounds = [];
      const textSizes = [];
      const headlineLines = [];
      const meaningfulTags = new Set(['P', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'DIV', 'BLOCKQUOTE']);
      const ignoreBounds = /texture|noise|grain|background|ghost|watermark|bleed|decor/i;
      const headlinePattern = /title|headline|hero|cover|phrase|editorial|subtitle|caption|statement/i;

      for (const el of document.querySelectorAll('body *')) {
        if (!isVisible(el)) continue;
        const rect = el.getBoundingClientRect();
        const className = typeof el.className === 'string' ? el.className : '';
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();

        if (!ignoreBounds.test(className)) {
          const offLeft = rect.left < -2;
          const offRight = rect.right > viewportWidth + 2;
          const offTop = !fullpage && rect.top < -2;
          const offBottom = !fullpage && rect.bottom > viewportHeight + 2;
          if (offLeft || offRight || offTop || offBottom) {
            bounds.push({
              tag: el.tagName,
              className,
              text: text.slice(0, 80),
              rect: {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                right: Math.round(rect.right),
                bottom: Math.round(rect.bottom),
              },
            });
          }
        }

        if (meaningfulTags.has(el.tagName) && text && !hasVisibleTextChild(el)) {
          const cs = window.getComputedStyle(el);
          textSizes.push({
            tag: el.tagName,
            className,
            text: text.slice(0, 80),
            fontSize: parseFloat(cs.fontSize),
          });
        }

        if (['H1', 'H2'].includes(el.tagName) || headlinePattern.test(className)) {
          const lineBreaks = getLineBreaks(el, /subtitle|caption|statement/i.test(className) ? 28 : 36);
          if (lineBreaks) headlineLines.push(lineBreaks);
        }
      }

      return {
        scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
        clientWidth: doc.clientWidth,
        scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
        clientHeight: doc.clientHeight,
        badImages,
        bounds: bounds.slice(0, 20),
        textSizes,
        headlineLines: headlineLines.slice(0, 20),
      };
    }, { width: opts.width, height: opts.height, fullpage: opts.fullpage });

    if (report.scrollWidth > opts.width + 2) {
      issues.push(issue('error', 'horizontal_overflow', 'Page is wider than the capture viewport.', {
        scrollWidth: report.scrollWidth,
        viewportWidth: opts.width,
      }));
    }

    if (!opts.fullpage && report.scrollHeight > opts.height + 2) {
      issues.push(issue('error', 'vertical_crop_risk', 'Fixed-canvas output is taller than the capture viewport.', {
        scrollHeight: report.scrollHeight,
        viewportHeight: opts.height,
      }));
    }

    if (report.badImages.length > 0) {
      issues.push(issue('error', 'image_load_failed', 'One or more images failed to load.', {
        images: report.badImages.slice(0, 10),
      }));
    }

    if (report.bounds.length > 0) {
      issues.push(issue('error', 'element_out_of_bounds', 'Visible elements extend outside the captured area.', {
        elements: report.bounds,
      }));
    }

    const labelPattern = /badge|label|tag|meta|source|num|kicker|eyebrow|ref|attr|byline|colophon|page-indicator|running-title|header|subtitle|caption|brand|footer/i;
    const bodyText = report.textSizes.filter(item => {
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(item.tag)) return false;
      if (labelPattern.test(item.className)) return false;
      return item.text.length >= 12 && item.fontSize >= 16;
    });
    const smallBodyText = bodyText.filter(item => item.fontSize < 36);
    if (smallBodyText.length > 0) {
      issues.push(issue('error', 'body_text_too_small', 'Body text is below the 36px readability floor.', {
        elements: smallBodyText.slice(0, 10),
      }));
    }

    const annotationText = report.textSizes.filter(item => {
      if (!labelPattern.test(item.className)) return false;
      if (/colophon|brand|footer|page-indicator/i.test(item.className)) return false;
      return item.text.length >= 4 && item.fontSize > 0 && item.fontSize < 24;
    });
    if (annotationText.length > 0) {
      issues.push(issue('warning', 'annotation_text_small', 'Some annotation text is below the 24px guideline.', {
        elements: annotationText.slice(0, 10),
      }));
    }

    const bannedModeLabels = new Set([
      'IN-ARTICLE IMAGE',
      'IN ARTICLE IMAGE',
      'EDITORIAL IMAGE',
      'BLOG HERO',
      'BLOG COVER',
      'WECHAT COVER',
      'ARTICLE COVER',
      'COVER IMAGE',
    ]);
    const visibleModeLabels = report.textSizes.filter(item => {
      const normalized = item.text.toUpperCase().replace(/\s+/g, ' ').trim();
      return bannedModeLabels.has(normalized);
    });
    if (visibleModeLabels.length > 0) {
      issues.push(issue('error', 'mode_label_visible', 'Output mode labels should not appear in the artwork.', {
        elements: visibleModeLabels.slice(0, 10),
      }));
    }

    const briefLeakPatterns = [
      /给\s*[^，。；:：]{1,48}(这一节|这节|本节|段落|章节)?\s*使用/,
      /(用作|作为)\s*(正文|文章|章节|段落|小节)?\s*配图/,
      /(这张图|该图|此图)\s*(用于|用来|适合|作为)/,
      /(安静|低干扰).{0,16}(停顿|视觉换气|正文|配图)/,
      /像文章中间的?一次停顿/,
      /\b(visual pause|in-article illustration|section illustration)\b/i,
    ];
    const visibleBriefLeaks = report.textSizes.filter(item => {
      const normalized = item.text.replace(/\s+/g, ' ').trim();
      return briefLeakPatterns.some(pattern => pattern.test(normalized));
    });
    if (visibleBriefLeaks.length > 0) {
      issues.push(issue('error', 'editorial_brief_visible', 'Editorial-image brief or usage notes should not appear in the artwork.', {
        elements: visibleBriefLeaks.slice(0, 10),
      }));
    }

    const badHeadlineBreaks = report.headlineLines.filter(item => {
      const last = item.lines[item.lines.length - 1];
      const lastText = last?.text || '';
      const cjkOnly = lastText.replace(/[^\u3400-\u9fff]/g, '');
      const hasShortCjkLine = item.lines.some(line => {
        const lineText = line.text || '';
        const lineCjk = lineText.replace(/[^\u3400-\u9fff]/g, '');
        return lineCjk.length > 0 && lineText.length <= 2 && line.width < 180;
      });
      const isShortLastLine = item.lineCount >= 2 && item.lastLineRatio < 0.24 && last.width < 180;
      const isCjkOrphan = item.lineCount >= 2 && cjkOnly.length > 0 && lastText.length <= 2;
      const isTooManyLines = item.lineCount > 3 && item.fontSize >= 48;
      return hasShortCjkLine || isShortLastLine || isCjkOrphan || isTooManyLines;
    });
    if (badHeadlineBreaks.length > 0) {
      issues.push(issue('error', 'text_line_break_bad', 'Headline or short-text line breaks do not meet the visual standard.', {
        elements: badHeadlineBreaks.map(item => ({
          tag: item.tag,
          className: item.className,
          text: item.text,
          lineCount: item.lineCount,
          lastLineRatio: Number(item.lastLineRatio.toFixed(2)),
          lines: item.lines,
        })).slice(0, 10),
      }));
    }
  } finally {
    await browser.close();
  }
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.pass) {
    const suffix = report.fixed ? ' (safe fixes applied)' : '';
    console.log(`PASS${suffix}: ${path.resolve(report.html)}`);
  } else {
    console.error(`FAIL: ${path.resolve(report.html)}`);
  }

  for (const item of report.issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.error(`${prefix} ${item.code}: ${item.message}`);
    if (Object.keys(item.details || {}).length > 0) {
      console.error(`  ${JSON.stringify(item.details)}`);
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.html) throw new Error('Missing --html <file>');
  opts.html = path.resolve(opts.html);
  if (!fs.existsSync(opts.html)) throw new Error(`HTML file not found: ${opts.html}`);
  if (opts.png) opts.png = path.resolve(opts.png);

  const fixed = opts.fix ? applySafeFixes(opts.html) : false;
  const issues = [];
  const html = fs.readFileSync(opts.html, 'utf-8');

  checkPlaceholders(html, issues);
  checkPng(opts, issues);
  await inspectPage(opts, issues);

  const report = {
    pass: !issues.some(item => item.severity === 'error'),
    fixed,
    html: opts.html,
    png: opts.png,
    issues,
  };

  printReport(report, opts.json);
  process.exit(report.pass ? 0 : 1);
}

main().catch(err => {
  const report = {
    pass: false,
    fixed: false,
    html: null,
    png: null,
    issues: [issue('error', 'checker_crashed', err.message)],
  };
  printReport(report, process.argv.includes('--json'));
  process.exit(1);
});
