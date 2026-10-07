# ARCHITECTURE.md

## Decision in one line

A static, client-only single-page app: TypeScript + React, built with Vite. No
backend, no database, no AI. The smallest architecture that can do the job, and
the one that makes the privacy promise structurally true.

## Why no server

- The data is donors' NIFs and donations: personal data under GDPR. Not
  receiving it removes a whole class of risk, contracts (data processing
  agreements) and trust objections.
- The work is deterministic and small: about 1 s for 70,000 rows in the browser
  (measured, below). A server adds cost and nothing else.
- Hosting is any static host; the hosted preview is one HTML file.

## Why not an LLM

Every step is a rule with a single right answer (checksums, fixed-width
positions, a legal recurrence test). An LLM would add cost, latency,
non-determinism and, worst, sending donor NIFs to a third party. Column
detection, the one fuzzy task, is solved with header synonyms and a preview the
user can correct. Name-order detection uses a list of frequent given names, is
shown to the user, and can be switched off. See DECISIONS D-004.

## Layers

```
src/core/   pure domain logic, no DOM. Unit-tested.
  text.ts        AEAT text rules, ISO-8859-1 encoding, UTF-8/Windows-1252 decoding
  nif.ts         DNI/NIE/KLM/CIF checksum validation, donor nature F/J/E
  provinces.ts   province codes (design table), postcode and name lookup
  values.ts      amounts → integer cents, years from dates/Excel serials, flags
  mapping.ts     header synonyms → column mapping
  names.ts       "Nombre Apellidos" detection and reordering
  rules.ts       RULESET: recurrence and deduction percentages, with sources
  engine.ts      rows + history → Declaration (records, donors, issues, stats)
  boe182.ts      type 1/2 record writer, field map, reader of previous 182 files
  files.ts       File → table (CSV via Papa Parse, XLSX lazily via read-excel-file) or 182
  workflow.ts    sources (files + choices) → declaration; year guess; duplicates
  exports.ts     review CSV and history CSV
  demo.ts        deterministic fictitious demo data
src/ui/     React components: App (hash router), Landing, Tool, Sources,
            Results, Finish, design system in styles.css
src/analytics.ts  privacy-preserving event buffer (no network sink)
```

The UI never computes tax logic; it renders `Declaration` objects. Every rule
lives in `rules.ts` with its source in a comment, so a yearly rule change is a
one-file edit plus tests.

## Data model

```ts
DonationRow   { row, source, nifRaw, name, amountCents, year, dateText, postcode, provinceText, keyRaw, inKind, representativeNifRaw }
HistoryEntry  { nif, year, amountCents, source }          // from previous 182 files
Record182     { nif, representativeNif, name, province, key, percent, amountCents, inKind, nature, recurrent }
DonorResult   { nif, name, nature, province, totals{y-2,y-1,y}, verdict{recurrent, reason}, records, included, blockedBy, notes }
Issue         { severity, code, message, action, nif?, name?, rows?, amountCents? }
```

Money is integer cents throughout, so there is no float drift in comparisons
such as "2025 ≥ 2024".

### Data provenance

| Data | Label | Source |
|---|---|---|
| Field positions, province codes, text rules | REAL | AEAT register design for Modelo 182 (copy bundled in the OCA package, 2021 edition) |
| Recurrence rule from 2025 | REAL | AEAT Manual Renta 2025; Orden HAC/1430/2025 (via search snippets) |
| Percentages 80/40/45, 40/50, +5 for key B | REAL | RDL 6/2023 as summarised by AEAT, AEF, PwC |
| Demo donors | SAMPLE | Generated, fictitious, labelled in the UI |
| Whether AEAT's importer accepts the file | UNKNOWN | Not yet tested, see VALIDATION.md |

### Validation and normalisation

- NIF checksums and nature; invalid or missing NIF rows are excluded and listed
  with row numbers and amounts.
- Amounts accept `1.234,56 €`, `1,234.56`, `(15,00)` and numbers; invalid amounts
  are row-level errors.
- Years from dates, `dd/mm/yyyy`, ISO, Excel serials or a year column; rows
  without a year use a year the user sets per file.
- Text is uppercased, accents removed except Ñ and Ç, and disallowed characters
  dropped.
- Encodings: strict UTF-8 first, then Windows-1252 (Excel "CSV" in Spain).
- Limits: 15 MB per file, 100,000 rows.

## File format

The writer emits a type 1 record, then type 2 records, each 250 characters,
separated by CRLF and encoded as ISO-8859-1. Every position is covered by unit
tests that slice the record by the design's 1-based positions. The reader
accepts files with or without line breaks and ignores revocation records.

## Security and privacy

- Production CSP: `connect-src 'none'`, `form-action 'none'`, `object-src 'none'`,
  `base-uri 'none'`. The browser refuses any network request from the page. The
  E2E suite also asserts no external requests during full journeys.
- No cookies. `localStorage` only keeps the entity's own details (NIF, name,
  phone, contact) for convenience, wrapped in try/catch.
- Inputs are parsed as data only: CSV via Papa Parse, XLSX via read-excel-file
  (no macros or formulas executed), 182 files via fixed slicing. Text is
  rendered through React, so cell content cannot inject HTML.
- File size and row caps bound memory use.
- Dependencies: 4 runtime packages (react, react-dom, papaparse,
  read-excel-file) plus self-hosted fonts. `npm audit`: 0 vulnerabilities. I
  removed a build plugin whose dependency chain had a high-severity advisory
  and wrote a 30-line equivalent (D-007).

## Hosting modes

| Mode | Command | Notes |
|---|---|---|
| Static site | `npm run build` → `dist/` | Any static host (Netlify, Cloudflare Pages, GitHub Pages, S3) |
| Single file | `npm run build:single` → `dist-single/index.html` | Works from `file://`, can be emailed to a treasurer |
| claude.ai Artifact | `dist-single/cuadra.html` | Body-only format; downloads go through the viewer's `downloads` capability |

## Measured performance

Measured in this environment with Chromium 141 on the production build
(`scripts/perf-landing.mjs`, `scripts/perf-large-file.mjs`, `tests/unit/perf.test.ts`).

| Measure | Result |
|---|---|
| Landing, throttled to ~1.6 Mbps / 150 ms RTT: first contentful paint | 1.13 s |
| Bytes transferred for the landing | 134 KB (gzip); the XLSX reader (19 KB gzip) loads only when an .xlsx is dropped |
| Demo: open → results rendered | 0.12 s |
| 70,000 rows / 5,000 donors / 3.1 MB CSV → results in the UI | 1.0 s |
| Same, engine only in Node (parse + compute + write) | 0.47 s |
| Search re-render on 5,000 donors | 46 ms |
| JS heap after the 70,000-row file | 57 MB |

The donor table paginates at 50 rows, so the DOM stays small for large files.
