#!/usr/bin/env node

/**
 * wjy-mockup Assertion Checker
 *
 * Runs automated assertions from evals.json against HTML/PNG outputs.
 * Uses Playwright to extract computed styles from rendered HTML.
 *
 * Usage:
 *   node evals/check-assertions.mjs --eval 1 --html /tmp/eval1.html --png /tmp/eval1.png
 *   node evals/check-assertions.mjs --eval 4 --html-dir /tmp/eval4/ --png-dir ./workspace/eval-4/with_skill/outputs/
 *   node evals/check-assertions.mjs --eval 1-9 --workspace ./wjy-mockup-workspace/iteration-5/
 *   node evals/check-assertions.mjs --all --workspace ./wjy-mockup-workspace/iteration-5/
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVALS_PATH = path.join(__dirname, 'evals.json');

// ── CLI Parsing ──────────────────────────────────────────────

function parseArgs(args) {
  const opts = {
    eval: null,
    html: null,
    png: null,
    htmlDir: null,
    pngDir: null,
    workspace: null,
    all: false,
    config: 'with_skill',
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--eval': opts.eval = args[++i]; break;
      case '--html': opts.html = args[++i]; break;
      case '--png': opts.png = args[++i]; break;
      case '--html-dir': opts.htmlDir = args[++i]; break;
      case '--png-dir': opts.pngDir = args[++i]; break;
      case '--workspace': opts.workspace = args[++i]; break;
      case '--config': opts.config = args[++i]; break;
      case '--all': opts.all = true; break;
      case '--json': opts.json = true; break;
      case '--help':
        console.log(`Usage: node check-assertions.mjs [options]
  --eval <id|range>   Eval ID (1) or range (1-9)
  --html <path>       Single HTML file to check
  --png <path>        Single PNG file to check
  --html-dir <path>   Directory with HTML files (poster mode)
  --png-dir <path>    Directory with PNG files
  --workspace <path>  Workspace root for batch mode
  --config <name>     with_skill (default) or without_skill
  --all               Run all evals
  --json              Output JSON report
  --help              Show this help`);
        process.exit(0);
    }
  }
  return opts;
}

// ── Color Utilities ──────────────────────────────────────────

function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  // Handle hex
  const hexMatch = str.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length >= 6) {
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    }
  }
  // Handle rgb(r, g, b)
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  return null;
}

function colorDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

// ── Font Size Extraction via Playwright ──────────────────────

async function extractFontSizes(page) {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('body *');
    const results = [];
    for (const el of elements) {
      const cs = window.getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize);
      const text = el.textContent?.trim() || '';
      if (text.length > 0 && fontSize > 0) {
        results.push({
          tag: el.tagName,
          fontSize,
          text: text.substring(0, 80),
          classes: el.className,
        });
      }
    }
    return results;
  });
}

async function extractCssVars(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const cs = window.getComputedStyle(root);
    const vars = {};
    // Collect all custom properties from root
    const allStyles = document.styleSheets;
    for (const sheet of allStyles) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root') {
            for (const prop of rule.style) {
              if (prop.startsWith('--')) {
                vars[prop] = cs.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch { /* cross-origin */ }
    }
    return vars;
  });
}

async function extractAllColors(page) {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('body *');
    const colors = new Set();
    for (const el of elements) {
      const cs = window.getComputedStyle(el);
      if (cs.color && cs.color !== 'rgba(0, 0, 0, 0)') colors.add(cs.color);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(cs.backgroundColor);
    }
    return [...colors];
  });
}

async function extractFontFamilies(page) {
  return page.evaluate(() => {
    const families = new Set();
    const elements = document.querySelectorAll('body *');
    for (const el of elements) {
      const cs = window.getComputedStyle(el);
      if (el.textContent?.trim()) {
        // Extract primary font from font-family string
        const ff = cs.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        families.add(ff);
      }
    }
    return [...families];
  });
}

// ── Assertion Checkers ───────────────────────────────────────

