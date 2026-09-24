# Battle Spirits Eternal Simulator v3.2.2 — CPU Combat Intelligence

## Eternal CPU
- A avaliação de ataque agora considera o Attack Step inteiro: atacantes prontos, bloqueadores disponíveis e pressão acumulada de símbolos.
- A CPU evita ataques não letais que entregariam um Spirit/Ultimate gratuitamente para um bloqueador muito mais forte.
- A CPU estima o risco de ficar sem bloqueadores para o turno seguinte e pode encerrar o Attack Step quando atacar deixaria Life exposta a dano letal provável.
- Ataques imediatamente letais continuam com prioridade máxima, mesmo quando a posição defensiva do próximo turno seria ruim.
- A avaliação de bloqueio passou a considerar valor do corpo, BP, Life preservada e ameaças que ainda podem atacar no mesmo turno.
- Quando mais de um bloqueador vence o combate, a CPU tende a usar o menor suficiente e preservar o corpo maior.
- Receber dano sem bloquear agora também considera o risco dos ataques seguintes e o fato de Cores de Life irem para a Reserve.

## Arquitetura
- Toda decisão continua limitada às ações retornadas por `getLegalActions()` e executada pelo mesmo `applyGameAction()` usado nos demais modos.
- A nova inteligência de combate não lê a identidade das cartas ocultas do adversário.
- A preparação para futuras camadas de Core Management, Flash/Burst e Lookahead permanece compatível com a v3.2.1.

## Testes
- Adicionados 4 cenários automatizados específicos de Combat Intelligence.
- Suite total ampliada de **82 para 86 testes**.
- Casos novos: preservar o último bloqueador, rejeitar ataque suicida, escolher bloqueador eficiente e não perder lethal por excesso de cautela.
