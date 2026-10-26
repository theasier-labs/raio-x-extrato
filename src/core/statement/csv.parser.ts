import { parseMoneyToCents } from '../money';
import { toIsoDate, type ParsedStatement, type ParseIssue, type StatementLine } from './types';

const DATE_COL = /^(data|date|dt)\b/i;
const DESC_COL = /(descri|hist[oó]rico|memo|lan[cç]amento|estabelecimento|detalhe)/i;
const AMOUNT_COL = /^(valor|amount|value|quantia)/i;
const DEBIT_COL = /^(d[eé]bito|debit|sa[ií]da)/i;
const CREDIT_COL = /^(cr[eé]dito|credit|entrada)/i;

/** Divide uma linha de CSV respeitando aspas. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Aceita dd/mm/aaaa, dd/mm/aa e aaaa-mm-dd; devolve AAAA-MM-DD ou null. */
function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return toIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(s);
  if (m) return toIsoDate(2000 + Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

export function parseCsvStatement(text: string): ParsedStatement {
  const result: ParsedStatement = { source: 'csv', lines: [], issues: [] };
  const rows = text.replace(/^﻿/, '').split(/\r?\n/);
  const headerIdx = rows.findIndex((r) => r.trim() !== '');
  if (headerIdx < 0) {
    result.issues.push({ line: 1, reason: 'Arquivo vazio.', raw: '' });
    return result;
  }

  const headerRow = rows[headerIdx]!;
  const semicolons = headerRow.match(/;/g)?.length ?? 0;
  const commas = headerRow.match(/,/g)?.length ?? 0;
  const delimiter = semicolons > 0 && semicolons >= commas ? ';' : ',';
  const header = splitLine(headerRow, delimiter);
  const dateIdx = header.findIndex((h) => DATE_COL.test(h));
  const descIdx = header.findIndex((h) => DESC_COL.test(h));
  const amountIdx = header.findIndex((h) => AMOUNT_COL.test(h));
  const debitIdx = header.findIndex((h) => DEBIT_COL.test(h));
  const creditIdx = header.findIndex((h) => CREDIT_COL.test(h));
  const hasAmount = amountIdx >= 0 || (debitIdx >= 0 && creditIdx >= 0);

  if (dateIdx < 0 || descIdx < 0 || !hasAmount) {
    result.issues.push({
      line: headerIdx + 1,
      reason: 'Cabeçalho não reconhecido: faltam colunas de data, descrição e valor (ou débito e crédito).',
      raw: headerRow,
    });
    return result;
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const raw = rows[i]!;
    if (raw.trim() === '') continue;
    const cells = splitLine(raw, delimiter);
    const issue = (reason: string): ParseIssue => ({ line: i + 1, reason, raw });

    const date = parseDate(cells[dateIdx] ?? '');
    if (!date) {
      result.issues.push(issue('Data inválida.'));
      continue;
    }
    let amount: number | null;
    if (amountIdx >= 0) {
      amount = parseMoneyToCents(cells[amountIdx] ?? '');
    } else {
      const debit = (cells[debitIdx] ?? '').trim() === '' ? 0 : parseMoneyToCents(cells[debitIdx] ?? '');
      const credit = (cells[creditIdx] ?? '').trim() === '' ? 0 : parseMoneyToCents(cells[creditIdx] ?? '');
      amount = debit === null || credit === null ? null : Math.abs(credit) - Math.abs(debit);
    }
    if (amount === null) {
      result.issues.push(issue('Valor inválido.'));
      continue;
    }
    const line: StatementLine = { date, description: cells[descIdx] ?? '', amountCents: amount, sourceLine: i + 1 };
    result.lines.push(line);
  }
  return result;
}
