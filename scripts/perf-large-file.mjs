// Measures the UI with a 70,000-row CSV. Needs `npm run preview` on :4173.
import { chromium } from '@playwright/test';
const lines = ['Fecha;DNI;Nombre;Importe;CP'];
const L = 'TRWAGMYFPDXBNJZSQVHLCKE';
for (let i = 0; i < 5000; i++) {
  const n = 30000000 + i * 13; const nif = String(n) + L[n % 23];
  for (let m = 1; m <= 12; m++) lines.push(`01/${String(m).padStart(2, '0')}/2025;${nif};Socio ${i};12,50;28013`);
  lines.push(`01/06/2024;${nif};Socio ${i};150,00;28013`, `01/06/2023;${nif};Socio ${i};150,00;28013`);
}
const buf = Buffer.from(lines.join('\n'));
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:4173/#app');
const t0 = Date.now();
await p.getByTestId('file-input').setInputFiles({ name: 'grande.csv', mimeType: 'text/csv', buffer: buf });
await p.waitForSelector('[data-testid="donor-table"]');
console.log(`70,000 rows (${(buf.length / 1e6).toFixed(1)} MB) → results: ${Date.now() - t0} ms`);
const t1 = Date.now();
await p.getByLabel('Buscar donante').fill('Socio 4999');
await p.waitForSelector('text=Socio 4999');
console.log('search re-render:', Date.now() - t1, 'ms');
console.log('JS heap (MB):', await p.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6)));
await b.close();
