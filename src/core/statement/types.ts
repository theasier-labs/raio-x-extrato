/** Um lançamento lido do arquivo do usuário. O valor é em centavos (negativo = saída). */
export interface StatementLine {
  /** AAAA-MM-DD */
  date: string;
  description: string;
  amountCents: number;
  /** Identificador do banco, quando existe (OFX `FITID`). */
  id?: string;
  /** Linha (CSV) ou posição (OFX) de origem, para o usuário conferir. */
  sourceLine: number;
}

/** Linha que o parser não conseguiu ler: é mostrada ao usuário, nunca descartada em silêncio. */
export interface ParseIssue {
  line: number;
  reason: string;
  raw: string;
}

export interface ParsedStatement {
  source: 'csv' | 'ofx';
  lines: StatementLine[];
  issues: ParseIssue[];
}

/** Monta AAAA-MM-DD, ou null se a data não existir no calendário. */
export function toIsoDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  const p = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${p(year, 4)}-${p(month)}-${p(day)}`;
}
