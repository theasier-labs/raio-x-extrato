import { toIsoDate, type ParsedStatement, type StatementLine } from './types';

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decode(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m).trim();
}

/** Valor de uma tag, em OFX SGML (sem fechamento) ou XML. */
function tag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block);
  return m ? decode(m[1] ?? '') : undefined;
}

/** TRNAMT: ponto ou vírgula decimal, sem float. */
function amountToCents(raw: string): number | null {
  const m = /^([+\-−])?(\d+)(?:[.,](\d{1,2}))?$/.exec(raw.trim());
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents)) return null;
  return m[1] === '-' || m[1] === '−' ? -cents : cents;
}

export function parseOfxStatement(text: string): ParsedStatement {
  const result: ParsedStatement = { source: 'ofx', lines: [], issues: [] };
  if (!/OFXHEADER|<OFX[\s>]/i.test(text)) {
    result.issues.push({ line: 1, reason: 'O arquivo não parece ser um OFX.', raw: text.slice(0, 40) });
    return result;
  }

  const parts = text.split(/<STMTTRN>/i).slice(1);
  parts.forEach((part, idx) => {
    const end = part.search(/<\/STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|<\/STMTTRNRS>/i);
    const block = end >= 0 ? part.slice(0, end) : part;
    const position = idx + 1;

    const dt = /^(\d{4})(\d{2})(\d{2})/.exec(tag(block, 'DTPOSTED') ?? '');
    const date = dt ? toIsoDate(Number(dt[1]), Number(dt[2]), Number(dt[3])) : null;
    if (!date) {
      result.issues.push({ line: position, reason: 'Data (DTPOSTED) ausente ou inválida.', raw: block.trim().slice(0, 80) });
      return;
    }
    const amount = amountToCents(tag(block, 'TRNAMT') ?? '');
    if (amount === null) {
      result.issues.push({ line: position, reason: 'Valor (TRNAMT) ausente ou inválido.', raw: block.trim().slice(0, 80) });
      return;
    }
    const name = tag(block, 'NAME');
    const memo = tag(block, 'MEMO');
    const description = [name, memo && memo !== name ? memo : undefined].filter(Boolean).join(' ');
    const id = tag(block, 'FITID');
    const line: StatementLine = { date, description, amountCents: amount, sourceLine: position, ...(id ? { id } : {}) };
    result.lines.push(line);
  });

  if (parts.length === 0) result.issues.push({ line: 1, reason: 'Nenhum lançamento (STMTTRN) encontrado.', raw: '' });
  return result;
}
