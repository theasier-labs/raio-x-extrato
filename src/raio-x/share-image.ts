import { formatCents } from '../core/money';

const ADDRESS = 'theasier.com.br/ferramentas/raio-x-do-extrato';

/**
 * Imagem para compartilhar. Recebe só o total anual em assinaturas (um número): por construção,
 * nenhum nome de estabelecimento, valor de outro item ou dado do arquivo entra na imagem.
 */
export function renderShareImage(annualCents: number): Promise<Blob> {
  if (!Number.isSafeInteger(annualCents) || annualCents <= 0) return Promise.reject(new Error('Sem valor para compartilhar.'));
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas indisponível.'));

  ctx.fillStyle = '#001943';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 44px system-ui, sans-serif';
  ctx.fillText('Descobri que pago', 80, 170);
  ctx.font = '700 120px system-ui, sans-serif';
  ctx.fillText(`${formatCents(annualCents)} por ano`, 80, 320);
  ctx.font = '500 44px system-ui, sans-serif';
  ctx.fillText('em assinaturas e mensalidades.', 80, 400);
  ctx.fillStyle = '#9db4ff';
  ctx.font = '500 34px system-ui, sans-serif';
  ctx.fillText('Faça o seu Raio-X do Extrato, de graça:', 80, 520);
  ctx.fillText(ADDRESS, 80, 570);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png'));
}
