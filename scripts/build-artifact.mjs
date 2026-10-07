// Turns the single-file build (dist-single/index.html) into the body-only page
// format the claude.ai Artifact host expects: it wraps the content in its own
// <html>/<head>/<body> skeleton and enforces its own CSP (which also blocks
// network requests to other hosts), so we drop ours and keep title, styles,
// markup and the inlined script.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const pick = (re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(`build-artifact: ${what} not found`);
  return m;
};
const title = pick(/<title>[\s\S]*?<\/title>/, 'title')[0].replace(/<title>.*<\/title>/, '<title>Cuadra 182</title>');
const styles = [...html.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script type="module">[\s\S]*?<\/script>/g)].map((m) => m[0]);
const body = pick(/<body>([\s\S]*)<\/body>/, 'body')[1].replace(/<script type="module">[\s\S]*?<\/script>/g, '').trim();
if (!styles.length || !scripts.length) throw new Error('build-artifact: expected inlined CSS and JS');
const out = [title, ...styles, body, ...scripts].join('\n');
writeFileSync('dist-single/cuadra.html', out);
console.log(`dist-single/cuadra.html · ${(out.length / 1024).toFixed(0)} KB`);
