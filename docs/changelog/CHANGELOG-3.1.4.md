# Battle Spirits Eternal Simulator v3.1.4

## Arena UX

- A confirmação de Spirit, Ultimate, Brave e Nexus agora aparece ao lado da carta recém-colocada no campo.
- O painel mostra custo base, redução aplicada, custo final, progresso de pagamento e Cores mínimos de nível.
- O painel é preso à carta e reposicionado automaticamente para não sair da tela.
- Magic pode ser arrastada para qualquer ponto da Arena: o pagamento abre em um painel central, mantendo a Arena interativa para mover Cores.
- Reserve e Core Trash deixaram de pertencer visualmente às abas laterais e permanecem disponíveis mesmo com Carta/Turno recolhidos.

## Organização

- Os estilos desta revisão ficam isolados em `src/styles/arena/pendingPlayV314.css`.
- O código de posicionamento contextual e drag de Magic recebeu comentários para facilitar futuras alterações.
