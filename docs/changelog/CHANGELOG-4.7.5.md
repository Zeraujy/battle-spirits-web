# Battle Spirits: KAIHOU! Simulator v4.7.5

## Desktop Node Runtime Hotfix

- Corrige a inicialização do executável Windows que falhava com `path.basename is not a function`.
- O bundle Electron de `main` e `preload` agora é compilado como runtime Node/SSR.
- Módulos nativos `node:*` permanecem externos e são resolvidos pelo Node embutido no Electron, em vez de receberem stubs de compatibilidade do navegador.
- Mantém minificação, ASAR, hardening de produção e bloqueio de DevTools.