async function checkCssFontSizeMin(context, auto) {
  const fontSizes = context.fontSizes;
  if (!fontSizes || fontSizes.length === 0) return { pass: false, evidence: 'No text elements found' };

  // Filter to body-level elements:
  // - P, LI, TD are always body text
  // - DIV/SPAN only if they look like body text (long text, no badge/label class)
  const labelPatterns = /badge|label|tag|meta|source|num|kicker|ref|attr|byline|colophon|page-indicator|subtitle|caption/i;
  const bodyElements = fontSizes.filter(e => {
    if (['H1','H2','H3','H4','H5','H6'].includes(e.tag)) return false;
    if (e.text.length < 10) return false;
    if (e.fontSize < 20) return false;
    // Exclude elements with subtitle/label class names
    if (labelPatterns.test(e.classes)) return false;
    // P, LI, TD are body text (if they passed the class filter)
    if (['P','LI','TD'].includes(e.tag)) return true;
    // DIV/SPAN: only include if text is long enough to be body text
    return e.text.length > 30;
  });

  if (bodyElements.length === 0) return { pass: true, evidence: 'No body text elements (title/card without body text)' };

  const minSize = Math.min(...bodyElements.map(e => e.fontSize));
  const pass = minSize >= auto.min;
  return {
    pass,
    evidence: `${minSize}px ${pass ? '>=' : '<'} ${auto.min}px`,
    details: { minSize, threshold: auto.min, bodyCount: bodyElements.length }
  };
}

async function checkCssFontSizeMax(context, auto) {
  const fontSizes = context.fontSizes;
  if (!fontSizes || fontSizes.length === 0) return { pass: false, evidence: 'No text elements found' };

  const maxSize = Math.max(...fontSizes.map(e => e.fontSize));
  const pass = maxSize >= auto.min;
  return {
    pass,
    evidence: `max ${maxSize}px ${pass ? '>=' : '<'} ${auto.min}px`,
    details: { maxSize, threshold: auto.min }
  };
}

async function checkCssFontRatio(context, auto) {
  const fontSizes = context.fontSizes;
  if (!fontSizes || fontSizes.length === 0) return { pass: false, evidence: 'No text elements found' };

  const maxSize = Math.max(...fontSizes.map(e => e.fontSize));
  const minSize = Math.min(...fontSizes.filter(e => e.text.length > 3).map(e => e.fontSize));
  if (minSize === 0) return { pass: false, evidence: 'Min font size is 0' };

  const ratio = maxSize / minSize;
  const pass = ratio >= auto.min;
  return {
    pass,
    evidence: `${ratio.toFixed(2)}:1 ${pass ? '>=' : '<'} ${auto.min}:1`,
    details: { ratio: Math.round(ratio*100)/100, maxSize, minSize, threshold: auto.min }
  };
}

async function checkCssVarMatch(context, auto) {
  const cssVars = context.cssVars;
  if (!cssVars || Object.keys(cssVars).length === 0) {
    // Fallback: parse from HTML source
    const srcMatch = context.htmlSource?.match(/:root\s*\{([^}]+)\}/s);
    if (srcMatch) {
      const parsed = {};
      for (const line of srcMatch[1].split(';')) {
        const m = line.match(/(--[\w-]+)\s*:\s*(.+)/);
        if (m) parsed[m[1]] = m[2].trim();
      }
      context.cssVars = parsed;
      return checkCssVarMatch(context, auto);
    }
    return { pass: false, evidence: 'No CSS variables found' };
  }

  const results = [];
  let allPass = true;
  const tolerance = auto.tolerance || 20;

  for (const [varName, expected] of Object.entries(auto.vars)) {
    const actual = cssVars[varName];
    if (!actual) {
      results.push(`${varName}: not found`);
      allPass = false;
      continue;
    }
    const actualColor = parseColor(actual);

    // Support array of accepted values: "--accent": ["#533afd", "#635bff"]
    const expectedList = Array.isArray(expected) ? expected : [expected];
    let bestDist = Infinity;
    let bestMatch = expectedList[0];

    for (const exp of expectedList) {
      const expectedColor = parseColor(exp);
      const dist = colorDistance(actualColor, expectedColor);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = exp;
      }
    }

    const pass = bestDist <= tolerance;
    if (!pass) allPass = false;
    results.push(`${varName}: ${actual} vs ${bestMatch} (Δ${Math.round(bestDist)})`);
  }

  return {
    pass: allPass,
    evidence: results.join(', '),
    details: { tolerance }
  };
}

