// O código do Raio-X que toca o arquivo da pessoa não pode usar nenhuma API de rede. A promessa "nada sai do
// navegador" vira uma conferência automática (PLN-42 RX-02). Roda no site e no espelho público, que têm pastas diferentes.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS = [
  'src/app/tools/core/statement', 'src/app/tools/raio-x', 'src/app/pages/tools/raio-x', // site
  'src/core/statement', 'src/raio-x', 'pagina', // espelho público
];
const ARQUIVOS = ['src/app/tools/core/money.ts', 'src/core/money.ts'];
const PROIBIDO = /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b|navigator\.connection|new Image\(|HttpClient/;

function arquivos(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? arquivos(p) : [p];
  });
}

const alvos = [
  ...PASTAS.map((p) => join(raiz, p)).filter(existsSync).flatMap(arquivos),
  ...ARQUIVOS.map((p) => join(raiz, p)).filter(existsSync),
].filter((f) => /\.(ts|html)$/.test(f) && !/\.spec\.ts$/.test(f));

test('há código do Raio-X para conferir', () => {
  assert.ok(alvos.length >= 15, `só ${alvos.length} arquivos encontrados`);
});

test('nenhum arquivo do Raio-X usa API de rede', () => {
  const achados = [];
  for (const f of alvos) {
    readFileSync(f, 'utf8').split('\n').forEach((linha, i) => {
      const semComentario = linha.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*$/, '');
      if (PROIBIDO.test(semComentario)) achados.push(`${f.replace(raiz + '/', '')}:${i + 1}: ${linha.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(achados, []);
});
