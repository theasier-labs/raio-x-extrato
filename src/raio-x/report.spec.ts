import { parseCsvStatement } from '../core/statement/csv.parser';
import { buildReport } from './report';
import { sampleCsv } from './sample';
import { EMPTY_MANUAL } from './types';

const hoje = '2026-10-21';
const exemplo = () => parseCsvStatement(sampleCsv());

describe('relatório do exemplo fictício, conta feita à mão (TC-U5-05, 08, 09)', () => {
  const r = buildReport(exemplo(), EMPTY_MANUAL, { today: hoje, thresholdCents: 20000 });

  it('o exemplo é lido sem nenhum problema', () => {
    expect(exemplo().issues).toEqual([]);
    expect(r.monthsCount).toBe(6);
  });

  it('assinaturas por ano: 47.880 + 119.880 centavos', () => {
    expect(r.totals.recurringAnnual.cents).toBe(167760);
    expect(r.recurring.map((x) => x.item.label)).toEqual(['ACADEMIA EXEMPLO', 'STREAMING EXEMPLO']);
  });

  it('mercado, que varia muito, não é assinatura', () => {
    expect(r.recurring.some((x) => x.item.label.includes('MERCADO'))).toBeFalse();
  });

  it('tarifas e juros do período', () => {
    expect(r.totals.fees.cents).toBe(15000);
    expect(r.totals.interest.cents).toBe(18605);
  });

  it('gasto fixo: último mês e média', () => {
    expect(r.totals.fixedLatest.cents).toBe(51480);
    expect(r.totals.fixedAverage.cents).toBe(38147);
  });

  it('parcelas que faltam: 4 × 150,00 + 1 × 200,00', () => {
    expect(r.totals.installmentsRemaining.cents).toBe(80000);
    expect(r.possible.length).toBe(1);
  });

  it('curva: respira em nov/2026 com limiar de R$ 200,00', () => {
    expect(r.breathing.breatheMonth).toBe('2026-11');
    expect(r.thresholdSource).toBe('voce');
  });

  it('lista do que dá para cortar, do maior para o menor valor anual', () => {
    expect(r.cuts.map((c) => [c.kind, c.annual.cents])).toEqual([
      ['assinatura', 119880],
      ['assinatura', 47880],
      ['juros', 35910],
      ['tarifa', 30000],
      ['juros', 1300],
    ]);
  });

  it('cada número traz fórmula, entradas e fonte; nenhum vem da IA', () => {
    const todos = [...Object.values(r.totals), ...r.cuts.map((c) => c.annual), ...r.recurring.map((x) => x.annual)];
    for (const n of todos) {
      expect(n.formula.length).withContext(n.label).toBeGreaterThan(5);
      expect(n.fonte.length).withContext(n.label).toBeGreaterThan(3);
      expect(n.origem).withContext(n.label).not.toBe('ia');
      expect(n.value).withContext(n.label).toMatch(/^-?R\$ /);
    }
  });

  it('a fonte aponta as linhas do arquivo', () => {
    expect(r.recurring[0]?.annual.fonte).toMatch(/^Seu arquivo, linhas \d/);
  });

  it('a mensagem de negociação usa o total real de juros e pede proposta por escrito', () => {
    expect(r.negotiation).toContain('R$ 186,05');
    expect(r.negotiation).toContain('por escrito');
  });

  it('o texto copiável traz o aviso e os totais', () => {
    expect(r.text).toContain('não é aconselhamento financeiro');
    expect(r.text).toContain('R$ 1.677,60');
    expect(r.text).toContain('nov/2026');
  });

  it('confirmar a possível parcela a coloca na conta e na curva', () => {
    const [possivel] = r.possible;
    const confirmado = buildReport(exemplo(), EMPTY_MANUAL, { today: hoje, thresholdCents: 20000, confirmedKeys: [possivel!.key] });
    expect(confirmado.possible.length).toBe(0);
    expect(confirmado.totals.installmentsRemaining.cents).toBe(80000 + 7500 * 10);
  });

  it('sem limiar do usuário, sugere metade do primeiro mês e diz que foi sugerido', () => {
    const s = buildReport(exemplo(), EMPTY_MANUAL, { today: hoje });
    expect(s.thresholdSource).toBe('sugerido');
    expect(s.breathing.thresholdCents).toBe(17500);
  });

  it('é determinístico: o mesmo arquivo dá o mesmo relatório', () => {
    expect(JSON.stringify(buildReport(exemplo(), EMPTY_MANUAL, { today: hoje, thresholdCents: 20000 }))).toBe(JSON.stringify(r));
  });
});

describe('modo manual (TC-U5-07)', () => {
  it('sem arquivo, usa só o que a pessoa informou e marca a origem como "você"', () => {
    const r = buildReport(null, { installments: [{ label: 'Celular', installmentCents: 12000, remaining: 3 }], subscriptions: [{ label: 'Streaming', monthlyCents: 3990 }] }, { today: '2026-10-21', thresholdCents: 10000 });
    expect(r.totals.recurringAnnual.cents).toBe(47880);
    expect(r.totals.installmentsRemaining.cents).toBe(36000);
    expect(r.totals.fixedLatest.cents).toBe(15990);
    expect(r.recurring[0]?.annual.origem).toBe('usuario');
    expect(r.recurring[0]?.annual.fonte).toBe('Informado por você');
    expect(r.breathing.series[0]?.month).toBe('2026-11');
    expect(r.breathing.breatheMonth).toBe('2027-02');
  });

  it('manual e arquivo se somam no mesmo motor', () => {
    const r = buildReport(parseCsvStatement(sampleCsv()), { installments: [], subscriptions: [{ label: 'Revista', monthlyCents: 1000 }] }, { today: '2026-10-21', thresholdCents: 20000 });
    expect(r.totals.recurringAnnual.cents).toBe(167760 + 12000);
  });

  it('sem juros no período, não oferece mensagem de negociação', () => {
    expect(buildReport(null, { installments: [], subscriptions: [] }, { today: '2026-10-21' }).negotiation).toBeNull();
  });
});
