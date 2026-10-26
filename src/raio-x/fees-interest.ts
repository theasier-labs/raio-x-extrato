import { normalizeDescription } from './normalize';

/** Palavras que marcam uma tarifa. A lista aparece na tela: quem usa vê o que foi considerado. */
export const FEE_KEYWORDS = ['TARIFA', 'ANUIDADE', 'PACOTE DE SERVICOS', 'CESTA DE SERVICOS'] as const;

/** Palavras que marcam juros, encargos e IOF de crédito. */
export const INTEREST_KEYWORDS = ['JUROS', 'ENCARGOS', 'MORA', 'MULTA', 'ROTATIVO', 'IOF', 'CHEQUE ESPECIAL'] as const;

function matches(normalized: string, keywords: readonly string[]): boolean {
  return keywords.some((k) => new RegExp(`(^| )${k}( |$)`).test(normalized));
}

export type FeeKind = 'juros' | 'tarifa' | null;

/** Juros/encargos têm precedência sobre tarifa quando a descrição tem os dois tipos de palavra. */
export function classifyFeeOrInterest(description: string): FeeKind {
  const n = normalizeDescription(description);
  if (matches(n, INTEREST_KEYWORDS)) return 'juros';
  if (matches(n, FEE_KEYWORDS)) return 'tarifa';
  return null;
}
