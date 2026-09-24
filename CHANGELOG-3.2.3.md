# Battle Spirits Eternal Simulator v3.2.3 — CPU Core & Resource Management

## Eternal CPU
- A CPU agora avalia a flexibilidade de Cores disponíveis antes de comprometer recursos em uma jogada.
- Símbolos no campo passam a ser valorizados quando reduzem cartas que continuam na mão da CPU.
- Invocações podem escolher variantes legais de quantidade de Cores e entrar diretamente em Level superior.
- A CPU pode usar `MOVE_CORE` no Main Step para avançar uma carta ao próximo Level.
- Level Up considera ganho de BP, efeitos vinculados ao Level e custo de oportunidade da Reserve.
- Cores parcialmente investidos em direção ao próximo Level recebem valor pequeno para permitir planos de múltiplos movimentos sem confundir progresso com BP real.
- O Soul Core recebe valor adicional de flexibilidade e tende a ser preservado quando não é necessário.
- A CPU evita comprometer toda a Reserve quando uma linha mais barata mantém jogadas relevantes disponíveis.

## Rules Engine / Legal Actions
- `getLegalActions()` agora expõe variantes de `SUMMON` para requisitos impressos de Level acima do mínimo.
- `getLegalActions()` expõe movimentos regulares de Core da Reserve para cartas que ainda possuem um próximo Level impresso.
- Não são enumerados movimentos automáticos de volta para a Reserve, reduzindo risco de loops; pagamentos continuam podendo reutilizar Cores seguros pelas regras existentes.
- Toda variante é validada por `applyGameAction()` antes de ser oferecida à CPU.

## Informação oculta
- A avaliação de recursos usa apenas a mão da própria CPU.
- A identidade da mão e do deck oculto do adversário continua fora da avaliação estratégica.

## Testes
- Suite ampliada de **86 para 90 testes**.
- Novos cenários: summon em Level superior, Level Up com Reserve saudável, preservação de recursos e planejamento por redução de custo.
- Simulação SD23 vs SD28: 110 ações, 6 turnos, 9 movimentos de Core, 3 summons em Level superior e 0 ações ilegais.
