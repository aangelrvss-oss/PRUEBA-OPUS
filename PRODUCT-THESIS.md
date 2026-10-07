# PRODUCT-THESIS.md — Cuadra

**Cuadra** turns the donations spreadsheet a small Spanish nonprofit already
has into a valid Modelo 182 file, with every donor's recurrence calculated and
explained. It runs entirely in the browser; donor data never leaves the
computer.

("Cuadrar" is what a treasurer does with the books: make the numbers add up.)

## USER
The volunteer treasurer or part-time administrator of a small entity covered
by Ley 49/2002 (a foundation or a public-utility association) with tens to a
couple of thousand donors, who keeps donations in Excel/CSV or a bank export
and files the 182 themselves through the AEAT web form. Secondary user: the
gestoría that does this for several such entities.

## PAIN
Every January they must turn a year of payments into one record per donor,
validate NIFs, assign provinces, decide the deduction percentage and — since
ejercicio 2025 — set the recurrence flag by comparing each donor's totals for
the current year and the two previous ones. Done by hand in a spreadsheet,
this takes hours, errors are invisible, and a wrong flag changes the donor's
tax deduction.

## EXISTING WORKAROUND
Spreadsheet formulas and VLOOKUPs across three yearly files, then typing every
donor into the AEAT form; or paying a gestoría; or migrating to a CRM/ERP that
has a 182 module.

## PRODUCT
A single-page web app with one job:
1. Drop this year's donations (CSV or XLSX, one row per payment or per donor).
2. Optionally drop the previous years' history: the 182 files already filed
   (`.txt`) or spreadsheets.
3. Confirm the column mapping (auto-detected) and the entity's details.
4. Get: the 182 file ready to import into AEAT's form, a per-donor table
   showing *why* each donor is or isn't recurrent and which percentage
   applies, a list of problems to fix (invalid NIFs, missing NIFs, missing
   postcodes…), and a history file to keep for next year.

## VALUE
- Hours of manual aggregation and lookups become a minute.
- The recurrence rule is applied the same way for every donor, with the
  numbers shown, so the treasurer can check and defend it.
- Problems surface before AEAT rejects them, not after.
- Privacy: no account, no upload, no third-party processing of NIFs.

## DIFFERENTIATION
| vs. | Cuadra's difference |
|---|---|
| AEAT form | Aggregates, validates and calculates; then you import one file instead of typing |
| CRM suites | No migration; works with the spreadsheet you already have |
| ERP modules | No ERP; implements the 2025 recurrence wording |
| Gestoría | Minutes, not a ticket; and the gestoría can use it too |

## BUSINESS MODEL (summary — see BUSINESS-MODEL.md)
Free generation of the file for small entities (the acquisition engine and the
public good). Paid annual plan for the features that save the most time
around the 182: donor certificates (art. 24 Ley 49/2002), multi-year history
kept for you, and multi-entity use for gestorías. All prices are hypotheses.

## MVP
The shortest path from opening the product to value:
**open → "Probar con datos de ejemplo" or drop a file → see results →
download the 182 file.**

In scope:
- CSV and XLSX import with automatic column detection and manual override.
- One row per payment or per donor; year taken from a date or year column.
- Previous years from prior 182 `.txt` files or spreadsheets.
- NIF/NIE/CIF validation (checksum), donor nature from the NIF.
- Province from postcode or from a province column.
- Keys A and B, cash and in-kind (separate records).
- Recurrence per the 2025 wording; percentages for individuals and companies.
- The 250-position ISO-8859-1 file, records separated by CRLF.
- Explanations per donor, problems list, CSV export of the result and of the
  history.
- Spanish UI, keyboard accessible, works on mobile for review.

Out of scope (stated in the UI): political parties, protected patrimonies,
revocations, regional (CCAA) deductions, foral territories, filing on behalf
of the user (they import the file themselves in the AEAT form).

## SUCCESS (what would prove the thesis)
UNKNOWN today. The test: five real entities generate their file with Cuadra,
import it into the AEAT form without errors, and say they would use it next
year. See VALIDATION.md.
