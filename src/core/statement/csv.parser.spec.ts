import { CSV_BASICO, CSV_DEBITO_CREDITO } from '../testing/fixtures';
import { parseCsvStatement } from './csv.parser';

describe('parser de CSV (TC-U4-03)', () => {
  it('lê ponto e vírgula, aspas e valores brasileiros', () => {
    const r = parseCsvStatement(CSV_BASICO);
    expect(r.source).toBe('csv');
    expect(r.lines).toEqual([
      { date: '2026-01-05', description: 'MERCADO EXEMPLO, LOJA 1', amountCents: -12345, sourceLine: 2 },
      { date: '2026-01-06', description: 'PIX RECEBIDO PESSOA FICTICIA', amountCents: 150000, sourceLine: 3 },
    ]);
  });

  it('mostra as linhas que não entendeu, com o motivo, em vez de descartá-las', () => {
    const r = parseCsvStatement(CSV_BASICO);
    expect(r.issues.map((i) => [i.line, i.reason])).toEqual([
      [4, 'Data inválida.'],
      [5, 'Valor inválido.'],
    ]);
  });

  it('aceita colunas de débito e crédito', () => {
    const r = parseCsvStatement(CSV_DEBITO_CREDITO);
    expect(r.lines.map((l) => l.amountCents)).toEqual([-1000, 5000]);
    expect(r.issues).toEqual([]);
  });

  it('avisa quando o cabeçalho não é reconhecido e quando o arquivo é vazio', () => {
    expect(parseCsvStatement('a;b;c\n1;2;3').issues[0]?.reason).toContain('Cabeçalho não reconhecido');
    expect(parseCsvStatement('   \n').issues[0]?.reason).toBe('Arquivo vazio.');
  });

  it('ignora o BOM do início do arquivo', () => {
    expect(parseCsvStatement('﻿Data;Descrição;Valor\n05/01/2026;X;1,00').lines.length).toBe(1);
  });
});
