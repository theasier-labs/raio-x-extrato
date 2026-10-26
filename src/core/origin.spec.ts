import { fromAi, fromRule, fromUser } from './origin';

describe('origem do valor (TC-U4-01, RF-17)', () => {
  it('regra e usuário não carregam metadados de IA', () => {
    expect(fromRule(10)).toEqual({ value: 10, origem: 'regra' });
    expect(fromUser('x')).toEqual({ value: 'x', origem: 'usuario' });
  });

  it('IA sempre carrega modelo, versão do prompt e confiança', () => {
    const v = fromAi('Mercado', { modelo: 'modelo-pequeno', versao_prompt: 'v1', confianca: 0.8 });
    expect(v.origem).toBe('ia');
    expect(v).toEqual({ value: 'Mercado', origem: 'ia', modelo: 'modelo-pequeno', versao_prompt: 'v1', confianca: 0.8 });
  });
});
