# Changelog

## 0.1.0 — 2026-10-07

First working MVP.

### Added
- Discovery: seven opportunities evaluated; Modelo 182 selected (OPPORTUNITY.md).
- Core engine: NIF/NIE/CIF validation, AEAT text rules, province lookup, amounts in cents, recurrence under the 2025 wording, deduction percentages, aggregation with explained issues.
- Modelo 182 writer (type 1 and 2 records, ISO-8859-1, CRLF) and reader for previous years' files.
- CSV (UTF-8 and Windows-1252) and XLSX import with header detection, title-row skipping and manual mapping.
- Tool: drop zone, file cards, year inference, issues with rows and fixes, donor table with filters, search and per-donor explanation, record inspector, entity form, downloads (182 file, review CSV, history CSV).
- Landing page with the problem, the 2025 rule change (AEAT quote), privacy, scope, pricing hypotheses and FAQ.
- Ledger-inspired design system with light and dark themes; self-hosted fonts.
- Build-time CSP with `connect-src 'none'`; single-file and artifact builds.
- Privacy-preserving analytics events (no network sink).
- Tests: 81 unit/integration, 8 E2E journeys and 3 axe scans on desktop and mobile.
- Published as a private claude.ai Artifact.

### Changed after self-review (iteration 2)
- Re-uploading a file with the same name replaces it instead of double counting.
- "Nombre Apellidos" columns are detected and reordered for AEAT (switchable).
- Micro-patronage threshold computed on the donor's total.
- Warning for identical payments across files.
- Formula neutralisation in CSV exports.
- Mobile layout, contrast and focus fixes.
- Downloads via the artifact viewer's `downloads` capability.
