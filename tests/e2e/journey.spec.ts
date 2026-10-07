import { expect, test, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { build182 } from '../../src/core/boe182';
import { buildDeclaration } from '../../src/core/engine';

const fixtures = path.resolve('tests/fixtures');

async function readDownload(d: Download): Promise<Buffer> {
  const p = await d.path();
  return readFileSync(p);
}

/** Collect every request that is not the page's own origin. The product must make none. */
function watchNetwork(page: Page): string[] {
  const external: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol !== 'data:' && url.protocol !== 'blob:') external.push(r.url());
  });
  return external;
}

async function fillEntity(page: Page) {
  await page.getByLabel('NIF de la entidad').fill('G12345674');
  await page.getByLabel('Denominación completa').fill('Asociación Ñandú de Prueba');
  await page.getByLabel('Teléfono de contacto').fill('912345678');
  await page.getByLabel('Persona de contacto').fill('Pérez Gómez Lucía');
}

test('landing explains the product and the demo produces a valid 182 file', async ({ page }) => {
  const external = watchNetwork(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Modelo 182');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /connect-src 'none'/);

  await page.getByRole('link', { name: /Probar con datos de ejemplo/ }).click();
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('donor-table')).toBeVisible();
  await expect(page.getByTestId('stats')).toContainText('donantes en el fichero');

  // Deliberate demo errors are reported with their fix.
  const issues = page.getByTestId('issues');
  await expect(issues).toContainText('no válido');
  await expect(issues).toContainText('Donativo sin NIF');
  await expect(issues).toContainText('Sin provincia');

  // Recurrence is explained per donor, and the exact record can be inspected.
  await page.getByRole('button', { name: /^Recurrentes/ }).click();
  const firstRow = page.locator('tr.donor').first();
  await expect(firstRow).toContainText('Recurrente');
  await firstRow.getByRole('button', { name: /Ver detalle/ }).click();
  await expect(page.getByText('Registro tal y como irá en el fichero')).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-182').click()]);
  expect(download.suggestedFilename()).toBe('182_2025_G12345674.txt');
  const bytes = await readDownload(download);
  const lines = bytes.toString('latin1').split('\r\n').filter(Boolean);
  expect(lines.length).toBeGreaterThan(30);
  for (const l of lines) expect(l).toHaveLength(250);
  expect(lines[0]!.slice(0, 8)).toBe('11822025');
  expect(Number(lines[0]!.slice(135, 144))).toBe(lines.length - 1);
  await expect(page.getByTestId('download-done')).toBeVisible();

  expect(external).toEqual([]);
});

test('own Excel CSV (Windows-1252, title rows) → review → entity required → download', async ({ page }) => {
  const external = watchNetwork(page);
  await page.goto('/#/app');
  await expect(page.getByText('Aquí verás los donantes')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles(path.join(fixtures, 'donativos_2026_excel.csv'));

  await expect(page.getByTestId('year-select')).toHaveValue('2026');
  await expect(page.getByTestId('filecard')).toContainText('2026: 5 filas');
  const table = page.getByTestId('donor-table');
  await expect(table).toContainText('Núñez Peña José');
  await expect(table).toContainText('Ibáñez Çelik Ayse');
  await expect(page.getByTestId('issues')).toContainText('87654321A');
  await expect(page.getByTestId('issues')).toContainText('ningún donante puede salir como recurrente');

  // Download without entity data: focus moves to the form and errors are shown.
  await page.getByTestId('download-182').click();
  await expect(page.getByText('NIF de la entidad no válido')).toBeVisible();
  await fillEntity(page);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-182').click()]);
  const text = (await readDownload(download)).toString('latin1');
  const lines = text.split('\r\n').filter(Boolean);
  expect(lines).toHaveLength(4); // declarant + José + Ayşe + company (Ana's NIF is invalid)
  expect(lines[0]).toContain('ASOCIACION ÑANDU DE PRUEBA');
  const jose = lines.find((l) => l.slice(17, 26) === '12345678Z')!;
  expect(jose.slice(35, 75).trim()).toBe('NUÑEZ PEÑA JOSE');
  expect(jose.slice(83, 96)).toBe('0000000040000'); // 300 + 100 aggregated
  expect(jose.slice(78, 83)).toBe('04000'); // above 250 €, not recurrent → 40 %
  const company = lines.find((l) => l.slice(17, 26) === 'B12345674')!;
  expect(company[104]).toBe('J');
  expect(external).toEqual([]);
});

test('previous 182 files are used as history for recurrence', async ({ page }) => {
  const entity = { nif: 'G12345674', name: 'Asociación', phone: '912345678', contactName: 'Pérez Lucía' };
  const row = (year: number, cents: number) => ({
    row: 2, source: 'h', nifRaw: '12345678Z', name: 'Núñez Peña José', amountCents: cents, amountRaw: '',
    year, postcode: '28013', provinceText: '', keyRaw: '', inKind: false, representativeNifRaw: '',
  });
  const f2024 = build182(buildDeclaration({ year: 2024, rows: [row(2024, 30000)], history: [] }), entity);
  const f2025 = build182(buildDeclaration({ year: 2025, rows: [row(2025, 40000)], history: [] }), entity);

  await page.goto('/#/app');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'donativos_2026_excel.csv', mimeType: 'text/csv', buffer: readFileSync(path.join(fixtures, 'donativos_2026_excel.csv')) },
    { name: f2024.fileName, mimeType: 'text/plain', buffer: Buffer.from(f2024.bytes) },
    { name: f2025.fileName, mimeType: 'text/plain', buffer: Buffer.from(f2025.bytes) },
  ]);
  await expect(page.getByText('Modelo 182 del ejercicio 2024 · 1 donantes')).toBeVisible();
  await expect(page.getByText('Historial usado: 2024 y 2025')).toBeVisible();
  const jose = page.locator('tr.donor', { hasText: 'Núñez Peña José' });
  await expect(jose).toContainText('Recurrente');
  await expect(jose).toContainText('45 %');
  // Other donors have no history → not recurrent, and the reason says so.
  await expect(page.locator('tr.donor', { hasText: 'Talleres' })).toContainText('No donó en 2024 ni en 2025');
});

test('missing columns can be mapped by hand', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByTestId('file-input').setInputFiles(path.join(fixtures, 'sin_columnas_claras.csv'));
  await expect(page.getByText('Falta la columna del nombre')).toBeVisible();
  await expect(page.getByText('Falta indicar algunas columnas')).toBeVisible();
  await page.getByLabel('Nombre completo o razón social').selectOption({ label: 'Persona' });
  await expect(page.getByTestId('donor-table')).toContainText('Ana');
});

test('unsupported files are rejected with a clear message', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByTestId('file-input').setInputFiles(path.join(fixtures, 'notas.pdf'));
  await expect(page.getByRole('alert')).toContainText('Formato no soportado: .pdf');
});
