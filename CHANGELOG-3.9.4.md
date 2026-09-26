# Battle Spirits Eternal Simulator v3.9.4 — Deck Validation & Format Rules

## Objetivo
Centralizar a validação de decks e aproximá-la das regras oficiais japonesas do formato Eternal, mantendo LAB como ambiente explicitamente experimental.

## Regras Eternal aplicadas
- Deck com 40 cartas ou mais, sem limite superior geral.
- Até 3 cartas com o mesmo nome, respeitando identificadores de mesmo nome e exceções impressas/modeladas pela carta.
- Apenas 1 tipo de Carta de Contrato no deck, com até 3 cópias.
- Tokens não pertencem ao deck principal.
- Cartas classificadas como proibidas não são válidas no formato Eternal.

Referência de regras: Official Rule Manual [Eternal] Ver.17.1.

## Regulamento oficial
A regulação `official` aplica também a lista japonesa vigente de cartas limitadas, com data de referência 2026-09-01:
- Proibida: 0 cópias.
- Limitada <1>: 1 cópia.
- Limitada <2>: 2 cópias (nenhuma designada na lista atual).
- Limitada <20>: 20 cópias.
- Pares proibidos: suportados pelo validador (nenhum designado na lista atual).

O Ranked valida essa regulação tanto no cliente quanto novamente no servidor.

## Deck Builder
- Mostra validade no formato Eternal.
- Mostra separadamente aptidão ao regulamento oficial atual.
- Identifica cartas proibidas/limitadas presentes no catálogo.
- Exportação de deck atualizada para v3.9.4.

## Custom Match
- `eternal`: regras Eternal.
- `official`: regras Eternal + regulamentação oficial vigente.
- `lab`: validação relaxada para testes.
- O antigo identificador interno `standard` é convertido para `eternal` para preservar salas/configurações antigas; isto não adiciona o formato Standard ao simulador.

## Release Quality Gate
Antes do pacote final:
- testes e verificadores estruturais;
- auditoria de integridade;
- limpeza de arquivos temporários/builds/dependências;
- auditoria de textos player-facing para evitar detalhes internos de desenvolvimento;
- inspeção do ZIP final.

## Fontes oficiais consultadas
- https://www.battlespirits.com/rule/official-rule-manual-eternal/page03.html
- https://www.battlespirits.com/rule/official-rule-manual-eternal/page12.html
- https://www.battlespirits.com/rule/limited.php
