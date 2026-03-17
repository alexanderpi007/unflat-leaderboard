#!/usr/bin/env node
/**
 * Generate the 1200x630 OG image PNG from og-image.html
 *
 * Usage:
 *   npx puppeteer browsers install chrome   # one-time setup
 *   node scripts/generate-og-image.js        # outputs og-image.png
 */

const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  const htmlPath = path.resolve(__dirname, '..', 'og-image.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Wait for Inter font to load
  await page.evaluateHandle('document.fonts.ready');

  const outPath = path.resolve(__dirname, '..', 'og-image.png');
  await page.screenshot({ path: outPath, type: 'png' });

  await browser.close();
  console.log(`OG image saved to ${outPath} (1200x630 @2x)`);
})();
