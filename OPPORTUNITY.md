# OPPORTUNITY.md — Discovery and selection

Date of research: 7 October 2026. Researcher: the product team (one AI agent).
Environment constraint worth stating up front: the network policy of the build
environment blocked direct access to most websites (AEAT, BOE, forums, Reddit).
Research was done through a web-search API (result snippets), and one primary
source — the official AEAT *register design* for Modelo 182 — was obtained as a
copy bundled inside an open-source package on PyPI (see "Evidence" below).
Nothing in this document is based on interviews: **no users were interviewed**.

Labels used: **EVIDENCE** (something a source says or shows), **INFERENCE**
(my reasoning from evidence), **UNKNOWN** (not established).

---

## 1. How I searched

I did not search for "startup ideas". I searched for people already struggling:
rule changes with hard deadlines, prescribed government formats, spreadsheets
used as the system of record, community threads about "nightmare" compliance,
and places where a mistake has a concrete cost.

Searches covered: Spanish rent indexation (IRAV), EU GPSR for handmade
sellers, Schengen 90/180 + EES, freelancer time/invoice spreadsheets, the EU
Accessibility Act, the UK Renters' Rights Act (Form 4A), restaurant allergen
matrices, Spanish birth-leave planning, Spanish domestic-worker payroll,
UK Gift Aid schedules, and Spain's Modelo 182 (donations return).

## 2. Opportunities evaluated

Scores are 0–10. They are judgments from the evidence gathered, not data.

| # | Opportunity | Sev | Freq | Demand | WTP | Gap | Build | Distrib | Leverage | Fast value | **Total /90** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | **Modelo 182 file + recurrence for small Spanish nonprofits** | 7 | 3 | 7 | 5 | 6 | 9 | 6 | 8 | 9 | **60** |
| B | UK Form 4A (Section 13) rent-increase date checker | 7 | 4 | 7 | 4 | 2 | 8 | 5 | 6 | 9 | 52 |
| C | Domestic-worker payroll for Spanish families | 6 | 8 | 6 | 6 | 4 | 7 | 5 | 5 | 7 | 54 |
| D | Restaurant allergen matrix from recipes | 8 | 6 | 6 | 5 | 4 | 7 | 4 | 5 | 7 | 52 |
| E | GPSR compliance pack for small makers selling to the EU | 6 | 5 | 7 | 6 | 3 | 5 | 6 | 4 | 6 | 48 |
| F | Schengen 90/180 calculator for the EES era | 8 | 6 | 8 | 2 | 1 | 9 | 6 | 3 | 9 | 52 |
| G | Spanish rent update (IRAV) calculator | 5 | 3 | 6 | 2 | 1 | 9 | 5 | 3 | 9 | 43 |

### A. Modelo 182 for small nonprofits (SELECTED — detail in §3)

### B. UK Form 4A rent-increase checker
- **User:** self-managing landlords in England (most own 1–2 properties).
- **Problem:** since 1 May 2026 every rent increase must use the prescribed
  Form 4A; the start date must be the first day of a rental period, ≥2 months
  after service and ≥52 weeks after the last increase. A wrong date invalidates
  the notice (EVIDENCE: Mooney v Whiteland 2023 cited by several guides;
  "getting a single date wrong … can cost you months of the increase").
- **Why rejected:** the gap is closed. EVIDENCE: dozens of 2026 guides and
  tools already target exactly this (August app calculator checks the
  two-month and 12-month rules; landlordstudio, noticr, letsafeuk,
  lettingsledger, templatesuk, llcr, rentsos, letcompliance). A new entrant
  would compete on SEO against a flood of near-identical content. Also
  legal-advice liability in a foreign jurisdiction.

### C. Domestic-worker payroll for Spanish families
- **User:** households employing a cleaner/carer (Sistema Especial de
  Empleados de Hogar).
