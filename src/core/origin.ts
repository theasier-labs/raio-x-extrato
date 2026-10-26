/** Quem produziu o valor. Regra da marca "IA identificada": nenhum valor derivado fica sem origem. */
export type Origin = 'regra' | 'ia' | 'usuario';

interface TracedBase<T> {
  value: T;
}

export type TracedByRuleOrUser<T> = TracedBase<T> & { origem: 'regra' | 'usuario' };

/** Valor vindo da IA: carrega o modelo, a versão do prompt e a confiança (RF-17). */
export type TracedByAi<T> = TracedBase<T> & {
  origem: 'ia';
  modelo: string;
  versao_prompt: string;
  /** 0 a 1. */
  confianca: number;
};

export type TracedValue<T> = TracedByRuleOrUser<T> | TracedByAi<T>;

export const fromRule = <T>(value: T): TracedValue<T> => ({ value, origem: 'regra' });
export const fromUser = <T>(value: T): TracedValue<T> => ({ value, origem: 'usuario' });
export const fromAi = <T>(value: T, meta: { modelo: string; versao_prompt: string; confianca: number }): TracedValue<T> => ({
  value,
  origem: 'ia',
  ...meta,
});

export const ORIGIN_LABEL: Record<Origin, string> = {
  regra: 'Regra',
  ia: 'IA',
  usuario: 'Você',
};
