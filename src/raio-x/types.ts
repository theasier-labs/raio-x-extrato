import type { Origin } from '../core/origin';
import type { StatementLine } from '../core/statement/types';
import type { MonthKey } from './months';

/** Item que se repete todo mês (assinatura, mensalidade). Valores em centavos. */
export interface Recurring {
  key: string;
  label: string;
  monthlyCents: number;
  annualCents: number;
  months: MonthKey[];
  /** Lançamentos que sustentam a conta (vazio no modo manual). */
  lines: StatementLine[];
  origem: Extract<Origin, 'regra' | 'usuario'>;
}

/** Compra parcelada. `current`/`total` vêm da marca "n/m" da descrição. */
export interface Installment {
  key: string;
  label: string;
  installmentCents: number;
  /** Parcela em que o arquivo termina (n). */
  current: number;
  total: number;
  /** Parcelas que ainda faltam (m − n). */
  remaining: number;
  /** `true` quando há evidência clara ("PARC 03/10"); `false` = "possível parcela", a pessoa confirma. */
  confirmed: boolean;
  lines: StatementLine[];
  origem: Extract<Origin, 'regra' | 'usuario'>;
}

export interface ManualInstallment {
  label: string;
  installmentCents: number;
  remaining: number;
}

export interface ManualSubscription {
  label: string;
  monthlyCents: number;
}

export interface ManualInput {
  installments: ManualInstallment[];
  subscriptions: ManualSubscription[];
}

export const EMPTY_MANUAL: ManualInput = { installments: [], subscriptions: [] };
