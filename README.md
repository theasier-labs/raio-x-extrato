# Raio-X do Extrato e do Cartão

[![Testes](https://github.com/theasier-labs/raio-x-extrato/actions/workflows/testes.yml/badge.svg)](https://github.com/theasier-labs/raio-x-extrato/actions/workflows/testes.yml)

O código da ferramenta gratuita da Theasier que lê o seu extrato ou a fatura do cartão **no próprio navegador** e mostra assinaturas, parcelas em aberto, tarifas, juros e quando as parcelas deixam de pesar.

**A ferramenta no ar:** <https://www.theasier.com.br/ferramentas/raio-x-do-extrato>

Este repositório existe para que você não precise acreditar na frase "o seu arquivo não sai do navegador": dá para conferir.

## Como conferir, sem saber programar

1. Abra a página, **desligue a internet** (modo avião) e use o exemplo ou o seu arquivo. Funciona, porque todo o cálculo acontece no seu aparelho.
2. Com a página aberta, abra as ferramentas do navegador (F12) na aba **Rede** e use a ferramenta: não aparece nenhuma requisição enviando dados.
3. A página tem uma política de segurança (CSP) que proíbe o navegador de se conectar a outro endereço. Está em [`seguranca/raio-x-csp.header.txt`](seguranca/raio-x-csp.header.txt): `connect-src 'self'`, sem `unsafe-eval` e sem nenhum domínio de terceiro.

## Como conferir, lendo o código

| Onde | O que é |
|---|---|
| [`src/core/statement/`](src/core/statement) | Leitores de OFX e CSV. Recebem o texto e devolvem lançamentos; não têm acesso à rede. |
| [`src/raio-x/`](src/raio-x) | A análise: assinaturas, parcelas, tarifas, juros, a curva "quando eu respiro" e o texto do resumo. Cada número carrega a fórmula, as entradas e a fonte ("mostrar a conta"). |
| [`src/raio-x/market-rates.ts`](src/raio-x/market-rates.ts) | Taxas médias de juros do Banco Central, como tabela datada e embutida (sem consulta em tempo de uso). |
| [`pagina/`](pagina) | A tela: lê o arquivo escolhido (ou o texto colado) no navegador e chama o código acima. |
| [`seguranca/`](seguranca) | A política de segurança da página, o service worker que a deixa abrir sem internet e os testes da política. |

Procure por `fetch`, `XMLHttpRequest`, `sendBeacon` ou `WebSocket` em `src/` e `pagina/`: não há nenhum. Isso também é conferido automaticamente em [`scripts/raio-x-sem-rede.test.mjs`](scripts/raio-x-sem-rede.test.mjs): o teste falha se qualquer arquivo da leitura ou da tela usar uma API de rede. (O service worker em `seguranca/` usa `fetch` só para o próprio site, para abrir sem internet; ele nunca vê o seu arquivo.)

## Rodar os testes

```bash
npm install
npm test                 # leitores, análise, relatório (66 testes)
npm run test:seguranca   # política de segurança e "nenhuma API de rede"
```

Fica de fora da execução acima o teste da imagem para compartilhar, que precisa de um navegador de verdade (canvas); ele roda no repositório do site.

## O que este repositório não é

- **Não é um produto isolado.** A pasta `pagina/` foi escrita para o site da Theasier e depende do design system dele; serve para auditar o que a tela faz com o seu arquivo, não para rodar sozinha.
- **Não contém código do NexFlow.** Esta ferramenta foi escrita do zero, à parte do NexFlow.
- **Não é aconselhamento financeiro.** O resultado é educativo: confira com o seu extrato.
- **Pode errar na leitura.** Cada banco monta o arquivo de um jeito; as linhas que não conseguimos ler aparecem listadas no resultado.

## Atualizar as taxas do Banco Central

Os valores estão em `src/raio-x/market-rates.ts`, com o mês de referência, a data de conferência e o código da série no SGS do BCB. Para atualizar, consulte `https://api.bcb.gov.br/dados/serie/bcdata.sgs.<série>/dados/ultimos/1?formato=json` e troque o valor e as datas.

## De onde vem este código

A fonte da verdade fica no repositório do site. Este repositório é um **espelho gerado por script** (`scripts/export-raio-x.mjs` no repositório do site): não edite aqui, porque a próxima exportação sobrescreve. Para sugerir uma correção, abra uma issue.

## Licença

[MIT](LICENSE). Os dados de exemplo são inventados.
