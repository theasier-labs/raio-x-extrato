import type { ParsedStatement, StatementLine } from '../core/statement/types';
import { classifyFeeOrInterest } from './fees-interest';
import { detectInstallments, parseInstallmentMark } from './installments';
import { addMonths, monthOf, type MonthKey } from './months';
import { detectRecurring } from './recurrence';
import type { Installment, ManualInput, Recurring } from './types';

export interface MonthlyFixed {
  month: MonthKey;
  cents: number;
}

export interface Analysis {
  /** Meses distintos presentes no arquivo (vazio no modo manual). */
  months: MonthKey[];
  lastMonth: MonthKey | null;
  /** Parcelas confirmadas (do arquivo, as que você confirmou e as que informou). */
  installments: Installment[];
  /** Possíveis parcelas: a pessoa decide. Não entram na curva. */
  possible: Installment[];
  recurring: Recurring[];
  feeLines: StatementLine[];
  interestLines: StatementLine[];
  fixed: { byMonth: MonthlyFixed[]; latestCents: number; averageCents: number; manualMonthlyCents: number };
}

const sumAbs = (lines: StatementLine[]) => lines.reduce((s, l) => s + Math.abs(l.amountCents), 0);

export function analyze(statement: ParsedStatement | null, manual: ManualInput, confirmedKeys: readonly string[] = []): Analysis {
  const lines = statement?.lines ?? [];
  const outflows = lines.filter((l) => l.amountCents < 0);

  const marked = outflows.filter((l) => parseInstallmentMark(l.description));
  const unmarked = outflows.filter((l) => !parseInstallmentMark(l.description));
  const feeLines = unmarked.filter((l) => classifyFeeOrInterest(l.description) === 'tarifa');
  const interestLines = unmarked.filter((l) => classifyFeeOrInterest(l.description) === 'juros');
  const rest = unmarked.filter((l) => classifyFeeOrInterest(l.description) === null);

  const detected = detectInstallments(marked).map((i) => (confirmedKeys.includes(i.key) ? { ...i, confirmed: true } : i));
  const manualInstallments: Installment[] = manual.installments.map((m, idx) => ({
    key: `manual:parcela:${idx}`,
    label: m.label,
    installmentCents: m.installmentCents,
    current: 0,
    total: m.remaining,
    remaining: m.remaining,
    confirmed: true,
    lines: [],
    origem: 'usuario',
  }));
  const installments = [...detected.filter((i) => i.confirmed), ...manualInstallments];
  const possible = detected.filter((i) => !i.confirmed);

  const manualRecurring: Recurring[] = manual.subscriptions.map((s, idx) => ({
    key: `manual:assinatura:${idx}`,
    label: s.label,
    monthlyCents: s.monthlyCents,
    annualCents: s.monthlyCents * 12,
    months: [],
    lines: [],
    origem: 'usuario',
  }));
  const recurring = [...detectRecurring(rest), ...manualRecurring].sort((a, b) => b.annualCents - a.annualCents);

  const months = [...new Set(lines.map((l) => monthOf(l.date)))].sort();
  const lastMonth = months.length ? months[months.length - 1]! : null;

  // Gasto fixo do mês = assinaturas + parcelas confirmadas + tarifas (do arquivo) + o que você informou.
  const fixedLines = new Set<StatementLine>([
    ...recurring.flatMap((r) => r.lines),
    ...installments.flatMap((i) => i.lines),
    ...feeLines,
  ]);
  const manualMonthlyCents = manual.subscriptions.reduce((s, x) => s + x.monthlyCents, 0) + manual.installments.reduce((s, x) => s + x.installmentCents, 0);
  const byMonth: MonthlyFixed[] = months.map((month) => ({
    month,
    cents: sumAbs([...fixedLines].filter((l) => monthOf(l.date) === month)) + manualMonthlyCents,
  }));
  const total = byMonth.reduce((s, m) => s + m.cents, 0);
  const fixed = {
    byMonth,
    latestCents: byMonth.length ? byMonth[byMonth.length - 1]!.cents : manualMonthlyCents,
    averageCents: byMonth.length ? Math.round(total / byMonth.length) : manualMonthlyCents,
    manualMonthlyCents,
  };

  return { months, lastMonth, installments, possible, recurring, feeLines, interestLines, fixed };
}

/** Mês em que a curva começa: o seguinte ao último do arquivo; sem arquivo, o seguinte ao de `today`. */
export function startMonthFor(analysis: Analysis, today: string): MonthKey {
  return addMonths(analysis.lastMonth ?? monthOf(today), 1);
}
