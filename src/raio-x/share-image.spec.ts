import { renderShareImage } from './share-image';

describe('imagem para compartilhar (TC-U5-15)', () => {
  it('gera um PNG a partir de um único número', async () => {
    const blob = await renderShareImage(167760);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('recusa valor vazio ou inválido', async () => {
    await expectAsync(renderShareImage(0)).toBeRejected();
    await expectAsync(renderShareImage(-5)).toBeRejected();
    await expectAsync(renderShareImage(1.5)).toBeRejected();
  });

  it('a função só aceita um número: não há como incluir dados do arquivo', () => {
    expect(renderShareImage.length).toBe(1);
  });
});
