import { OFX_SGML, OFX_XML } from '../testing/fixtures';
import { parseOfxStatement } from './ofx.parser';

describe('parser de OFX (TC-U4-04)', () => {
  it('lê OFX em SGML (tags sem fechamento)', () => {
    const r = parseOfxStatement(OFX_SGML);
    expect(r.source).toBe('ofx');
    expect(r.lines).toEqual([
      { date: '2026-01-05', description: 'MERCADO EXEMPLO', amountCents: -12345, id: '0001', sourceLine: 1 },
      { date: '2026-01-06', description: 'PIX FICTICIO', amountCents: 150000, id: '0002', sourceLine: 2 },
    ]);
  });

  it('mostra o lançamento ilegível como problema', () => {
    const r = parseOfxStatement(OFX_SGML);
    expect(r.issues.length).toBe(1);
    expect(r.issues[0]?.reason).toContain('TRNAMT');
    expect(r.issues[0]?.line).toBe(3);
  });

  it('lê OFX em XML, com vírgula decimal e entidades', () => {
    const r = parseOfxStatement(OFX_XML);
    expect(r.lines).toEqual([{ date: '2026-01-05', description: 'A & B', amountCents: -1050, id: '9', sourceLine: 1 }]);
    expect(r.issues).toEqual([]);
  });

  it('recusa arquivo que não é OFX', () => {
    expect(parseOfxStatement('Data;Valor').issues[0]?.reason).toContain('não parece ser um OFX');
  });
});
