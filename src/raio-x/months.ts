/** Mês no formato AAAA-MM. */
export type MonthKey = string;

export const monthOf = (isoDate: string): MonthKey => isoDate.slice(0, 7);

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const index = y * 12 + (m - 1) + n;
  const year = Math.floor(index / 12);
  return `${year.toString().padStart(4, '0')}-${((index % 12) + 1).toString().padStart(2, '0')}`;
}

const NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10" → "out/2026". */
export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${NOMES[m - 1]}/${y}`;
}
