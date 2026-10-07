# CRITIQUE.md — attacking the product, and what changed

## Second iteration: weaknesses found by using it

I used the product end to end with the demo, an Excel-style CSV, an XLSX, previous
182 files, a 70,000-row file, and mobile and dark screens. Ranked by impact:

| # | Weakness | Impact | Status |
|---|---|---|---|
| 1 | Re-uploading a corrected file added it next to the old one: every donation counted twice | Wrong file, silently | **Fixed** (D-011) + E2E |
| 2 | One-column "Nombre Apellidos" was written in that order; AEAT expects surnames first | Records "no identificado" | **Fixed** (D-012) + tests |
| 3 | 250 € threshold applied per record, not per donor | Wrong percentage for mixed cash/in-kind donors | **Fixed** (D-013) + test |
| 4 | Same payments in two files summed without warning | Double counting | **Fixed**: warning |
| 5 | Exported CSV vulnerable to formula injection | Security | **Fixed** (D-015) + test |
| 6 | Mobile layout 746 px wide; donor table unreadable on phones | Unusable on mobile | **Fixed** |
| 7 | Contrast below WCAG AA for muted text; scroll region not focusable | Accessibility | **Fixed** (axe) |
| 8 | Downloads silently inert inside the artifact viewer | Core action broken in the hosted preview | **Fixed** (D-014) |
| 9 | Donors abroad blocked as "sin provincia" with no hint | Confusing | **Fixed**: action text explains «Extranjero» → 99 |
| 10 | The file has never been imported into the real AEAT form | Could be rejected | **Open**: needs a certificate (VALIDATION T3) |
| 11 | No in-app correction (e.g. add a postcode); must edit the sheet and reload | Friction | Open: reload loop is now safe (#1) |
| 12 | Regional (CCAA) deduction fields always zero | Some entities must edit in the AEAT form | Open, stated in the UI |
| 13 | Recurrence quality depends on history the user may not have | Recurrent donors lose 5 points | Mitigated: loud warning, history CSV for next year |

## Six hostile readings

**Skeptical customer: "Why would I trust a website with my tax return?"**
It does not file anything, shows the exact record for each donor, and cannot
send data anywhere (CSP). The gap remains: no testimonials, no track record,
no proof that AEAT accepts the file. Until T3 passes, I would not trust it
either.

**Competitor: "How would I kill it?"** A membership-software vendor adds
"drop your spreadsheet, get the 182" as a free import, or AEAT adds Excel
import and recurrence to its form. Cuadra's defences are thin: speed to the
2025 rule, privacy, and focus. AEAT improving its form is the real threat.

**Founder: "Is this worth building?"** As a focused, low-cost product: yes, if
T3 passes and 10 entities use it in January 2027. As a venture-scale business:
no evidence. The market size is unknown and probably small.

**Senior engineer: "What will break?"** Format details invisible in the
design: CRLF vs. none, the placeholder justificante, field 132 for key H
(not supported). Heuristics (name order, header synonyms) on real-world files.
Yearly rule changes: rules are isolated in `rules.ts` with tests, but someone
must update them every autumn.

**Designer: "What feels amateur?"** The year selector inside the H1 is
unusual; it works but is not a standard control. The pricing cards show
features that do not exist yet, labelled «En validación»; honest, but they
could read as vapourware. Iconography is minimal by choice.

**Salesperson: "Why would someone pay?"** Today, nobody would: everything built
is free. The paid hypothesis (certificates, stored history, gestoría plan) is
not built. The free tool is the wedge; revenue depends on the next features.

**Security reviewer: "Where could this fail?"** Malicious XLSX (zip bomb) could
exhaust browser memory; the 15 MB cap is on the compressed size. That affects
only the user's own tab, and the files are the user's own. `localStorage` holds
the entity's own contact data in plain text on that computer. No secrets in
the repository; no network surface.
