# BUILD.md — build, run and deploy

## Requirements

- Node.js 20 or newer (developed with 22.22), npm 10.
- For E2E tests: Chromium for Playwright 1.56 (`npx playwright install chromium`
  on a normal machine; this repository's cloud environment ships it).

## From a clean clone

```bash
npm ci                 # exact versions from package-lock.json
npm run check          # typecheck + unit tests + production build
npm run test:e2e       # builds, serves on :4173, runs Playwright
```

## Development

```bash
npm run dev            # Vite dev server on http://localhost:5173 (no CSP in dev)
```

## Production builds

| Command | Output | Use |
|---|---|---|
| `npm run build` | `dist/` | Static site: `index.html` + hashed assets. Upload to any static host |
| `npm run build:single` | `dist-single/index.html` | One self-contained file (JS, CSS, fonts inlined). Opens from `file://` |
|  | `dist-single/cuadra.html` | Body-only version for the claude.ai Artifact host |
| `npm run preview` | — | Serves `dist/` on http://127.0.0.1:4173 |

The production CSP is injected at build time (`vite.config.ts`, `CSP`).

## Current deployment

- **Published:** claude.ai Artifact, https://claude.ai/artifact/AJbEz5jZ2v5HGebJwqk4TX
  - It is **private**: only the owner can open it until it is shared from
    the page's Share menu.
  - It declares the `downloads` capability, so the 182 file is saved through
    the viewer's confirmation dialog.
  - To update: `npm run build:single`, then publish `dist-single/cuadra.html` to
    the same artifact URL.
- **Not deployed:** a public static site on its own domain. No hosting
  credentials were available in this environment.

## Deploying the static site (exact steps)

Any one of these works with `dist/`; nothing needs a server.

**Cloudflare Pages**
```bash
npm run build
npx wrangler pages deploy dist --project-name cuadra   # needs a Cloudflare account / API token
```

**Netlify**
```bash
npm run build
npx netlify deploy --dir=dist --prod                   # needs NETLIFY_AUTH_TOKEN
```

**GitHub Pages** (repository must allow Pages)
1. Settings › Pages › Source: GitHub Actions.
2. Add a workflow that runs `npm ci && npm run build` and publishes `dist/`
   with `actions/upload-pages-artifact` + `actions/deploy-pages`.

Recommended response headers on a real host (stronger than the meta tag):
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'none'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```
(`script-src 'self'` without `'unsafe-inline'` works for `dist/`, which has no
inline scripts; the single-file build needs `'unsafe-inline'`.)

## Troubleshooting

- E2E reuses a server already on :4173. If you changed code, stop it first:
  `./scripts/free-port.sh 4173`.
- `npm audit` should report 0 vulnerabilities.
