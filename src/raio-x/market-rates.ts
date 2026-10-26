/**
 * Taxas médias de juros do mercado, como tabela datada (RN-02, PLN-42 RX-04): nenhuma chamada de rede
 * em tempo de uso. Fonte: Banco Central do Brasil, Sistema Gerenciador de Séries Temporais (SGS),
 * taxa média das novas operações de crédito livre de pessoas físicas, ponderada pelo valor das
 * concessões. Para atualizar: consultar `https://api.bcb.gov.br/dados/serie/bcdata.sgs.<série>/dados/ultimos/1?formato=json`.
 */
export type MarketRateId = 'rotativo' | 'cheque-especial' | 'pessoal';

export interface MarketRate {
  id: MarketRateId;
  label: string;
  /** Taxa média, em % ao mês. */
  monthlyPercent: number;
  /** Código da série no SGS. */
  serie: number;
}

export const MARKET_RATES: { fonte: string; referencia: string; conferidoEm: string; itens: readonly MarketRate[] } = {
  fonte: 'Banco Central do Brasil (SGS): taxa média das novas operações de crédito livre de pessoas físicas, ponderada pelo valor das concessões',
  /** Mês a que as taxas se referem (AAAA-MM). */
  referencia: '2026-08',
  /** Data em que os valores foram conferidos na API do BCB (AAAA-MM-DD). */
  conferidoEm: '2026-10-26',
  itens: [
    { id: 'rotativo', label: 'Cartão de crédito rotativo', monthlyPercent: 15.18, serie: 25477 },
    { id: 'cheque-especial', label: 'Cheque especial', monthlyPercent: 7.43, serie: 25463 },
    { id: 'pessoal', label: 'Crédito pessoal não consignado', monthlyPercent: 6.39, serie: 25464 },
  ],
};

/** "9,5", "9.5" ou "9,5%" -> 9.5; vazio, negativo ou fora de 0 a 100 -> null. */
export function parsePercent(text: string): number | null {
  const t = text.trim().replace('%', '').replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 100 ? n : null;
}

export interface RateComparison {
  /** Diferença relativa em %, com uma casa: positivo = a sua taxa é maior que a média. */
  relativePercent: number;
  verdict: 'acima' | 'abaixo' | 'igual';
}

/** (sua taxa ÷ média) − 1, em %. */
export function compareRate(userMonthly: number, marketMonthly: number): RateComparison {
  const relativePercent = Math.round(((userMonthly / marketMonthly) - 1) * 1000) / 10;
  return { relativePercent, verdict: relativePercent > 0 ? 'acima' : relativePercent < 0 ? 'abaixo' : 'igual' };
}

/** Formata uma taxa com vírgula decimal: 15.18 -> "15,18%". */
export const formatPercent = (n: number): string => `${n.toFixed(2).replace('.', ',')}%`;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-08" -> "ago/2026". */
export const formatReference = (aaaaMm: string): string => {
  const [a, m] = aaaaMm.split('-');
  return `${MESES[Number(m) - 1]}/${a}`;
};
