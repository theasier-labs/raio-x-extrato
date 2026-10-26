// Exemplo 100% fictício (nomes, lojas e valores inventados), exibido sempre como "dados de exemplo".

const brl = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Seis meses de um extrato fictício, em CSV, para a pessoa ver o resultado sem enviar nada. */
export function sampleCsv(): string {
  const meses = ['04', '05', '06', '07', '08', '09'];
  const mercado = [31000, 45235, 29810, 50500, 37777, 42000];
  const rows: string[] = ['Data;Descrição;Valor'];
  meses.forEach((m, i) => {
    const d = (dia: string) => `${dia}/${m}/2026`;
    rows.push(`${d('05')};STREAMING EXEMPLO;-${brl(3990)}`);
    rows.push(`${d('10')};ACADEMIA EXEMPLO;-${brl(9990)}`);
    rows.push(`${d('12')};MERCADO EXEMPLO;-${brl(mercado[i]!)}`);
    rows.push(`${d('15')};PARC ${String(i + 1).padStart(2, '0')}/10 LOJA EXEMPLO;-${brl(15000)}`);
    rows.push(`${d('20')};TARIFA PACOTE SERVICOS;-${brl(2500)}`);
    rows.push(`${d('28')};SALARIO EXEMPLO;${brl(450000)}`);
  });
  rows.push(`10/08/2026;PARCELA 4 DE 6 NOTEBOOK EXEMPLO;-${brl(20000)}`);
  rows.push(`10/09/2026;PARCELA 5 DE 6 NOTEBOOK EXEMPLO;-${brl(20000)}`);
  rows.push(`22/08/2026;JUROS ROTATIVO CARTAO;-${brl(8840)}`);
  rows.push(`22/09/2026;JUROS ROTATIVO CARTAO;-${brl(9115)}`);
  rows.push(`22/08/2026;IOF OPERACAO CREDITO;-${brl(320)}`);
  rows.push(`22/09/2026;IOF OPERACAO CREDITO;-${brl(330)}`);
  rows.push(`18/09/2026;OUTRA LOJA EXEMPLO 02/12;-${brl(7500)}`);
  return rows.join('\n');
}
