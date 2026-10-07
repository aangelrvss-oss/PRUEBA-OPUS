# VALIDATION.md — what is known, what is not

Confidence scale: **HIGH** (primary source, or tested), **MEDIUM** (several
secondary sources agree), **LOW** (inference), **UNKNOWN** (no evidence yet).
Nothing here comes from users: **no interviews or user tests have happened.**

## Problem and market assumptions

| # | Assumption | Evidence | Confidence | How to validate further |
|---|---|---|---|---|
| P1 | Ley 49/2002 entities must file the 182 every January | AEAT procedure pages; Orden EHA/3021/2007; many advisory sources | HIGH | — |
| P2 | Since ejercicio 2025, recurrence also requires current year ≥ previous year | AEAT Manual Renta 2025 (quoted on the landing); Orden HAC/1430/2025 modified field 132 | HIGH | Read the published DR_Modelo_182_2025 design PDF (blocked from this environment) |
| P3 | Small entities prepare the 182 themselves from spreadsheets | Inference from: AEAT offers a web form for under 40,000 records; vendors market 182 generation; a hobbyist CSV→182 tool exists | LOW | Ask 20 treasurers how they did it last January (see GO-TO-MARKET) |
| P4 | Recurrence is the most error-prone step | Inference: it needs three years of data per donor; even OCA's maintained module lags the 2025 rule | LOW | Ask the same 20 treasurers; compare their filed flags with Cuadra's result on their data |
| P5 | Existing tools are too heavy (suites) or outdated for this user | Playoff, SinergiaCRM need full adoption; OCA defaults still 150 €/35 % (Oct 2025 package) | MEDIUM | Try Criterium Genera182 and netsistemas with a sample; pricing not visible to me |
| P6 | Treasurers will pay | None | UNKNOWN | Pricing page test + 10 conversations; pre-sale of the certificates feature in December |
| P7 | Market size | One source: 10,511 active foundations; number of 182 filers not found | UNKNOWN | AEAT statistics request; registry counts of public-utility associations |
| P8 | Privacy (no upload) matters to buyers | Inference: NIFs are personal data under GDPR | LOW | Ask in interviews; watch whether people mention it unprompted |

## Product and technical assumptions

| # | Assumption | Evidence | Confidence | How to validate further |
|---|---|---|---|---|
| T1 | Field positions and formats match the AEAT design | Official design (2021 edition) bundled in the OCA PyPI package; 20+ position-level unit tests | HIGH for the 2021 layout | Compare with DR_Modelo_182_2025.pdf |
| T2 | Layout unchanged in 2025 except field 132 wording and key H | Orden HAC/1430/2025 summaries mention only those | MEDIUM | Read the 2025 design PDF |
| T3 | **The AEAT form's «Importar» accepts our file** | AEAT help says the form imports files following the design; **never tried** | **UNKNOWN** | **First thing to do:** import the demo file into the AEAT form with a real entity's certificate (requires a credential I do not have) |
| T4 | CRLF separators are accepted | Common practice; the AEAT text I saw does not state it; OCA appears to write records without separators | LOW | Same import test; if rejected, switch `LINE_BREAK` to `''` in `boe182.ts` (one constant, reader already handles both) |
| T5 | Placeholder justificante `1820000000000` is accepted on import | Not documented | UNKNOWN | Same import test; the form assigns its own number on submission |
| T6 | Percentage field rule for individuals (micro % if base ≤ 250 €, else the percentage of the excess) | Official design text (2021: "exceda de 150 euros"), threshold updated to 250 € by RDL 6/2023 | MEDIUM | 2025 design PDF; ask an advisor |
| T7 | Key B percentages 85/45/50 and companies 40/50, 45/55 | AEAT and AEF summaries of RDL 6/2023 | MEDIUM | AEAT Manual Sociedades; advisor review |
| T8 | Sociedades civiles (NIF J) default to nature E | Inference from tax rules since 2016; flagged to the user | LOW | Advisor review |
| T9 | Province = first two digits of the postcode | The design's province codes equal postcode prefixes | HIGH | — |
| T10 | Header synonyms recognise real spreadsheets | Built from typical Spanish/Catalan/Basque headers; no real files seen | LOW | Collect 10 anonymised real headers |
| T11 | Name-order heuristic is right for most Spanish names | ~150 given names; unit tests on typical names | MEDIUM | Measure on real donor lists; the user can switch it off |
| T12 | Works for 5,000-donor entities | Measured: 70,000 rows in 1.0 s in Chromium | HIGH | — |
| T13 | Downloads work inside the claude.ai viewer | Uses the documented `downloads` capability; not exercised by me in the viewer | MEDIUM | Click the download button on the published artifact |

## What would change the plan

- **T3 fails** in a way the design does not explain: fix it before any outreach.
  The product is worthless if the file is not accepted.
- **P3 is false** (everyone uses a gestoría or a suite): the gestoría becomes the
  customer (multi-entity plan) and the message changes to "check your clients'
  182 in a minute".
- **P6 is false**: keep it free as a public good and lead generation for a
  paid certificates and history service, or stop.

## Validation plan (first 30 days)

1. Import test with one real entity's certificate (T3, T4, T5). Pass/fail.
2. Twenty 15-minute calls with treasurers found through the channels in
   GO-TO-MARKET.md. Questions: how they did it last January, time spent, tools,
   who checks recurrence, whether they would pay to avoid it.
3. Five entities run their own data through Cuadra and compare against what
   they filed (P4: count recurrence differences).
4. Fake-door the certificates feature ("Avísame") with a real email capture
   once a backend exists. Today the page has no way to collect emails, on
   purpose.
