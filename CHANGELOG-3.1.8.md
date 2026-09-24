# Battle Spirits Eternal Simulator v3.1.8 — Core & Combat UX

A v3.1.8 mantém a Rules Engine da linha v3.1.x e foca exclusivamente em clareza e fluidez do pagamento de Cores e do fluxo de batalha.

## Pagamento de Cores
- Novo resumo visual: **Custo base − Redução = Custo final**.
- Barra de progresso para o custo já pago no Core Trash.
- Barra separada para os **Cores mínimos** necessários para manter o LV mínimo de uma carta invocada.
- Reserve e Core Trash recebem instruções contextuais apenas enquanto existe pagamento pendente.
- Os acentos de cor acompanham a cor principal da carta de forma sutil.

## Combate
- Nova ligação visual entre atacante e bloqueador; em ataque direto, a ligação aponta para o Life do defensor.
- Bloqueadores legais continuam vindo exclusivamente de `legalBlockers()` da Rules Engine.
- Block Step recebe orientação textual mais clara.
- Flash Timing mostra prioridade e ação possível com menos aparência de painel administrativo.
- Botões de batalha foram refinados sem alterar ações ou regras.

## Organização
- `src/components/game/PaymentStatus.jsx`: apresentação do pagamento.
- `src/components/game/BattleLinkOverlay.jsx`: ligação visual de combate.
- `src/styles/arena/coreCombatV318.css`: estilos isolados da v3.1.8.

## Regras
Nenhuma regra de Battle Spirits foi movida para a UI. A interface apenas lê valores já calculados pela Engine.
