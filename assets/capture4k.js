#!/usr/bin/env node

const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const args = process.argv.slice(2);
  const htmlPath = args[0];
  const outputPath = args[1];
  const width = parseInt(args[2]) || 1080;
  const height = parseInt(args[3]) || 800;
  const dpr = parseFloat(args[4]) || 2;
  const fullpage = args[5] === 'fullpage';

  if (!htmlPath || !outputPath) {
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
  await page.waitForTimeout(800);

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