async function checkElementCountMin(context, auto) {
  const page = context.page;
  if (!page) return { pass: false, evidence: 'No page loaded' };

  const count = await page.locator(auto.selector).count();
  const pass = count >= auto.min;
  return {
    pass,
    evidence: `${count} elements ${pass ? '>=' : '<'} ${auto.min} (${auto.selector})`,
    details: { count, threshold: auto.min }
  };
}

async function checkElementCountMax(context, auto) {
  const page = context.page;
  if (!page) return { pass: false, evidence: 'No page loaded' };

  const count = await page.locator(auto.selector).count();
  const pass = count <= auto.max;
  return {
    pass,
    evidence: `${count} elements ${pass ? '<=' : '>'} ${auto.max} (${auto.selector})`,
    details: { count, threshold: auto.max }
  };
}

async function checkTextMatch(context, auto) {
  const text = context.visibleText || '';
  const re = new RegExp(auto.pattern, auto.flags || '');
  const matches = text.match(re);
  const pass = !!matches;
  return {
    pass,
    evidence: pass ? `Found "${matches[0]}"` : `Pattern "${auto.pattern}" not found`,
  };
}

async function checkTextNotMatch(context, auto) {
  const page = context.page;
  if (!page) return { pass: false, evidence: 'No page loaded' };

  const text = await (auto.selector ? page.locator(auto.selector).first().textContent() : context.visibleText) || '';
  const re = new RegExp(auto.pattern, auto.flags || '');
  const matches = text.match(re);
  const pass = !matches;
  return {
    pass,
    evidence: pass ? `"${auto.pattern}" not found` : `Found "${matches[0]}" in ${auto.selector || 'body'}`,
  };
}

async function checkHtmlMatch(context, auto) {
  const html = context.htmlSource || '';
  const re = new RegExp(auto.pattern, auto.flags || '');
  const matches = html.match(re);
  const pass = !!matches;
  return {
    pass,
    evidence: pass ? `Found "${matches[0].substring(0, 60)}"` : `Pattern not found`,
  };
}

async function checkHtmlNotMatch(context, auto) {
  const html = context.htmlSource || '';
  const re = new RegExp(auto.pattern, auto.flags || '');
  const matches = html.match(re);
  const pass = !matches;
  return {
    pass,
    evidence: pass ? 'No matching patterns found' : `Found "${matches[0].substring(0, 60)}"`,
  };
}

async function checkFileExists(context, auto) {
  const pngFiles = context.pngFiles;
  const pass = pngFiles && pngFiles.length > 0;
  return {
    pass,
    evidence: pass ? `${pngFiles.length} PNG file(s) found` : 'No PNG files found',
  };
}

async function checkFileCountMin(context, auto) {
  const pngFiles = context.pngFiles;
  const count = pngFiles ? pngFiles.length : 0;
  const pass = count >= auto.min;
  return {
    pass,
    evidence: `${count} file(s) ${pass ? '>=' : '<'} ${auto.min}`,
  };
}

async function checkCssSpacingVaries(context, auto) {
  const page = context.page;
  if (!page) return { pass: false, evidence: 'No page loaded' };

  const values = await page.evaluate(([sel, prop]) => {
    const els = document.querySelectorAll(sel);
    const vals = [];
    els.forEach(el => {
      const v = window.getComputedStyle(el)[prop];
      if (v && v !== '0px') vals.push(v);
    });
    return vals;
  }, [auto.selector, auto.property]);

  if (values.length < 2) {
    return { pass: true, evidence: `Only ${values.length} element(s) with spacing, skip variance check` };
  }

  const unique = new Set(values);
  const pass = unique.size >= 2;
  return {
    pass,
    evidence: `${unique.size} unique values out of ${values.length} total (${pass ? 'varies' : 'uniform'})`,
  };
}

async function checkHtmlFontFamilies(context, auto) {
  const families = context.fontFamilies || [];
  const pass = families.length >= auto.min;
  return {
    pass,
    evidence: `${families.length} font families ${pass ? '>=' : '<'} ${auto.min}: [${families.join(', ')}]`,
  };
}

// ── Main Check Runner ────────────────────────────────────────

