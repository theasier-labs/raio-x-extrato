/**
 * Dinheiro sempre em centavos inteiros: nunca decimal, para o cálculo ser exato e
 * repetível (a IA nunca calcula valores — RN-05).
 */

/**
 * Lê um valor em formato brasileiro ou internacional e devolve centavos.
 * Regras: se há vírgula, ela é o separador decimal e os pontos são milhar ("1.234,56");
 * sem vírgula, ponto seguido de 3 dígitos é milhar ("1.234") e ponto com 1 ou 2 dígitos é decimal ("1234.5").
 * Sinal: "-" antes ou depois, ou parênteses. Devolve null quando não dá para ler com segurança.
 */
export function parseMoneyToCents(input: string): number | null {
  let s = input.trim().replace(/\s+/g, '').replace(/^R\$/i, '').replace(/−/g, '-');
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (s.endsWith('-')) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  s = s.replace(/^R\$/i, '');

  let integer: string;
  let fraction = '';
  if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length !== 2) return null;
    const [intPart, fracPart] = parts as [string, string];
    if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(intPart)) return null;
    if (!/^\d{1,2}$/.test(fracPart) && fracPart !== '') return null;
    integer = intPart.replace(/\./g, '');
    fraction = fracPart;
  } else if (s.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      integer = s.replace(/\./g, '');
    } else if (/^\d+\.\d{1,2}$/.test(s)) {
      [integer, fraction] = s.split('.') as [string, string];
    } else {
      return null;
    }
  } else {
    if (!/^\d+$/.test(s)) return null;
    integer = s;
  }
  if (!/^\d+$/.test(integer)) return null;

  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents)) return null;
  return negative && cents !== 0 ? -cents : cents;
}

/** Formata centavos como "R$ 1.234,56" (sem depender do idioma do navegador). */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (abs % 100).toString().padStart(2, '0');
  return `${sign}R$ ${reais},${centavos}`;
}
