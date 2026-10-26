import { normalizeDescription } from './normalize';
import type { StatementLine } from '../core/statement/types';
import type { Installment } from './types';

export interface InstallmentMark {
  current: number;
  total: number;
  confirmed: boolean;
}

/** Marcas com evidência clara: "PARC 03/10", "PARCELA 3 DE 10", "3 DE 10". */
const CLEAR = [/\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/i, /\b(\d{1,2})\s+DE\s+(\d{1,2})\b/i];
/** "03/10" solto pode ser data (dd/mm): fica como "possível parcela". */
const AMBIGUOUS = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/;

export function parseInstallmentMark(description: string): InstallmentMark | null {
  const check = (n: number, m: number) => n >= 1 && m >= 2 && n <= m && m <= 60;
  for (const pattern of CLEAR) {
    const hit = pattern.exec(description);
    if (hit && check(Number(hit[1]), Number(hit[2]))) return { current: Number(hit[1]), total: Number(hit[2]), confirmed: true };
  }
  const hit = AMBIGUOUS.exec(description);
  if (hit && check(Number(hit[1]), Number(hit[2]))) return { current: Number(hit[1]), total: Number(hit[2]), confirmed: false };
  return null;
}

/**
 * Agrupa as parcelas de cada compra (mesma descrição e mesmo total de parcelas) e fica com a
 * última do arquivo: dela saem as parcelas que faltam. Só saídas contam.
 */
export function detectInstallments(lines: StatementLine[]): Installment[] {
  const groups = new Map<string, { mark: InstallmentMark; line: StatementLine; all: StatementLine[] }>();
  for (const line of lines) {
    if (line.amountCents >= 0) continue;
    const mark = parseInstallmentMark(line.description);
    if (!mark) continue;
    const key = `${normalizeDescription(line.description)}|${mark.total}|${mark.confirmed}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { mark, line, all: [line] });
    } else {
      g.all.push(line);
      if (line.date > g.line.date || mark.current > g.mark.current) {
        g.mark = mark;
        g.line = line;
      }
    }
  }
  return [...groups.entries()]
    .map(([key, g]): Installment => ({
      key,
      label: g.line.description,
      installmentCents: Math.abs(g.line.amountCents),
      current: g.mark.current,
      total: g.mark.total,
      remaining: g.mark.total - g.mark.current,
      confirmed: g.mark.confirmed,
      lines: g.all,
      origem: 'regra',
    }))
    .sort((a, b) => b.installmentCents * b.remaining - a.installmentCents * a.remaining);
}
