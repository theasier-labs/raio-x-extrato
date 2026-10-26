/**
 * Descrição "limpa" para agrupar lançamentos parecidos: maiúsculas, sem acento, sem datas,
 * sem marcas de parcela e sem números ("MERCADO LOJA 12" e "MERCADO LOJA 7" viram o mesmo grupo).
 */
export function normalizeDescription(description: string): string {
  return description
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ')
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
