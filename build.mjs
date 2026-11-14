// Junta tudo num único arquivo HTML, fácil de mandar por WhatsApp ou hospedar.
//   node build.mjs                     -> dist/index.html (todas as marcas)
//   node build.mjs --tenants=modelo    -> só as marcas indicadas
//   node build.mjs --fragment=saida.html --title="Nome"  -> sem <html>/<body>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');
const only = arg('tenants') ? arg('tenants').split(',') : null;
const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles.css', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1])
  .filter((src) => !only || !src.startsWith('tenants/') || only.some((t) => src === `tenants/${t}.js`));
const js = scripts.map((s) => readFileSync(s, 'utf8')).join('\n');
const title = arg('title') || 'Agenda da Barbearia';
const head = `<meta name="claude:viewport-fit-sides" content="cover">\n<title>${title}</title>\n<style>\n${css}</style>`;
const body = `<div id="app"></div>\n<script>${arg('title') ? 'window.__keepTitle=true;' : ''}\n${js}</script>`;
const out = arg('fragment') || 'dist/index.html';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, arg('fragment') ? `${head}\n${body}\n`
  : `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log('ok', out, scripts.join(' '));
