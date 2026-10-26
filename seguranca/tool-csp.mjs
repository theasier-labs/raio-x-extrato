// CSP das páginas de ferramenta (PLN-40/U4a, U5). Fica aqui, e não em TypeScript, porque é
// aplicada ao HTML prerenderizado no pós-build: uma única definição, testada com o próprio HTML.
//
// `connect-src 'self'` impede o navegador de enviar dados para outro domínio: é o que torna
// verificável a promessa "o seu arquivo não sai do seu navegador". As fontes são hospedadas no
// próprio site (public/fonts), então a política não abre exceção para nenhum domínio de terceiro.
import { createHash } from 'node:crypto';

export const TOOL_ROUTES = ['/ferramentas/raio-x-do-extrato'];

export function buildToolCsp({ scriptHashes = [], connectSrc = [] } = {}) {
  const scripts = ["'self'", ...scriptHashes.map((h) => `'sha256-${h}'`)].join(' ');
  const connect = ["'self'", ...connectSrc].join(' ');
  return [
    "default-src 'none'",
    `script-src ${scripts}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/** Hash (base64) dos scripts inline que o navegador executa. Blocos de dados (JSON-LD, estado do Angular) não contam. */
export function inlineScriptHashes(html) {
  const hashes = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc=/i.test(attrs)) continue;
    const type = /\btype="([^"]*)"/i.exec(attrs)?.[1];
    if (type && !/^(text\/javascript|module)$/i.test(type)) continue;
    if (m[2].trim() === '') continue;
    hashes.push(createHash('sha256').update(m[2], 'utf8').digest('base64'));
  }
  return [...new Set(hashes)];
}

const CSS_ONLOAD = /<link rel="stylesheet" href="([^"]+)" media="print" onload="this\.media='all'">/g;

/**
 * Prepara o HTML da ferramenta para a CSP: troca o carregador de CSS com `onload` inline por
 * um `<link>` normal e insere a política logo depois do charset (antes de qualquer script).
 * Falha se sobrar qualquer manipulador inline (`onclick=`, etc.). Idempotente.
 */
export function applyToolCsp(html) {
  if (/http-equiv="Content-Security-Policy"/i.test(html)) return html;
  let out = html.replace(CSS_ONLOAD, '<link rel="stylesheet" href="$1">');
  const handler = /<[a-z][^>]*\s(on[a-z]+)=/i.exec(out);
  if (handler) throw new Error(`HTML com manipulador inline (${handler[1]}): a CSP das ferramentas não o permite.`);

  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildToolCsp({ scriptHashes: inlineScriptHashes(out) })}">`;
  if (/<meta charset="[^"]*">/i.test(out)) return out.replace(/(<meta charset="[^"]*">)/i, `$1\n${meta}`);
  if (/<head[^>]*>/i.test(out)) return out.replace(/(<head[^>]*>)/i, `$1\n${meta}`);
  throw new Error('HTML sem <head>: não foi possível inserir a CSP.');
}

const OWN_HOSTS = /^https:\/\/(?:www\.)?theasier\.com\.br(?:\/|$)/;

/**
 * Endereços de outros domínios que o navegador carregaria sozinho ao abrir a página: scripts,
 * folhas de estilo, imagens, fontes, iframes e `preconnect`. Links `<a>` e metadados (canonical,
 * og:url, JSON-LD) não são requisições e ficam de fora. Vazio = "nenhum terceiro" verificado.
 */
export function findThirdPartyResources(html) {
  const found = new Set();
  const tag = /<(script|img|iframe|source|video|audio|embed)\b[^>]*\bsrc="(https?:)?\/\/[^"]+"|<link\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>/gi;
  for (const m of html.matchAll(tag)) {
    const raw = m[0];
    const url = /(?:src|href)="((?:https?:)?\/\/[^"]+)"/i.exec(raw)?.[1];
    if (!url) continue;
    if (m[3] && !/rel="(?:stylesheet|preload|preconnect|dns-prefetch|prefetch|modulepreload|icon|apple-touch-icon)"/i.test(raw)) continue;
    const abs = url.startsWith('//') ? `https:${url}` : url;
    if (!OWN_HOSTS.test(abs)) found.add(abs);
  }
  return [...found];
}

/**
 * Política da ferramenta como cabeçalho HTTP: a mesma da `<meta>` (com os hashes do build) mais
 * `frame-ancestors`, que só vale em cabeçalho. É o texto que vai na response headers policy do CloudFront.
 */
export function toolCspHeader(html) {
  const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(html)?.[1];
  if (!policy) throw new Error('HTML da ferramenta sem a CSP: não dá para montar o cabeçalho.');
  return `${policy}; frame-ancestors 'none'`;
}
