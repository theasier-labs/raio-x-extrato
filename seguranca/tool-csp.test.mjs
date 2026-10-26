import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { applyToolCsp, buildToolCsp, findThirdPartyResources, inlineScriptHashes, toolCspHeader } from './tool-csp.mjs';

const hash = (s) => createHash('sha256').update(s, 'utf8').digest('base64');
const JS = "document.documentElement.classList.add('js');";
const page = (extra = '') => `<!doctype html><html><head><meta charset="utf-8"><title>T</title>
<script>${JS}</script>
<script src="env.js"></script>
<script type="application/ld+json" data-seo>{"a":1}</script>
<link rel="stylesheet" href="styles-ABC.css" media="print" onload="this.media='all'">
${extra}</head><body><script id="ng-state" type="application/json">{"x":1}</script></body></html>`;

test('política: só conexão com o próprio site, sem brechas', () => {
  const csp = buildToolCsp();
  assert.match(csp, /connect-src 'self'(;|$)/);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /\*/);
  assert.doesNotMatch(csp, /http:/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
});

test('o único jeito de liberar um destino de conexão é declará-lo', () => {
  assert.match(buildToolCsp({ connectSrc: ['https://proxy.exemplo.invalid'] }), /connect-src 'self' https:\/\/proxy\.exemplo\.invalid/);
});

test('hash só dos scripts inline executáveis', () => {
  assert.deepEqual(inlineScriptHashes(page()), [hash(JS)]);
});

test('aplica a CSP: hash do script inline, sem onload, antes de qualquer script', () => {
  const out = applyToolCsp(page());
  assert.ok(out.includes(`'sha256-${hash(JS)}'`));
  assert.doesNotMatch(out, /onload=/);
  assert.match(out, /<link rel="stylesheet" href="styles-ABC\.css">/);
  assert.ok(out.indexOf('Content-Security-Policy') < out.indexOf('<script'));
  assert.ok(out.indexOf('<meta charset') < out.indexOf('Content-Security-Policy'));
});

test('é idempotente', () => {
  const once = applyToolCsp(page());
  assert.equal(applyToolCsp(once), once);
});

test('falha se sobrar manipulador inline', () => {
  assert.throws(() => applyToolCsp(page('<button onclick="x()">a</button>')), /manipulador inline \(onclick\)/);
});

test('a política não abre exceção para nenhum domínio de terceiro (fontes são locais)', () => {
  const csp = buildToolCsp();
  assert.doesNotMatch(csp, /https?:\/\//);
});

test('detecta recurso de terceiro (script, fonte, CSS) e ignora links, canonical e o próprio domínio', () => {
  const html = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <script src="https://www.googletagmanager.com/gtm.js"></script>
    <img src="//cdn.exemplo.invalid/a.png" alt="">
    <link rel="canonical" href="https://www.theasier.com.br/x">
    <link rel="stylesheet" href="/fonts/fonts.css">
    <script src="env.js"></script>
    <a href="https://github.com/theasier-labs/x">código</a>`;
  assert.deepEqual(findThirdPartyResources(html).sort(), [
    'https://cdn.exemplo.invalid/a.png',
    'https://fonts.googleapis.com/css2?family=Inter',
    'https://fonts.gstatic.com',
    'https://www.googletagmanager.com/gtm.js',
  ]);
  assert.deepEqual(findThirdPartyResources('<link rel="stylesheet" href="/fonts/fonts.css"><script src="env.js"></script>'), []);
});

test('o cabeçalho HTTP é a política da meta mais frame-ancestors', () => {
  const header = toolCspHeader(applyToolCsp(page()));
  assert.ok(header.startsWith("default-src 'none'; script-src 'self'"));
  assert.ok(header.endsWith("; frame-ancestors 'none'"));
  assert.ok(header.includes(`'sha256-${hash(JS)}'`));
  assert.throws(() => toolCspHeader('<html></html>'), /sem a CSP/);
});
