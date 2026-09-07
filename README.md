# Battle Spirits Eternal Simulator — Rebuild 2.0

Reconstrução limpa do simulador Battle Spirits original, pensada para **Eternal**, modo local, online 1v1 e empacotamento em **Electron / instalador Windows (.exe)**.

> Projeto de fã não oficial. Os assets oficiais não são incluídos no pacote.

## O que você mantém do projeto antigo

Você pode copiar diretamente:

- `src/data/` → `src/data/`
- `public/cards-database/` → `public/cards-database/`
- `public/images/logo_battlespirits.png`
- `public/images/card-back.png`

Ou use o migrador:

```bat
node scripts/migrate-existing-project.mjs "C:\caminho\do\simulador-antigo"
```

## Requisitos

- Windows 10/11 x64
- Node.js 24.x recomendado para manter o mesmo ambiente que você já usava
- npm

## Primeira instalação

```bat
npm install
npm run verify
npm test
npm run dev
```

`npm run dev` abre o frontend Vite e o Electron em modo de desenvolvimento.

Para testar apenas no navegador:

```bat
npm run dev:web
```

## Online sem Tailscale

O `.exe` é apenas o cliente. Para duas pessoas em redes diferentes jogarem sem Tailscale, o servidor de `server/index.mjs` precisa estar hospedado em um endereço público.

1. No computador/servidor que hospedará o backend, mantenha a mesma versão de `src/data` e de `src/game`.
2. Instale as dependências com `npm install`.
3. Rode `npm run dev:server` (em produção, use um gerenciador de processo/restart do seu provedor).
4. Publique a porta definida em `PORT` (padrão 3001) atrás de HTTPS/WSS.
5. No simulador, informe o endereço público em **Online > Servidor público**.

Variáveis do backend em `server/.env.example`:

```env
PORT=3001
CORS_ORIGIN=*
```

Para produção, prefira trocar `*` pelo domínio real do cliente web, se você também publicar uma versão web.

O servidor é **autoritativo**: decks e ações são validados no backend e cada jogador recebe a mão/Burst do adversário sanitizada. O cliente também possui retomada automática de sessão enquanto a sala ainda existir no mesmo processo do servidor.

## Gerar instalador Windows

Depois de copiar as cartas/assets e validar:

```bat
npm install
npm run verify
npm test
npm run dist:win
```

O instalador será criado em:

```text
release/
```

A configuração atual gera instalador NSIS x64 e permite escolher a pasta de instalação.

## Arquitetura

```text
electron/                 Electron main + preload
server/                   servidor Socket.IO autoritativo
src/
  components/             UI reutilizável
  data/                   seus JSONs de cartas
  game/                   regras puras e testáveis
    battle.js             Attack / Block / Flash / Battle Resolution
    brave.js              Brave / Combine / Separate
    cores.js              Core, Soul Core, custo e Depletion
    cost.js               Reduction Symbols e pagamento
    effects.js            Magic, Burst e operações estruturadas
    reducer.js            porta única de ações do jogo
    state.js              setup, deck e estado da partida
    summon.js             summon / Nexus
    turn.js               fases Eternal
  online/                  cliente Socket.IO
  pages/                   telas
  services/                cards, storage e Supabase opcional
public/
  cards-database/          seu acervo existente
  images/                  logo e card back
```

A UI **não contém as regras**. Ela envia ações para `src/game/reducer.js`. Isso permite usar o mesmo motor no local e no servidor online e reduz divergências entre os dois modos.

## Dados de efeito automáticos

O motor não tenta “adivinhar” texto livre. Isso seria perigoso para um simulador de TCG. Quando uma carta possuir efeitos estruturados, eles podem usar `operations` no efeito; quando ainda não houver handler automático, o simulador mostra a carta e disponibiliza **Resolução manual** em vez de bloquear a partida.

Exemplo de operação estruturada:

```json
{
  "effects": [
    {
      "type": "flash",
      "timing": "flash",
      "operations": [
        { "type": "draw", "count": 2 }
      ]
    }
  ]
}
```

Handlers podem ser adicionados sem reescrever o `Simulator.jsx`.

## Supabase

Supabase continua opcional. O rebuild não exige conta para deck/profile local ou para o servidor Socket.IO.

Se quiser sincronização de conta futuramente:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Nunca coloque a Secret/Service Role Key no frontend ou dentro do `.exe`.

## Regras e escopo

Veja `docs/RULES-COVERAGE.md`. A base implementa regras sistêmicas e mantém fallback manual para efeitos/keywords de cartas que ainda não estejam codificados no database. Isso é intencional: uma engine pode obedecer às regras gerais, mas automatizar **cada carta Eternal** exige handlers/dados estruturados de cada efeito e suas Q&As.
