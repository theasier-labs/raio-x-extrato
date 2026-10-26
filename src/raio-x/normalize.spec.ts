import { addMonths, monthLabel, monthOf } from './months';
import { normalizeDescription } from './normalize';

describe('normalização e meses (TC-U5-01)', () => {
  it('agrupa descrições parecidas', () => {
    expect(normalizeDescription('Mercado Exemplo  Loja 12 - 05/09')).toBe('MERCADO EXEMPLO LOJA');
    expect(normalizeDescription('PARC 03/10 Loja Exemplo')).toBe('PARC LOJA EXEMPLO');
    expect(normalizeDescription('Pagamento Açaí & Café')).toBe('PAGAMENTO ACAI CAFE');
    expect(normalizeDescription('1234 / 5678')).toBe('');
  });

  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthOf('2026-09-30')).toBe('2026-09');
    expect(monthLabel('2026-10')).toBe('out/2026');
  });
});
