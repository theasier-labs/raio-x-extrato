import { formatCents, parseMoneyToCents } from './money';

describe('dinheiro em centavos (TC-U4-02, D-U4-01)', () => {
  const casos: [string, number | null][] = [
    ['1.234,56', 123456],
    ['R$ 10,00', 1000],
    ['-10,5', -1050],
    ['(10,00)', -1000],
    ['10,00-', -1000],
    ['−7,25', -725],
    ['1.234', 123400],
    ['1234.5', 123450],
    ['1.5', 150],
    ['10,', 1000],
    ['0,00', 0],
    ['', null],
    ['abc', null],
    ['1,2,3', null],
    ['1.23.4', null],
    ['12,345', null],
  ];
  for (const [entrada, esperado] of casos) {
    it(`"${entrada}" → ${esperado}`, () => {
      expect(parseMoneyToCents(entrada)).toBe(esperado);
    });
  }

  it('formata em reais com milhar e vírgula', () => {
    expect(formatCents(123456)).toBe('R$ 1.234,56');
    expect(formatCents(-123456)).toBe('-R$ 1.234,56');
    expect(formatCents(5)).toBe('R$ 0,05');
    expect(formatCents(0)).toBe('R$ 0,00');
  });

  it('soma de centavos é exata (sem erro de ponto flutuante)', () => {
    const soma = (parseMoneyToCents('0,10') ?? 0) + (parseMoneyToCents('0,20') ?? 0);
    expect(soma).toBe(30);
  });
});
