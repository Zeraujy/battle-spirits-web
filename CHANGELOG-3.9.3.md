# Battle Spirits Eternal Simulator v3.9.3 — Player Experience Cleanup

## Objetivo
Separar com mais rigor a experiência do jogador das informações de desenvolvimento. A interface agora mostra apenas informações úteis para jogar, configurar a conta, usar o Social Hub e entrar em partidas.

## Player-facing cleanup
- Social Hub: removidas referências a Socket.IO, Supabase, migrations, arquivos e arquitetura interna.
- Privacidade: textos reescritos em linguagem direta para o jogador.
- Estatísticas/Ranked: removidas explicações de pipeline, server-side e instruções SQL.
- Conta: mensagens de disponibilidade não citam o provedor técnico usado pelo projeto.
- Online/Ranked: status de conexão usa linguagem de produto (`ONLINE`, `RANKED`) em vez de terminologia de servidor.
- Configurações: removidos endereço de manifesto, caminho local de dados e indicação `Web / Dev`.
- Updater: falhas de configuração não exibem caminhos ou nomes de arquivos internos.
- Contra IA: AI Debugger removido do fluxo normal do jogador.
- Patch Notes: histórico reescrito em linguagem de produto, focado em novidades percebidas por quem joga.
- Página Server Console removida do roteamento do frontend do jogo; administração do servidor fica fora da experiência do jogador.

## Guardrail
O verificador do projeto agora possui uma checagem de copy player-facing para impedir que termos internos conhecidos voltem a aparecer nas principais telas do jogo.
