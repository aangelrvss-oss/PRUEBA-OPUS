# Cuadra · Modelo 182

**Cuadra turns a small nonprofit's donations spreadsheet into the AEAT Modelo 182
file, with every donor's recurrence calculated under the rule that applies from
ejercicio 2025, and explained.** It runs entirely in the browser: no account, no
server, and a Content-Security-Policy that stops the page from sending data
anywhere.

- **Live preview (private until shared):** https://claude.ai/artifact/AJbEz5jZ2v5HGebJwqk4TX
- **Who it is for:** the volunteer treasurer of a foundation or public-utility
  association (Ley 49/2002) who files the 182 every January from a spreadsheet.
- **Status:** working MVP. **No real users yet.** The output file has been
  checked against the official register design by tests. It has **not yet been
  imported into the real AEAT form**. That is the first validation step, see
  [VALIDATION.md](VALIDATION.md).

## The one-minute tour

1. Open the page and click **«Probar con datos de ejemplo»** (fictitious data:
   36 donors, three years of history, deliberate errors).
2. See the summary: donors in the file, amount, recurrent donors, problems.
3. Read the problems: invalid NIF, missing NIF, missing postcode, one NIF with
   two names. Each gives its row and the fix.
4. Expand a donor: amounts for the three years, why they are or are not
   recurrent, the deduction percentage, and the exact 250-character record.
5. Click **«Descargar fichero 182»** and import it in the AEAT form.

## What it does

| Input | Output |
|---|---|
| This year's donations: CSV or XLSX, one row per payment or per donor, any column names | `182_<year>_<NIF>.txt`: fixed-width ISO-8859-1 file for the AEAT form's «Importar» button |
| Optional history: the 182 `.txt` files of the two previous years, or spreadsheets of those years | Review CSV per donor (totals, recurrence, reason, records) |
| Entity data (NIF, name, phone, contact) | History CSV to drop in next year |

Core logic: NIF/NIE/CIF checksums, donor nature (F/J/E), province from postcode
or name, aggregation per donor/key/in-kind, recurrence = donated in both previous
years and neither the previous nor the current year dropped, percentages 80/40/45
(85/45/50 for priority activities; 40/50 and 45/55 for companies).

Out of scope, and stated in the UI: political parties, protected patrimonies,
revocations, regional (CCAA) deductions, foral territories.

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # 81 unit and integration tests
npm run test:e2e     # 28 Playwright runs: 8 journeys + 3 axe scans (light/dark), desktop and mobile
npm run build        # dist/ (static site, any host)
npm run build:single # dist-single/cuadra.html (one self-contained page)
```

Node 20+ (developed on Node 22).

## Repository map

| Path | What |
|---|---|
| `src/core/` | Pure TypeScript domain logic: no DOM, fully unit-tested |
| `src/core/rules.ts` | The tax rules (recurrence, percentages) and their sources |
| `src/core/boe182.ts` | 182 file writer, field map and reader for previous years |
| `src/core/engine.ts` | Rows → declaration: aggregation, validation, issues |
| `src/ui/` | React UI: landing, tool, design system (`styles.css`) |
| `tests/unit`, `tests/e2e` | Vitest and Playwright suites |
| `scripts/` | QA screenshots, artifact packaging |

## Documents

[OPPORTUNITY](OPPORTUNITY.md) · [PRODUCT-THESIS](PRODUCT-THESIS.md) ·
[ARCHITECTURE](ARCHITECTURE.md) · [VALIDATION](VALIDATION.md) ·
[BUSINESS-MODEL](BUSINESS-MODEL.md) · [GO-TO-MARKET](GO-TO-MARKET.md) ·
[ANALYTICS](ANALYTICS.md) · [BUILD](BUILD.md) · [TESTING](TESTING.md) ·
[DECISIONS](DECISIONS.md) · [CRITIQUE](CRITIQUE.md) · [CHANGELOG](CHANGELOG.md)

## Disclaimer

Cuadra is not an AEAT service and gives no tax advice. It follows the published
register design; the entity files the return itself and should review it.
