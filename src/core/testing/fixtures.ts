// Arquivos de exemplo 100% fictícios. Nunca colocar aqui um extrato real.

export const CSV_BASICO = [
  'Data;Descrição;Valor',
  '05/01/2026;"MERCADO EXEMPLO, LOJA 1";-123,45',
  '06/01/2026;PIX RECEBIDO PESSOA FICTICIA;1.500,00',
  '31/02/2026;DATA IMPOSSIVEL;-10,00',
  '07/01/2026;VALOR RUIM;abc',
].join('\n');

export const CSV_DEBITO_CREDITO = [
  'Data,Histórico,Débito,Crédito',
  '05/01/2026,Compra exemplo,"10,00",',
  '06/01/2026,Deposito exemplo,,"50,00"',
].join('\n');

export const OFX_SGML = [
  'OFXHEADER:100',
  'DATA:OFXSGML',
  'VERSION:102',
  '',
  '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>',
  '<STMTTRN>',
  '<TRNTYPE>DEBIT',
  '<DTPOSTED>20260105120000[-3:BRT]',
  '<TRNAMT>-123.45',
  '<FITID>0001',
  '<MEMO>MERCADO EXEMPLO',
  '</STMTTRN>',
  '<STMTTRN>',
  '<TRNTYPE>CREDIT',
  '<DTPOSTED>20260106',
  '<TRNAMT>1500.00',
  '<FITID>0002',
  '<NAME>PIX FICTICIO',
  '<MEMO>PIX FICTICIO',
  '</STMTTRN>',
  '<STMTTRN>',
  '<DTPOSTED>20260107',
  '<TRNAMT>x',
  '</STMTTRN>',
  '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
].join('\n');

export const OFX_XML =
  '<?xml version="1.0"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>' +
  '<STMTTRN><DTPOSTED>20260105</DTPOSTED><TRNAMT>-10,50</TRNAMT><FITID>9</FITID><NAME>A &amp; B</NAME></STMTTRN>' +
  '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
