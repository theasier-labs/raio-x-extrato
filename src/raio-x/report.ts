import type { ExplainInput } from '../../shared/components/explainable-number/explainable-number.component';
import { formatCents } from '../core/money';
import type { Origin } from '../core/origin';
import type { ParsedStatement, StatementLine } from '../core/statement/types';
import { analyze, startMonthFor, type Analysis } from './analysis';
import { breathingCurve, type Breathing } from './breathing';
import { FEE_KEYWORDS, INTEREST_KEYWORDS } from './fees-interest';
import { monthLabel } from './months';
import { normalizeDescription } from './normalize';
import { RECURRENCE } from './recurrence';
import type { Installment, ManualInput, Recurring } from './types';

/** Um número do relatório com a conta aberta (regra da marca "mostrar a conta"). */
export interface ReportNumber {
  label: string;
  cents: number;
  value: string;
  formula: string;
  inputs: ExplainInput[];
  fonte: string;
  origem: Origin;
}

export interface CutItem {
  kind: 'assinatura' | 'tarifa' | 'juros';
  label: string;
  annual: ReportNumber;
}

export interface RaioXReport {
  monthsCount: number;
  months: string[];
  totals: {
    recurringAnnual: ReportNumber;
    fees: ReportNumber;
    interest: ReportNumber;
    fixedLatest: ReportNumber;
    fixedAverage: ReportNumber;
    installmentsRemaining: ReportNumber;
  };
  recurring: { item: Recurring; annual: ReportNumber }[];
  installments: { item: Installment; remainingTotal: ReportNumber }[];
  possible: Installment[];
  cuts: CutItem[];
  breathing: Breathing;
  /** Valor usado na curva e de onde veio. */
  thresholdSource: 'voce' | 'sugerido';
  negotiation: string | null;
  notes: string[];
  text: string;
}

const brl = formatCents;

function lineRefs(lines: StatementLine[]): string {
  if (!lines.length) return 'Informado por você';
  const refs = [...new Set(lines.map((l) => l.sourceLine))].sort((a, b) => a - b);
  return `Seu arquivo, linhas ${refs.join(', ')}`;
}

function num(label: string, cents: number, formula: string, inputs: ExplainInput[], fonte: string, origem: Origin): ReportNumber {
  return { label, cents, value: brl(cents), formula, inputs, fonte, origem };
}

function groupByKey(lines: StatementLine[]): { label: string; lines: StatementLine[] }[] {
  const groups = new Map<string, StatementLine[]>();
  for (const l of lines) {
    const k = normalizeDescription(l.description) || l.description;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.values()].map((g) => ({ label: g[0]!.description, lines: g }));
}

const sumAbs = (lines: StatementLine[]) => lines.reduce((s, l) => s + Math.abs(l.amountCents), 0);

export interface ReportOptions {
  /** Data de hoje (AAAA-MM-DD): define o início da curva quando não há arquivo. */
  today: string;
  /** Valor escolhido para "Quando eu respiro?" (centavos). Sem valor, sugere metade do peso do primeiro mês. */
  thresholdCents?: number | null;
  confirmedKeys?: readonly string[];
}

