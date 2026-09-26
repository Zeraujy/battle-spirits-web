# Battle Spirits Eternal Simulator v3.9.0
## Eternal CPU Tactical Memory

A Eternal CPU passa a adaptar pequenas decisões ao comportamento que o jogador já revelou publicamente durante a própria partida.

### Memória pública
- Observa somente ações estruturadas já realizadas: ataques, bloqueios, recusa de bloqueio, Magic em Flash, passes de Flash, Burst setado/ativado, summons e Nexus.
- Nunca lê identidade da mão adversária, ordem do deck ou identidade de Burst virado para baixo.
- A memória é reconstruída a partir do Action Log público, então não cria uma segunda fonte de verdade para a partida.

### Adaptação tática
- Hard recebe a influência completa; Normal usa uma influência menor e Easy ignora a memória.
- Histórico de Magic em Flash pode fazer a CPU exigir mais valor antes de atacar quando o oponente ainda tem Reserve.
- Uso recorrente de Burst aumenta a cautela quando existe um Burst setado.
- Tendência de bloquear ou aceitar dano altera levemente a avaliação de pressão ofensiva.
- Contra um adversário muito agressivo, a CPU valoriza mais preparação defensiva e Burst.

### AI Debugger
- Novo painel Tactical Memory mostra agressividade, taxa de bloqueio, ameaça de Flash, hábito de Burst e quantidade de ações públicas observadas.
- Cada decisão pode exibir o score específico da memória e os motivos que influenciaram a escolha.

### Segurança
- Nenhuma regra de jogo ou legalidade de ação foi alterada.
- Toda ação escolhida continua vindo de `getLegalActions()` e passando pelo mesmo reducer da engine.
- Nenhuma dependência nova de Supabase, Social Hub ou Socket.IO.