const CHECKERS = {
  css_font_size_min: checkCssFontSizeMin,
  css_font_size_max: checkCssFontSizeMax,
  css_font_ratio: checkCssFontRatio,
  css_var_match: checkCssVarMatch,
  element_count_min: checkElementCountMin,
  element_count_max: checkElementCountMax,
  text_match: checkTextMatch,
  text_not_match: checkTextNotMatch,
  html_match: checkHtmlMatch,
  html_not_match: checkHtmlNotMatch,
  file_exists: checkFileExists,
  file_count_min: checkFileCountMin,
  css_spacing_varies: checkCssSpacingVaries,
  html_font_families: checkHtmlFontFamilies,
};

async function runAssertions(evalDef, htmlPaths, pngPaths, browser) {
  const results = [];

  for (const assertion of evalDef.assertions) {
    const auto = assertion.auto;
    if (!auto) {
      results.push({ name: assertion.name, status: 'SKIP', evidence: 'No auto field' });
      continue;
    }
    if (auto.type === 'manual') {
      results.push({ name: assertion.name, status: 'NEEDS_REVIEW', evidence: assertion.check });
      continue;
    }

    const checker = CHECKERS[auto.type];
    if (!checker) {
      results.push({ name: assertion.name, status: 'ERROR', evidence: `Unknown type: ${auto.type}` });
      continue;
    }

    // For file-based checks, combine all results
    if (auto.type === 'file_exists' || auto.type === 'file_count_min') {
      const context = { pngFiles: pngPaths };
      try {
        const result = await checker(context, auto);
        results.push({ name: assertion.name, status: result.pass ? 'PASS' : 'FAIL', evidence: result.evidence, details: result.details });
      } catch (err) {
        results.push({ name: assertion.name, status: 'ERROR', evidence: err.message });
      }
      continue;
    }

    // For HTML-based checks, run on each HTML file and aggregate
    let allPass = true;
    let evidences = [];

    for (const htmlPath of htmlPaths) {
      const page = await browser.newPage();
      try {
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle', timeout: 15000 });

        const fontSizes = await extractFontSizes(page);
        const cssVars = await extractCssVars(page);
        const visibleText = await page.textContent('body');
        const htmlSource = fs.readFileSync(htmlPath, 'utf-8');
        const fontFamilies = await extractFontFamilies(page);

        const context = {
          page,
          fontSizes,
          cssVars,
          visibleText,
          htmlSource,
          fontFamilies,
          pngFiles: pngPaths,
        };

        const result = await checker(context, auto);
        if (!result.pass) allPass = false;
        const shortName = path.basename(htmlPath);
        evidences.push(`[${shortName}] ${result.evidence}`);
      } catch (err) {
        allPass = false;
        evidences.push(`[${path.basename(htmlPath)}] ERROR: ${err.message}`);
      } finally {
        await page.close();
      }
    }

    results.push({
      name: assertion.name,
      status: allPass ? 'PASS' : 'FAIL',
      evidence: evidences.join(' | '),
    });
  }

  return results;
}

// ── File Discovery ───────────────────────────────────────────

function findEvalFiles(evalId, workspace, config) {
  const evalDir = path.join(workspace, `eval-${evalId}`, config);
  const outputsDir = path.join(evalDir, 'outputs');

  const htmlFiles = [];
  const pngFiles = [];

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (entry.endsWith('.html')) htmlFiles.push(fullPath);
      if (entry.endsWith('.png')) pngFiles.push(fullPath);
    }
  };

  // PNG from workspace outputs directory
  if (fs.existsSync(outputsDir)) {
    for (const entry of fs.readdirSync(outputsDir)) {
      if (entry.endsWith('.png')) pngFiles.push(path.join(outputsDir, entry));
    }
  }

  // HTML from /tmp (where agents write HTML files)
  const tmpDir = '/tmp';
  if (fs.existsSync(tmpDir)) {
    const htmlPattern = new RegExp(`^wjy_mockup_eval${evalId}_${config}.*\\.html$`);
    for (const entry of fs.readdirSync(tmpDir)) {
      if (entry.match(htmlPattern)) {
        htmlFiles.push(path.join(tmpDir, entry));
      }
    }
  }

  return { htmlFiles, pngFiles };
}

// ── Output Formatting ────────────────────────────────────────

