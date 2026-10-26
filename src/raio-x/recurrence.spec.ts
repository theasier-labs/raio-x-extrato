import type { StatementLine } from '../core/statement/types';
import { classifyFeeOrInterest } from './fees-interest';
import { detectRecurring } from './recurrence';

const line = (date: string, description: string, amountCents: number): StatementLine => ({ date, description, amountCents, sourceLine: 1 });

describe('recorrência (TC-U5-02) e tarifas/juros (TC-U5-04)', () => {
  it('encontra o que se repete em 3+ meses, com valor estável', () => {
    const r = detectRecurring([
      line('2026-07-05', 'STREAMING EXEMPLO', -3990),
      line('2026-08-05', 'STREAMING EXEMPLO', -3990),
      line('2026-09-05', 'STREAMING EXEMPLO', -4090),
    ]);
    expect(r.length).toBe(1);
    expect(r[0]?.monthlyCents).toBe(3990);
    expect(r[0]?.annualCents).toBe(47880);
    expect(r[0]?.months).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('não marca como recorrente o que varia muito ou aparece em poucos meses', () => {
    expect(detectRecurring([line('2026-07-05', 'MERCADO', -10000), line('2026-08-05', 'MERCADO', -45000), line('2026-09-05', 'MERCADO', -20000)])).toEqual([]);
    expect(detectRecurring([line('2026-08-05', 'ACADEMIA', -9990), line('2026-09-05', 'ACADEMIA', -9990)])).toEqual([]);
  });

  it('duas compras no mesmo mês contam como um mês só', () => {
    expect(detectRecurring([line('2026-07-05', 'CAFE', -1000), line('2026-07-20', 'CAFE', -1000), line('2026-08-05', 'CAFE', -1000)])).toEqual([]);
  });

  it('entradas não contam', () => {
    expect(detectRecurring([line('2026-07-05', 'SALARIO', 500000), line('2026-08-05', 'SALARIO', 500000), line('2026-09-05', 'SALARIO', 500000)])).toEqual([]);
  });

  it('classifica tarifas e juros por palavra, com juros na frente', () => {
    expect(classifyFeeOrInterest('TARIFA PACOTE SERVICOS')).toBe('tarifa');
    expect(classifyFeeOrInterest('Anuidade Cartão 03/12')).toBe('tarifa');
    expect(classifyFeeOrInterest('JUROS ROTATIVO CARTAO')).toBe('juros');
    expect(classifyFeeOrInterest('IOF OPERACAO CREDITO')).toBe('juros');
    expect(classifyFeeOrInterest('TARIFA JUROS CHEQUE ESPECIAL')).toBe('juros');
    expect(classifyFeeOrInterest('MERCADO EXEMPLO')).toBeNull();
    expect(classifyFeeOrInterest('LOJA TARIFARIA')).toBeNull();
  });
});
