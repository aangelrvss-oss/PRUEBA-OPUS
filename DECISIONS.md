# DECISIONS.md

## D-001 — Build for Modelo 182, not a better-known problem
**Decision:** Build a Modelo 182 tool for small Spanish nonprofits.
**Why:** Strict format plus a rule that changed in 2025 plus tools that lag it. It is buildable without credentials, and value can be shown in one minute.
**Alternatives:** UK Form 4A checker, domestic-worker payroll, allergen matrix, GPSR pack, Schengen calculator, IRAV calculator (OPPORTUNITY.md).
**Evidence:** AEAT Manual Renta 2025; Orden HAC/1430/2025; the OCA module's outdated defaults; vendors marketing 182 generation.
**Tradeoff:** Niche and seasonal market, unproven willingness to pay.

## D-002 — Browser-only, no backend
**Decision:** All processing in the browser; production CSP `connect-src 'none'`.
**Why:** Donor NIFs are personal data. Not receiving them removes risk, data processing agreements and trust objections. Measured speed is enough (1 s for 70k rows).
**Alternatives:** A server API (simpler analytics, saved history); desktop app.
**Evidence:** Performance measurements; GDPR scope reasoning.
**Tradeoff:** No accounts, no stored history, no lead capture or analytics sink. Those come later as opt-in features.

## D-003 — Use previous 182 files as the history source
**Decision:** Accept the `.txt` files filed in previous years (and spreadsheets) as history.
**Why:** Entities already have them; recurrence needs per-donor totals for two prior years, which those files contain exactly.
**Alternatives:** Ask for one spreadsheet with three years; store history server-side.
**Evidence:** The record layout contains NIF, key and amount per donor.
**Tradeoff:** Entities that typed into the AEAT form may not have the file. Spreadsheets cover that case.

## D-004 — No AI
**Decision:** No LLM anywhere.
**Why:** Every step has one right answer. AI adds cost and non-determinism, and sending NIFs to a third party contradicts D-002.
**Alternatives:** LLM column mapping; LLM name parsing.
**Evidence:** Header synonyms plus a preview resolved every fixture; names are handled by a transparent heuristic with a switch.
**Tradeoff:** Unusual headers need a manual pick (one select per column).

## D-005 — Implement the 2025 recurrence wording only; support ejercicio ≥ 2025
**Decision:** Recurrence = donations in both previous years, and amount(N-1) ≥ amount(N-2) and amount(N) ≥ amount(N-1). The year selector starts at 2025.
**Why:** It is the rule for every return Cuadra will help with (filed January 2026 onwards).
**Alternatives:** Also implement pre-2025 rules for complementary returns of old years.
**Evidence:** AEAT Manual Renta 2025; Orden HAC/1430/2025.
**Tradeoff:** Complementary returns for 2024 and earlier are not supported.

## D-006 — Default "not recurrent" when history is missing, and say so loudly
**Decision:** Without data for a previous year, a donor gets "2" (not recurrent), with a top warning and a per-donor "falta historial" state.
**Why:** Declaring "1" without evidence could give donors a deduction they are not entitled to. "2" is the conservative error, and the warning makes it visible.
**Tradeoff:** Recurrent donors lose 5 points if the user ignores the warning.

## D-007 — Replace the single-file plugin with 30 lines of our own
**Decision:** Removed `vite-plugin-singlefile` and wrote an inline plugin.
**Why:** `npm audit` reported 3 high-severity advisories through its `micromatch`/`braces` chain. The need is trivial: inline one entry chunk and one CSS file.
**Tradeoff:** We own a little build code.

## D-008 — Self-hosted fonts (IBM Plex Sans and Plex Mono)
**Decision:** Bundle fonts instead of Google Fonts.
**Why:** A privacy product should not call Google on load. Plex Mono suits the fixed-width record, the product's signature visual.
**Tradeoff:** About 100 KB of fonts; they load in parallel and do not block first paint.

## D-009 — Spanish UI, English repository docs
**Decision:** The product speaks Spanish; engineering and business docs are in English.
**Why:** Users are Spanish treasurers; the docs are for reviewers and developers.

## D-010 — Integer cents everywhere
**Decision:** All money as integer cents.
**Why:** Recurrence compares amounts across years; float drift would flip verdicts (tested).

## D-011 — Re-uploading a file with the same name replaces it (iteration 2)
**Decision:** Same file name → replace, with a visible notice.
**Why:** The fix loop is "correct the spreadsheet, drop it again". Before this, that silently doubled every donation.
**Alternatives:** Ask each time; detect identical content.
**Tradeoff:** Two different files with the same name can't be loaded together (rare; rename one).

## D-012 — Detect "Nombre Apellidos" with a given-names list (iteration 2)
**Decision:** Heuristic detection (≥60 % of names start with a frequent given name), on by default when detected, visible and switchable; individuals only.
**Why:** AEAT expects surname first; a wrong order risks "no identificado" records.
**Alternatives:** Always ask; ignore.
**Tradeoff:** Heuristic errors on unusual names. The user sees an example and can switch it off.

## D-013 — Micro-patronage threshold on the donor's total, not per record (iteration 2)
**Decision:** 250 € compared against the donor's total deductible donations to the entity in the year.
**Why:** The design ties the percentage to the donor's deduction base. Per-record checks gave 80 % to a donor with 200 € cash + 100 € in kind.

## D-014 — Deploy as a claude.ai Artifact with the `downloads` capability
**Decision:** Publish the single-file build as a private artifact. When framed by the viewer, downloads use the `downloads` capability; anywhere else, a normal browser download.
**Why:** It is the only hosting reachable from this environment. The viewer blocks page-started downloads, so without the capability the core action would fail silently.
**Tradeoff:** Artifact is private until the owner shares it; a public static deployment remains to be done (BUILD.md).

## D-015 — Neutralise formulas in CSV exports
**Decision:** Prefix text starting with `=`, `+`, `@`, tab, CR or non-numeric `-` with an apostrophe.
**Why:** Names can come from public donation forms; the review CSV is opened in Excel (CSV injection).