- **Problem:** monthly payslip obligation, contribution brackets, 45% bonus
  rules, SMI changes (EVIDENCE: OCU 2026 guide, hola.com, billeo; "es
  obligatorio entregar nómina mensual").
- **Why not selected:** well served by paid services (Cuidum, Hogaria) and
  many free calculators; correctness depends on Social Security rules that
  change every year and on TGSS data I cannot access; the household is not
  the one who suffers most (TGSS calculates contributions).

### D. Restaurant allergen matrix
- **Problem:** EU Reg. 1169/2011 requires allergen information for the 14
  allergens; matrices must change with every menu/supplier change
  (EVIDENCE: TouchBistro and others say the chart must change with menu and
  supplier changes; templates sold as .docx/.pdf).
- **Why not selected:** my evidence of *behavioral* pain was thin (mostly
  vendor content); competitors (Nutritics, Kafoodle, POS add-ons) exist; a
  wrong output can injure someone, which raises the bar for an unvalidated
  MVP built without domain experts.

### E. GPSR for small makers
- **Problem:** since 13 Dec 2024 sellers to the EU need an EU responsible
  person, risk assessments and traceability (EVIDENCE: eBay community thread
  "EU GPSR, Total Nightmare"; a jewellery maker who buys beads from private
  sellers "that may not even know where their items were manufactured").
- **Why rejected:** the hard part (an EU responsible person) is a legal
  service, not software; many paid EU-rep services and template generators
  already exist. Software alone cannot remove the pain.

### F. Schengen 90/180 calculator
- **Problem:** EES fully live since 10 April 2026; overstays are now recorded
  automatically (EVIDENCE: getwherenext, beancount.io 2026 guides).
- **Why rejected:** severe pain but no gap: the EU publishes an official
  calculator, EES itself shows the balance, and dozens of free calculators
  exist. Consumers will not pay.

### G. Spanish rent update (IRAV)
- **Why rejected:** the Ministry of Housing launched an official web tool
  when INE started publishing IRAV (EVIDENCE: The Local, Spanish Property
  Insight, Jan 2025). A good-looking problem that is already solved for free.

**Conclusion on the rejects:** B, F and G are *real* problems that are bad
opportunities because the gap is closed. E and C are real but software is
not the bottleneck. D needs domain validation I cannot do here.

---

## 3. The selected opportunity

**Small Spanish nonprofits must turn a year of donations into the AEAT
Modelo 182 file every January — and since ejercicio 2025 the "recurrence"
flag depends on three years of each donor's history.**

### Target user
The volunteer treasurer or part-time administrator of a small entity covered
by Ley 49/2002 (foundations, public-utility associations, and similar),
with roughly 20–2,000 donors, keeping donations in a spreadsheet or a bank
export, without a CRM that already generates the 182.

### The problem (what happens every January)
1. Collect all donations of the year (bank transfers, Bizum, direct debits,
   cash) — usually a spreadsheet with one row per payment.
2. Aggregate per donor NIF and per key (A/B, cash vs. in-kind).
3. Validate every NIF; donors without a valid NIF cannot be declared.
4. Assign province codes, donor nature (person/company/entity).
5. **Compute recurrence for every donor**: look up what the same donor gave
   in each of the two previous years.
6. Compute the deduction percentage (80/40/45, or 85/45/50 for priority
   activities; 40/50 or 45/55 for companies).
7. Produce a 250-character fixed-width ISO-8859-1 file (or type every donor
   into AEAT's web form) before 31 January.

### Strongest evidence
1. **The rule just changed and tools lag it.** EVIDENCE: AEAT's own IRPF 2025
   manual: to apply the higher percentage in 2025 the donor must have donated
   to the same entity in 2023 and 2024 *and* "la cuantía del donativo
   efectuado en 2025 y en 2024 sea igual o superior, en cada uno de ellos, al
   realizado en el año anterior". Orden HAC/1430/2025 (BOE, 3 Dec 2025)
   modified field 132 ("RECURRENCIA DONATIVOS") to match.
   EVIDENCE: the maintained open-source OCA/Odoo module
   `l10n_es_aeat_mod182` (PyPI, Oct 2025) still computes recurrence by
   comparing only the two previous years and ships pre-2024 defaults
   (150 € threshold, 35 %). INFERENCE: if a maintained tool lags, spreadsheets
   lag more.
2. **The format is strict and unforgiving.** EVIDENCE (official AEAT register
   design, obtained from the OCA package): fixed 250-position records,
   right-aligned NIFs with zero padding, uppercase without accents, separate
   records per percentage, amount split into integer/decimal parts, etc.
   AEAT validates NIFs on upload and rejects unidentified records, which must
   then be filed in a complementary return.
3. **Vendors treat it as a selling point.** EVIDENCE: Playoff (club software)
   advertises "generar fácilmente el modelo 182"; SinergiaCRM documents it;
   Criterium sells a dedicated "Genera182" product with "cálculo automático
   de porcentaje de deducción"; netsistemas publishes a "Generación Modelo 182
   – Versión 2025"; a hobbyist published a CSV→182 notebook. People build
   and sell tools only where users struggle.
4. **AEAT supports importing an external file into its web form.** EVIDENCE:
   AEAT technical help for the 182 form: "El botón Importar permite cargar un
   fichero … generado … con un programa externo, que se ajuste al diseño
   lógico publicado". So a generated file has a direct, official path.

### Frequency, severity, willingness to pay
- **Frequency:** once a year (January), plus complementary returns. Low
  frequency — a real weakness, partly offset by the yearly certificate duty
  and by recurrence needing the history every year.
- **Severity:** medium–high. A wrong recurrence flag silently changes donors'
  deductions (40 % vs 45 % on the part above 250 €). Incorrect informative
  returns can be sanctioned under the General Tax Law (amounts: UNKNOWN to
  me precisely; not claimed in the product).
- **WTP hypothesis:** entities already pay gestorías or software suites for
  this. A focused tool could charge a small annual fee per entity, and
  gestorías could pay per client. UNKNOWN until tested.

### Market size
UNKNOWN. Indicators only: one source cites 10,511 active foundations in
Spain; public-utility associations and other Ley 49/2002 entities add to
that. I could not find the number of 182 filers. I do not claim a market size.

### Competitive landscape
| Alternative | Strength | Weakness for our user |
|---|---|---|
| AEAT web form (free) | Official, validates NIFs | Manual typing per donor; no aggregation, no recurrence calculation |
| Membership/CRM suites (Playoff, SinergiaCRM, Berrly…) | Full workflow | Must migrate all data into the suite; overkill for a treasurer with a spreadsheet |
| ERP modules (OCA Odoo, a3, Sage) | Integrated with accounting | Require the ERP; OCA defaults lag the 2024/2025 rules |
| Dedicated generators (Criterium Genera182, netsistemas) | Focused | Desktop/Excel style; pricing not visible to me; 2025-rule support UNKNOWN |
| Gestoría | Done for you | Costs money; still needs the clean data from the entity |

### Why this can still win (hypothesis, not proven)
Zero setup (drop the spreadsheet you already have), **no upload of donor
data** (runs entirely in the browser — relevant because NIFs and donations
are personal data), **explains every recurrence decision**, and uses the
entity's previous 182 files as history so the hard rule is automatic.

### Biggest uncertainty
Whether enough small entities still prepare the 182 themselves from
spreadsheets (rather than through a gestoría or a suite) and will trust a
new tool with a tax filing. UNKNOWN.

### What would make it fail
- AEAT changes the format or rule and the tool is not updated in time.
- Treasurers prefer to hand everything to a gestoría (then the gestoría is the
  customer — a pivot, not a death).
- Trust: a tax filing is a high-stakes moment for an unknown tool.
- Seasonality: one month a year makes acquisition and retention hard.
- The file is rejected by AEAT's importer for a detail not visible in the
  design (line separators, character set) — mitigated by a validation step
  with a real entity before launch (see VALIDATION.md).

### Explicitly out of scope
Political parties (declarant nature 4, keys F/G/H), protected patrimonies
(nature 3, keys C/D/E), revocations, and the foral territories (Álava,
Gipuzkoa, Bizkaia, Navarra file with their own Haciendas and formats).
