// Measures landing load on a throttled link and demo render time. Needs `npm run preview` on :4173.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }); // "Fast 3G"-like
const t0 = Date.now();
await p.goto('http://127.0.0.1:4173/#inicio', { waitUntil: 'load' });
await p.waitForSelector('h1');
const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, bytes: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) + n.transferSize }; });
console.log('slow-3G landing', nav, 'wall', Date.now() - t0, 'ms');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
const t1 = Date.now();
await p.goto('http://127.0.0.1:4173/#demo');
await p.waitForSelector('[data-testid="donor-table"]');
console.log('demo: open → results rendered', Date.now() - t1, 'ms');
const mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null);
console.log('JS heap after demo (MB)', mem);
await b.close();