function formatReport(evalDef, results) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const review = results.filter(r => r.status === 'NEEDS_REVIEW').length;
  const skip = results.filter(r => r.status === 'SKIP').length;
  const error = results.filter(r => r.status === 'ERROR').length;
  const total = results.length;

  let out = `\nEval ${evalDef.id}: ${evalDef.name}\n`;
  out += `${'─'.repeat(50)}\n`;

  for (const r of results) {
    const icon = { PASS: '\u2713', FAIL: '\u2717', NEEDS_REVIEW: '~', SKIP: '-', ERROR: '!' }[r.status];
    const label = r.status.padEnd(13);
    out += `  ${icon} ${r.name.padEnd(30)} ${label}`;
    if (r.evidence && r.status !== 'NEEDS_REVIEW') {
      const short = r.evidence.length > 80 ? r.evidence.substring(0, 77) + '...' : r.evidence;
      out += ` ${short}`;
    }
    out += '\n';
  }

  out += `${'─'.repeat(50)}\n`;
  out += `  Score: ${pass}/${total} PASS`;
  if (fail > 0) out += `, ${fail} FAIL`;
  if (review > 0) out += `, ${review} NEEDS_REVIEW`;
  if (skip > 0) out += `, ${skip} SKIP`;
  if (error > 0) out += `, ${error} ERROR`;
  out += '\n';

  return out;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const evalsData = JSON.parse(fs.readFileSync(EVALS_PATH, 'utf-8'));

  // Determine which evals to run
  let evalIds = [];
  if (opts.all) {
    evalIds = evalsData.evals.map(e => e.id);
  } else if (opts.eval) {
    if (opts.eval.includes('-')) {
      const [start, end] = opts.eval.split('-').map(Number);
      for (let i = start; i <= end; i++) evalIds.push(i);
    } else {
      evalIds = [parseInt(opts.eval)];
    }
  }

  if (evalIds.length === 0) {
    console.error('No evals specified. Use --eval <id> or --all');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const allReports = [];

  for (const id of evalIds) {
    const evalDef = evalsData.evals.find(e => e.id === id);
    if (!evalDef) {
      console.error(`Eval ${id} not found`);
      continue;
    }

    let htmlFiles = [];
    let pngFiles = [];

    if (opts.html) {
      htmlFiles = [opts.html];
    }
    if (opts.png) {
      pngFiles = [opts.png];
    }
    if (opts.htmlDir) {
      for (const f of fs.readdirSync(opts.htmlDir)) {
        if (f.endsWith('.html')) htmlFiles.push(path.join(opts.htmlDir, f));
      }
    }
    if (opts.pngDir) {
      for (const f of fs.readdirSync(opts.pngDir)) {
        if (f.endsWith('.png')) pngFiles.push(path.join(opts.pngDir, f));
      }
    }

    // Auto-discover from workspace if no explicit paths
    if (htmlFiles.length === 0 && opts.workspace) {
      const found = findEvalFiles(id, opts.workspace, opts.config);
      htmlFiles = found.htmlFiles;
      pngFiles = [...pngFiles, ...found.pngFiles];
    }

    if (htmlFiles.length === 0) {
      console.error(`No HTML files found for eval ${id}`);
      allReports.push({ evalId: id, name: evalDef.name, results: [], error: 'No HTML files' });
      continue;
    }

    const results = await runAssertions(evalDef, htmlFiles, pngFiles, browser);
    const report = { evalId: id, name: evalDef.name, results };
    allReports.push(report);

    if (!opts.json) {
      console.log(formatReport(evalDef, results));
    }
  }

  await browser.close();

  if (opts.json) {
    console.log(JSON.stringify(allReports, null, 2));
  }

  // Summary
  if (!opts.json && allReports.length > 1) {
    let totalPass = 0, totalFail = 0, totalReview = 0, totalAuto = 0;
    for (const report of allReports) {
      for (const r of report.results) {
        if (r.status === 'PASS') totalPass++;
        if (r.status === 'FAIL') totalFail++;
        if (r.status === 'NEEDS_REVIEW') totalReview++;
        if (r.status !== 'NEEDS_REVIEW' && r.status !== 'SKIP') totalAuto++;
      }
    }
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Aggregate: ${totalPass}/${totalAuto} PASS, ${totalFail} FAIL, ${totalReview} NEEDS_REVIEW`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
