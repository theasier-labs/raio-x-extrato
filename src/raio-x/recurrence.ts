import { monthOf } from './months';
import { normalizeDescription } from './normalize';
import type { StatementLine } from '../core/statement/types';
import type { Recurring } from './types';

/** Critérios nossos (não são regra fiscal) e aparecem na tela. */
export const RECURRENCE = { minMonths: 3, tolerance: 0.1 } as const;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/**
 * Item recorrente: mesma descrição normalizada, saída, em pelo menos `minMonths` meses diferentes,
 * com o valor dentro de ±`tolerance` da mediana. Valor mensal = mediana; anual = mensal × 12.
 */
export function detectRecurring(lines: StatementLine[]): Recurring[] {
  const groups = new Map<string, StatementLine[]>();
  for (const line of lines) {
    if (line.amountCents >= 0) continue;
    const key = normalizeDescription(line.description);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }

  const out: Recurring[] = [];
  for (const [key, group] of groups) {
    const amounts = group.map((l) => Math.abs(l.amountCents));
    const mid = median(amounts);
    const inside = group.filter((l) => Math.abs(Math.abs(l.amountCents) - mid) <= mid * RECURRENCE.tolerance);
    const months = [...new Set(inside.map((l) => monthOf(l.date)))].sort();
    if (months.length < RECURRENCE.minMonths) continue;
    const monthly = median(inside.map((l) => Math.abs(l.amountCents)));
    out.push({ key, label: inside[0]!.description, monthlyCents: monthly, annualCents: monthly * 12, months, lines: inside, origem: 'regra' });
  }
  return out.sort((a, b) => b.annualCents - a.annualCents);
}
