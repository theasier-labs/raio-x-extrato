import type { StatementLine } from '../core/statement/types';
import { detectInstallments, parseInstallmentMark } from './installments';

const line = (date: string, description: string, amountCents: number, sourceLine = 1): StatementLine => ({ date, description, amountCents, sourceLine });

describe('parcelas (TC-U5-03)', () => {
  it('reconhece evidência clara e trata "n/m" solto como possível', () => {
    expect(parseInstallmentMark('PARC 03/10 LOJA')).toEqual({ current: 3, total: 10, confirmed: true });
    expect(parseInstallmentMark('PARCELA 3 DE 10 LOJA')).toEqual({ current: 3, total: 10, confirmed: true });
    expect(parseInstallmentMark('LOJA 03/10')).toEqual({ current: 3, total: 10, confirmed: false });
  });

  it('não confunde data completa, valor impossível nem texto comum com parcela', () => {
    expect(parseInstallmentMark('COMPRA 03/10/2026')).toBeNull();
    expect(parseInstallmentMark('LOJA 12/10')).toBeNull();
    expect(parseInstallmentMark('PARC 11/10 LOJA')).toBeNull();
    expect(parseInstallmentMark('PARC 01/01 LOJA')).toBeNull();
    expect(parseInstallmentMark('NETFLIX')).toBeNull();
  });

  it('agrupa a compra e fica com a última parcela do arquivo', () => {
    const [p] = detectInstallments([
      line('2026-08-15', 'PARC 04/10 LOJA EXEMPLO', -15000, 5),
      line('2026-09-15', 'PARC 05/10 LOJA EXEMPLO', -15000, 9),
      line('2026-07-15', 'PARC 03/10 LOJA EXEMPLO', -15000, 2),
    ]);
    expect(p?.current).toBe(5);
    expect(p?.remaining).toBe(5);
    expect(p?.installmentCents).toBe(15000);
    expect(p?.lines.length).toBe(3);
  });

  it('ignora entradas (só saídas contam)', () => {
    expect(detectInstallments([line('2026-09-15', 'PARC 05/10 ESTORNO', 15000)])).toEqual([]);
  });
});
