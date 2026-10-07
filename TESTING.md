# TESTING.md

All results below were produced in this repository's environment on
7 October 2026 (Node 22.22, Chromium 141 via Playwright 1.56.1).

```bash
npm test            # unit + integration (Vitest)
npm run test:e2e    # end to end + accessibility (Playwright, desktop and mobile)
```

## Results

| Suite | Count | Result |
|---|---|---|
| Unit and integration (Vitest) | 81 tests in 8 files | all pass |
| End to end (Playwright) | 8 journeys × desktop + Pixel 7 = 16 runs | all pass |
| Accessibility (axe-core, WCAG 2.1 A/AA) | 3 screens × light + dark × 2 viewports = 12 runs | all pass, after fixing 3 contrast/focus issues it found |

## What is covered

**Unit (`tests/unit`)**
- `nif.test.ts`: DNI, NIE, K/L/M, entity NIFs, digit-vs-letter control rules, nature F/J/E, malformed input.
- `text-values.test.ts`: AEAT text normalisation (accents, Ñ/Ç), field padding and overflow errors, ISO-8859-1 bytes, UTF-8/Windows-1252 decoding, 10 amount formats, years from dates and Excel serials, provinces from postcodes, names and aliases.
- `rules.test.ts`: recurrence under the 2025 wording (including the new current-year condition and the AEAT manual example), missing-history vs no-donation, cent-exact comparisons, every percentage branch.
- `engine.test.ts`: column detection, row extraction, aggregation by donor/key/in-kind, history from 182 files and from earlier-year rows, invalid/missing NIF reporting with rows and amounts, province blocking, refunds, name mismatches, invalid keys and amounts, company percentages.
- `boe182.test.ts`: entity validation; **every field of type 1 and type 2 records sliced by the design's positions**; CRLF and record length; ISO-8859-1; in-kind and representative fields; round trip writer → reader; reader without line breaks; revocations ignored.
- `files.test.ts`: CSV delimiter detection, quoted fields, title rows above the header, empty files.
- `iteration2.test.ts`: name-order detection and reordering (compound names, companies untouched), donor-level micro-patronage threshold, duplicates across files, CSV formula neutralisation, export formats.
- `perf.test.ts`: 70,000 rows / 5,000 donors parsed, computed and written in under 3 s (measured ≈0.47 s).

**End to end (`tests/e2e/journey.spec.ts`)**, against the production build with its CSP:
1. Landing → demo → issues → recurrent filter → donor detail with record → download; the downloaded file is checked (250-char lines, header, record count) and **no external request** is made.
2. Excel-style CSV (Windows-1252, title rows, decimal commas) → review → download blocked until entity data is valid → download; record contents checked byte by byte (Ñ, aggregation, 40 %).
3. Previous 182 files as history → recurrent donor at 45 %, others explained.
4. Missing columns → manual mapping → results.
5. Unsupported file → clear error.
6. Re-uploading the same file replaces it (no double counting).
7. "Nombre Apellidos" detection, reordering, and switching it off.
8. XLSX with real dates, numbers and province names.

**Accessibility (`tests/e2e/a11y.spec.ts`)**: axe-core on landing, empty tool and demo results, light and dark.

## Manual and visual QA performed

Screenshots via `scripts/qa-screenshots.mjs` (desktop 1280 px and mobile 390 px)
and targeted captures of the donor detail and download panel in both themes.
Found and fixed:
- Mobile page 746 px wide (grid child `min-width: auto` with the donor table).
- Amounts wrapping the € sign; hero example card clipping its badges.
- Mobile donor table unreadable: history columns hidden under 720 px (still in the detail).
- Warning alert with an invisible icon; province shown as a code in notes.
- Contrast of muted text and chip counts; non-focusable scroll region (axe).

Measured performance is in ARCHITECTURE.md.

## Not tested (and why)

- **Importing the file into the real AEAT form**: requires an entity's digital
  certificate or Cl@ve. This is the most important open test (VALIDATION T3).
- Downloads inside the claude.ai viewer (`downloads` capability): needs a human
  click on the published page.
- Firefox and Safari: only Chromium is available here. The code uses standard
  APIs (`TextDecoder`, `File`, `Blob`), but this is unverified.
- Screen reader walkthrough: only automated axe checks were run.
