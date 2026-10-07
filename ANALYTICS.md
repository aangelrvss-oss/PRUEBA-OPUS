# ANALYTICS.md

## Principle

Measure the funnel without learning anything about donors or entities. Events
carry categories and bucketed counts only. **Never** NIFs, names, amounts,
file names, or entity data.

## Current state (honest)

`src/analytics.ts` records events in an in-memory buffer (last 500), exposed
as `window.__cuadraEvents` for tests and local inspection. **There is no network
sink:** the production CSP (`connect-src 'none'`) would block one anyway. No
analytics data has been collected from anyone.

To connect a sink later: host a cookieless endpoint (e.g. self-hosted
Plausible/Umami) on the same origin, relax `connect-src` to that origin only,
and call `setAnalyticsSink()` with a function that posts the event. Bucketing
(`bucket()`) must stay.

## Events

| Event | When | Properties | Meaning |
|---|---|---|---|
| `landing_viewed` | Landing rendered | — | Top of funnel |
| `tool_opened` | Tool rendered | `demo` | Intent |
| `demo_loaded` | Demo data loaded | — | Curiosity / evaluation |
| `file_added` | A file was read | `kind` (table/model182), `ext`, `demo` | **Activation start**; `model182` = user brings history |
| `file_rejected` | A file failed to load | `reason` (known/unexpected) | Format failures; `unexpected` = bug |
| `mapping_changed` | User edited a file's mapping or year | — | Auto-detection miss rate |
| `declaration_computed` | Results shown | `donors`, `recurrent`, `errors` (buckets), `hasHistory`, `demo` | **Core action** |
| `file_downloaded` | 182 file saved | `records`, `errorsLeft` | **Completion / value delivered** |
| `report_downloaded` | Review CSV saved | — | Review behaviour |
| `history_downloaded` | History CSV saved | — | **Retention signal**: intends to come back next year |

Buckets: `0`, `1-9`, `10-49`, `50-199`, `200-999`, `1000+`.

## Key metrics

| Metric | Definition |
|---|---|
| Activation rate | sessions with `declaration_computed` (demo=false) / sessions with `tool_opened` |
| Completion rate | `file_downloaded` / `declaration_computed` (demo=false) |
| Mapping friction | sessions with `mapping_changed` / sessions with `file_added` (table) |
| History adoption | `declaration_computed` with `hasHistory=true` / all non-demo |
| Failure rate | `file_rejected` (unexpected) / `file_added` |
| Retention intent | `history_downloaded` / `file_downloaded` |