export function buildReport(statement: ParsedStatement | null, manual: ManualInput, options: ReportOptions): RaioXReport {
  const a: Analysis = analyze(statement, manual, options.confirmedKeys ?? []);
  const n = a.months.length;
  const fonteArquivo = 'Seu arquivo';
  const annualize = (period: number) => (n > 0 ? Math.round((period * 12) / n) : 0);

  const recurring = a.recurring.map((item) => ({
    item,
    annual: num(
      item.label,
      item.annualCents,
      'valor mensal × 12',
      [
        { label: 'Valor mensal', value: brl(item.monthlyCents) },
        ...(item.months.length ? [{ label: 'Meses em que apareceu', value: item.months.map(monthLabel).join(', ') }] : []),
      ],
      item.origem === 'usuario' ? 'Informado por você' : lineRefs(item.lines),
      item.origem,
    ),
  }));
  const recurringAnnual = a.recurring.reduce((s, r) => s + r.annualCents, 0);

  const installments = a.installments.map((item) => ({
    item,
    remainingTotal: num(
      item.label,
      item.installmentCents * item.remaining,
      'valor da parcela × parcelas que faltam',
      [
        { label: 'Valor da parcela', value: brl(item.installmentCents) },
        { label: 'Parcelas que faltam', value: String(item.remaining) },
      ],
      item.origem === 'usuario' ? 'Informado por você' : lineRefs(item.lines),
      item.origem,
    ),
  }));
  const remainingTotal = a.installments.reduce((s, i) => s + i.installmentCents * i.remaining, 0);

  const feePeriod = sumAbs(a.feeLines);
  const interestPeriod = sumAbs(a.interestLines);

  const feeGroups = groupByKey(a.feeLines);
  const interestGroups = groupByKey(a.interestLines);
  const periodInputs = (total: number): ExplainInput[] => [
    { label: 'Total no período', value: brl(total) },
    { label: 'Meses no arquivo', value: String(n) },
  ];
  const cuts: CutItem[] = [
    ...recurring.map((r): CutItem => ({ kind: 'assinatura', label: r.item.label, annual: r.annual })),
    ...feeGroups.map((g): CutItem => {
      const total = sumAbs(g.lines);
      return { kind: 'tarifa', label: g.label, annual: num(g.label, annualize(total), 'total no período ÷ meses no arquivo × 12', periodInputs(total), lineRefs(g.lines), 'regra') };
    }),
    ...interestGroups.map((g): CutItem => {
      const total = sumAbs(g.lines);
      return { kind: 'juros', label: g.label, annual: num(g.label, annualize(total), 'total no período ÷ meses no arquivo × 12', periodInputs(total), lineRefs(g.lines), 'regra') };
    }),
  ].sort((x, y) => y.annual.cents - x.annual.cents);

  const start = startMonthFor(a, options.today);
  const base = breathingCurve(a.installments, start, 1);
  const suggested = Math.max(1, Math.round((base.series[0]?.commitmentCents ?? 0) / 2));
  const chosen = options.thresholdCents && options.thresholdCents > 0 ? options.thresholdCents : suggested;
  const breathing = breathingCurve(a.installments, start, chosen);
  const thresholdSource: 'voce' | 'sugerido' = options.thresholdCents && options.thresholdCents > 0 ? 'voce' : 'sugerido';

  const fixedInputs = (): ExplainInput[] => [
    { label: 'Assinaturas e recorrências (mensal)', value: brl(a.recurring.reduce((s, r) => s + r.monthlyCents, 0)) },
    { label: 'Parcelas confirmadas (mensal)', value: brl(a.installments.reduce((s, i) => s + i.installmentCents, 0)) },
  ];
  const totals = {
    recurringAnnual: num('Assinaturas e recorrências por ano', recurringAnnual, 'soma dos valores anuais de cada item', a.recurring.map((r) => ({ label: r.label, value: brl(r.annualCents) })), a.recurring.length ? fonteArquivo : 'Nenhum item encontrado', 'regra'),
    fees: num('Tarifas no período', feePeriod, 'soma das tarifas encontradas', [{ label: 'Palavras consideradas', value: FEE_KEYWORDS.join(', ') }], lineRefs(a.feeLines), 'regra'),
    interest: num('Juros e encargos no período', interestPeriod, 'soma dos juros, encargos e IOF encontrados', [{ label: 'Palavras consideradas', value: INTEREST_KEYWORDS.join(', ') }], lineRefs(a.interestLines), 'regra'),
    fixedLatest: num('Gasto fixo no último mês do arquivo', a.fixed.latestCents, 'assinaturas + parcelas confirmadas + tarifas do mês', fixedInputs(), fonteArquivo, 'regra'),
    fixedAverage: num('Gasto fixo médio por mês', a.fixed.averageCents, 'soma do gasto fixo de cada mês ÷ meses no arquivo', a.fixed.byMonth.map((m) => ({ label: monthLabel(m.month), value: brl(m.cents) })), fonteArquivo, 'regra'),
    installmentsRemaining: num('Parcelas que ainda faltam pagar', remainingTotal, 'soma de (valor da parcela × parcelas que faltam)', a.installments.map((i) => ({ label: i.label, value: brl(i.installmentCents * i.remaining) })), fonteArquivo, 'regra'),
  };

  const notes: string[] = [];
  if (statement && n > 0 && n < RECURRENCE.minMonths) {
    notes.push(`O arquivo cobre só ${n} ${n === 1 ? 'mês' : 'meses'}. Uma assinatura precisa aparecer em pelo menos ${RECURRENCE.minMonths} meses diferentes para ser encontrada.`);
  }
  if (a.possible.length) {
    notes.push(`${a.possible.length} possível(is) parcela(s) aguardam a sua confirmação e ainda não entram na conta nem na curva.`);
  }
  notes.push(`Como decidimos: assinatura é a mesma descrição, em pelo menos ${RECURRENCE.minMonths} meses diferentes, com valor dentro de ${Math.round(RECURRENCE.tolerance * 100)}% da mediana. Parcela só conta com marca clara ("PARC 03/10"). Tarifa e juros são reconhecidos pelas palavras listadas em cada número.`);

  const negotiation = interestPeriod > 0
    ? [
        'Olá, tudo bem?',
        `Analisei o meu extrato dos últimos ${n} ${n === 1 ? 'mês' : 'meses'} e vi que paguei ${brl(interestPeriod)} em juros e encargos nesse período, cerca de ${brl(Math.round(interestPeriod / n))} por mês.`,
        'Gostaria de saber que condições vocês podem oferecer para reduzir esse custo: troca de modalidade, parcelamento do saldo com taxa menor ou renegociação.',
        'Podem me enviar uma proposta por escrito, com o custo efetivo total (CET) de cada opção?',
        'Obrigado.',
      ].join('\n\n')
    : null;

  const text = [
    'Raio-X do Extrato (simulação educativa, não é aconselhamento financeiro)',
    n ? `Período do arquivo: ${monthLabel(a.months[0]!)} a ${monthLabel(a.months[n - 1]!)} (${n} ${n === 1 ? 'mês' : 'meses'})` : 'Dados informados manualmente',
    '',
    `${totals.recurringAnnual.label}: ${totals.recurringAnnual.value}`,
    ...recurring.map((r) => `  - ${r.item.label}: ${brl(r.item.monthlyCents)}/mês, ${r.annual.value}/ano`),
    `${totals.fees.label}: ${totals.fees.value}`,
    `${totals.interest.label}: ${totals.interest.value}`,
    `${totals.fixedLatest.label}: ${totals.fixedLatest.value}`,
    `${totals.installmentsRemaining.label}: ${totals.installmentsRemaining.value}`,
    ...installments.map((i) => `  - ${i.item.label}: ${i.item.remaining} parcela(s) de ${brl(i.item.installmentCents)}`),
    '',
    breathing.alreadyBelow
      ? `Quando eu respiro? As parcelas já estão abaixo de ${brl(chosen)} por mês.`
      : `Quando eu respiro? Em ${breathing.breatheMonth ? monthLabel(breathing.breatheMonth) : 'data indefinida'}, o peso das parcelas cai abaixo de ${brl(chosen)} por mês.`,
    '',
    ...(cuts.length ? ['O que dá para cortar (valor por ano):', ...cuts.map((c) => `  - ${c.label}: ${c.annual.value}`)] : []),
  ].join('\n');

  return {
    monthsCount: n,
    months: a.months,
    totals,
    recurring,
    installments,
    possible: a.possible,
    cuts,
    breathing,
    thresholdSource,
    negotiation,
    notes,
    text,
  };
}
