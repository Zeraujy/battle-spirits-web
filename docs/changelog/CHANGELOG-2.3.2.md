# Battle Spirits Simulator 2.3.2

Hotfix de conta/autenticação.

- Corrige o fluxo de sessão da página Conta para React 19.
- O `useEffect` de autenticação não retorna mais uma Promise.
- Adiciona atualização da interface via `onAuthStateChange` do Supabase.
- Adiciona estado visual de carregamento durante login/logout/sincronização.
- Erros de rede/Supabase passam a ser capturados e exibidos ao jogador.
- Desativa detecção de sessão pela URL (`detectSessionInUrl`) no Electron, já que o login atual é por e-mail/senha.
- Adiciona Error Boundary global: um erro de interface não deixa mais o jogo em tela vazia; aparece uma tela de recuperação com botão para recarregar.
- Mantém todas as mudanças do 2.3.1, inclusive Logo | Steps | Chat/Log/Sair no cabeçalho da arena.
