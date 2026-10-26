import { addMonths, type MonthKey } from './months';
import type { Installment } from './types';

export interface BreathingPoint {
  month: MonthKey;
  commitmentCents: number;
}

export interface Breathing {
  /** Mês a mês, a partir do mês seguinte ao último do arquivo, até o peso zerar. */
  series: BreathingPoint[];
  thresholdCents: number;
  /** Primeiro mês em que o peso das parcelas fica abaixo do valor escolhido. */
  breatheMonth: MonthKey | null;
  /** `true` quando já começa abaixo do valor escolhido. */
  alreadyBelow: boolean;
}

/**
 * "Quando eu respiro?": o peso do mês k é a soma das parcelas que ainda estão ativas
 * (as que têm pelo menos k parcelas restantes). Só entram parcelas confirmadas.
 */
export function breathingCurve(installments: Pick<Installment, 'installmentCents' | 'remaining' | 'confirmed'>[], startMonth: MonthKey, thresholdCents: number): Breathing {
  const active = installments.filter((i) => i.confirmed && i.remaining > 0 && i.installmentCents > 0);
  const longest = Math.min(60, active.reduce((max, i) => Math.max(max, i.remaining), 0));
  const series: BreathingPoint[] = [];
  for (let k = 1; k <= longest + 1; k++) {
    const commitmentCents = active.filter((i) => i.remaining >= k).reduce((sum, i) => sum + i.installmentCents, 0);
    series.push({ month: addMonths(startMonth, k - 1), commitmentCents });
  }
  const first = series.find((p) => p.commitmentCents < thresholdCents) ?? null;
  return {
    series,
    thresholdCents,
    breatheMonth: first ? first.month : null,
    alreadyBelow: series.length > 0 ? series[0]!.commitmentCents < thresholdCents : true,
  };
}
