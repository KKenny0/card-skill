#!/usr/bin/env node

const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const args = process.argv.slice(2);
  const measureIndex = args.indexOf('--measure');
  const measureMode = measureIndex >= 0;
  const htmlPath = args[0];
  const outputPath = measureMode ? null : args[1];
  const width = parseInt(args[measureMode ? measureIndex + 1 : 2]) || 1080;
  const height = parseInt(args[measureMode ? measureIndex + 2 : 3]) || 800;
  const dpr = parseFloat(args[measureMode ? measureIndex + 3 : 4]) || 2;
  const fullpage = !measureMode && args[5] === 'fullpage';

  if (!htmlPath) {
    console.error('Usage: node capture4k.js <html> <png> [width] [height] [dpr] [fullpage]');
    console.error('       node capture4k.js <html> --measure [width] [height] [dpr]');
    process.exit(1);
  }
  if (!measureMode && !outputPath) {
    console.error('Usage: node capture4k.js <html> <png> [width] [height] [dpr] [fullpage]');
    process.exit(1);
  }

  const resolvedHtml = path.resolve(htmlPath);

  let chromium;
  try {
    chromium = require('playwright').chromium;
  } catch {
    console.error('Playwright not found.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height: fullpage ? 5000 : height },
    deviceScaleFactor: dpr
  });
  const page = await context.newPage();

  const fileUrl = pathToFileURL(resolvedHtml).href;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  // Wait for web/local fonts to actually load before screenshotting.
  // The old `waitForTimeout(800)` was a fixed guess; on slow disks the 23MB
  // XiangcuiDengcusong TTF can still be mid-decode at 800ms, producing a
  // silent fallback to system CJK fonts.
  await page.evaluate(() => document.fonts.ready);

  if (measureMode) {
    // For article-diagram two-pass layout: return rendered bbox of every
    // [data-measure-id] element as JSON on stdout. Caller computes positions
    // from these sizes and writes final HTML for the screenshot pass.
    const bboxes = await page.evaluate(() => {
      const result = {};
      document.querySelectorAll('[data-measure-id]').forEach(el => {
        const r = el.getBoundingClientRect();
        result[el.dataset.measureId] = {
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
      return result;
    });
    await browser.close();
    console.log(JSON.stringify(bboxes));
    return;
  }

  if (fullpage) {
    // Measure actual content height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.screenshot({
      path: path.resolve(outputPath),
      type: 'png',
      clip: { x: 0, y: 0, width, height: bodyHeight }
    });
  } else {
    await page.screenshot({
      path: path.resolve(outputPath),
      type: 'png',
      clip: { x: 0, y: 0, width, height }
    });
  }

  await browser.close();
  console.log('OK: ' + path.resolve(outputPath));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
