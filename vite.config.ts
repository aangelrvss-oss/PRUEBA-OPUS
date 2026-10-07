/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `vite build --mode single` produces one self-contained index.html (JS, CSS
 * and fonts inlined) for hosts that serve a single file. Kept in-house instead
 * of a plugin dependency: it only needs to inline the entry chunk and CSS.
 */
function inlineIntoHtml(): Plugin {
  return {
    name: 'cuadra-inline-into-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === 'chunk' && file.isEntry) {
          const code = file.code.replace(/<\/script/gi, '<\\/script');
          source = source.replace(
            new RegExp(`<script[^>]*src="[^"]*${escape(name)}"[^>]*></script>`),
            () => `<script type="module">${code}</script>`,
          );
          delete bundle[name];
        } else if (file.type === 'asset' && name.endsWith('.css')) {
          source = source.replace(
            new RegExp(`<link[^>]*href="[^"]*${escape(name)}"[^>]*>`),
            () => `<style>${String(file.source)}</style>`,
          );
          delete bundle[name];
        }
      }
      html.source = source;
    },
  };
}

/**
 * Production Content-Security-Policy. `connect-src 'none'` means the page
 * cannot send data anywhere: the "nothing leaves your browser" promise is
 * enforced by the browser, not just stated. Not applied in dev (HMR needs a
 * websocket).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function injectCsp(): Plugin {
  return {
    name: 'cuadra-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react(), injectCsp(), ...(single ? [inlineIntoHtml()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      target: 'es2022',
      sourcemap: !single,
      assetsInlineLimit: single ? 10_000_000 : 4096,
      cssCodeSplit: !single,
      rollupOptions: single ? { output: { inlineDynamicImports: true } } : {},
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  };
});
