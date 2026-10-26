import { MARKET_RATES, compareRate, formatPercent, formatReference, parsePercent } from './market-rates';

describe('taxas médias do BCB (RX-04)', () => {
  it('a tabela traz fonte, mês de referência, data de conferência e série de cada taxa', () => {
    expect(MARKET_RATES.fonte).toContain('Banco Central do Brasil');
    expect(MARKET_RATES.referencia).toMatch(/^\d{4}-\d{2}$/);
    expect(MARKET_RATES.conferidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MARKET_RATES.itens.map((i) => i.id)).toEqual(['rotativo', 'cheque-especial', 'pessoal']);
    for (const i of MARKET_RATES.itens) {
      expect(i.serie).toBeGreaterThan(0);
      expect(i.monthlyPercent).toBeGreaterThan(0);
    }
  });

  it('lê a taxa digitada com vírgula, ponto ou %, e recusa o que não é taxa', () => {
    expect(parsePercent('9,5')).toBe(9.5);
    expect(parsePercent('9.5')).toBe(9.5);
    expect(parsePercent(' 12 % ')).toBe(12);
    for (const ruim of ['', 'abc', '-3', '0', '101', '1,2,3']) expect(parsePercent(ruim)).withContext(ruim).toBeNull();
  });

  it('compara com a média: (sua taxa ÷ média) − 1', () => {
    expect(compareRate(9.5, 7.43)).toEqual({ relativePercent: 27.9, verdict: 'acima' });
    expect(compareRate(5, 6.39)).toEqual({ relativePercent: -21.8, verdict: 'abaixo' });
    expect(compareRate(7.43, 7.43)).toEqual({ relativePercent: 0, verdict: 'igual' });
  });

  it('formata a taxa e o mês de referência', () => {
    expect(formatPercent(15.18)).toBe('15,18%');
    expect(formatPercent(7.4)).toBe('7,40%');
    expect(formatReference('2026-08')).toBe('ago/2026');
  });
});
