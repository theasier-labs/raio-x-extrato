import { breathingCurve } from './breathing';

const inst = (installmentCents: number, remaining: number, confirmed = true) => ({ installmentCents, remaining, confirmed });

describe('"Quando eu respiro?" (TC-U5-06)', () => {
  it('soma as parcelas ativas mês a mês e acha o primeiro mês abaixo do valor escolhido', () => {
    const c = breathingCurve([inst(15000, 4), inst(20000, 1)], '2026-10', 20000);
    expect(c.series).toEqual([
      { month: '2026-10', commitmentCents: 35000 },
      { month: '2026-11', commitmentCents: 15000 },
      { month: '2026-12', commitmentCents: 15000 },
      { month: '2027-01', commitmentCents: 15000 },
      { month: '2027-02', commitmentCents: 0 },
    ]);
    expect(c.breatheMonth).toBe('2026-11');
    expect(c.alreadyBelow).toBeFalse();
  });

  it('diz quando já começa abaixo do valor', () => {
    const c = breathingCurve([inst(10000, 2)], '2026-10', 50000);
    expect(c.alreadyBelow).toBeTrue();
    expect(c.breatheMonth).toBe('2026-10');
  });

  it('possível parcela e parcela sem restante não entram', () => {
    const c = breathingCurve([inst(99999, 5, false), inst(5000, 0)], '2026-10', 1000);
    expect(c.series).toEqual([{ month: '2026-10', commitmentCents: 0 }]);
    expect(c.alreadyBelow).toBeTrue();
  });

  it('o peso sempre chega a zero, então o mês de respirar sempre existe', () => {
    const c = breathingCurve([inst(100000, 12)], '2026-10', 1);
    expect(c.breatheMonth).toBe('2027-10');
  });
});
