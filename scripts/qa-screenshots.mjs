// Visual QA helper: captures the main states at desktop and mobile widths.
// Usage: node scripts/qa-screenshots.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:4173';
const out = process.argv[3] ?? 'qa-screenshots';
const shots = [
  { name: 'landing', url: '#/', full: true },
  { name: 'tool-empty', url: '#/app', full: true },
  { name: 'tool-demo', url: '#/app?demo', full: true, wait: '[data-testid="donor-table"]' },
];
const viewports = [
  { tag: 'desktop', width: 1280, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];
const browser = await chromium.launch();
for (const scheme of (process.env.SCHEMES ?? 'light').split(',')) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    for (const s of shots) {
      await page.goto(`${base}/${s.url}`);
      if (s.wait) await page.waitForSelector(s.wait);
      await page.waitForTimeout(400);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width > vp.width + 1) console.log(`OVERFLOW ${s.name} ${vp.tag}: scrollWidth ${width}`);
      await page.screenshot({ path: `${out}/${s.name}-${vp.tag}-${scheme}.png`, fullPage: s.full });
    }
    if (errors.length) console.log(`console errors (${vp.tag}/${scheme}):`, errors);
    await ctx.close();
  }
}
await browser.close();
console.log('done');
