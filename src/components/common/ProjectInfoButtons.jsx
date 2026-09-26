import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n.jsx";
import "../../styles/theme/v230.css";

const PATCHES = [
  {
    version: "3.9.8",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Deckbuilder & Database 2.0", en: "Deckbuilder & Database 2.0" },
    summary: {
      pt: "Montar e pesquisar decks ficou mais rápido, claro e preparado para um catálogo muito maior.",
      en: "Deck building and card browsing are now faster, clearer and ready for a much larger catalog."
    },
    sections: [
      {
        title: { pt: "Catálogo mais completo", en: "Smarter catalog" },
        items: {
          pt: [
            "A busca agora encontra nome, código, família e texto de efeito com mais facilidade.",
            "Novos filtros incluem set, raridade, família, custo, redução, símbolo e legalidade.",
            "Ordene cartas por código, nome, custo ou raridade e navegue em páginas de 21 cartas.",
            "O detalhe de uma carta agora sugere outras cartas relacionadas."
          ],
          en: [
            "Search now finds names, codes, families and effect text more easily.",
            "New filters cover set, rarity, family, cost, reduction, symbol and legality.",
            "Sort cards by code, name, cost or rarity and browse 21 cards per page.",
            "Card details now suggest related cards."
          ]
        }
      },
      {
        title: { pt: "Leitura do deck", en: "Deck overview" },
        items: {
          pt: [
            "A lateral do Deck Builder ganhou curva de custo e distribuição por cores e tipos.",
            "Nome, código, raridade e custo ficam visíveis no catálogo sem precisar abrir cada carta.",
            "Filtros avançados podem ser recolhidos para manter a tela limpa durante a montagem."
          ],
          en: [
            "The Deck Builder sidebar now includes a cost curve plus color and type distribution.",
            "Name, code, rarity and cost are visible in the catalog without opening each card.",
            "Advanced filters can be collapsed to keep the screen clean while building."
          ]
        }
      }
    ]
  },
  {
    version: "3.9.5",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Tutorial & New Player Onboarding", en: "Tutorial & New Player Onboarding" },
    summary: {
      pt: "Um novo tutorial rápido ensina o essencial de Battle Spirits Eternal para quem está começando.",
      en: "A new quick tutorial teaches the essentials of Battle Spirits Eternal to new players."
    },
    sections: [
      {
        title: { pt: "Aprenda jogando", en: "Learn by playing" },
        items: {
          pt: [
            "Novo caminho Aprenda a Jogar direto no menu principal.",
            "Lições curtas explicam Life, Cores, sequência do turno, Main Step, ataque, bloqueio, Flash, Burst e Brave.",
            "Um treino guiado mostra a ordem real de uma batalha com Flash Timing e escolha de bloqueio.",
            "A consulta rápida fica disponível para revisar as regras quando quiser."
          ],
          en: [
            "New Learn to Play path directly from the main menu.",
            "Short lessons cover Life, Cores, turn sequence, Main Step, attack, block, Flash, Burst and Brave.",
            "A guided practice shows the real battle order with Flash Timing and blocking choice.",
            "Quick reference stays available whenever you need a refresher."
          ]
        }
      },
      {
        title: { pt: "Boas-vindas", en: "New player welcome" },
        items: {
          pt: [
            "Novos jogadores recebem um convite discreto para começar pelo tutorial.",
            "O progresso fica salvo para que você possa continuar de onde parou.",
            "Ao concluir, você pode ir direto para a Eternal CPU ou abrir o Deck Builder."
          ],
          en: [
            "New players receive a lightweight invitation to start with the tutorial.",
            "Progress is saved so you can continue where you left off.",
            "When finished, you can jump straight into Eternal CPU or open Deck Builder."
          ]
        }
      }
    ]
  },
  {
    version: "3.9.4",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Deck Validation & Format Rules", en: "Deck Validation & Format Rules" },
    summary: {
      pt: "O Deck Builder e os modos Online agora validam os decks com regras mais fiéis ao formato Eternal japonês.",
      en: "Deck Builder and Online modes now validate decks with rules closer to the Japanese Eternal format."
    },
    sections: [
      {
        title: { pt: "Regras Eternal", en: "Eternal rules" },
        items: {
          pt: [
            "Decks Eternal precisam ter pelo menos 40 cartas e respeitar o limite de até 3 cartas com o mesmo nome, salvo exceções da própria carta.",
            "Cartas de Contrato seguem a regra de apenas 1 tipo por deck, com até 3 cópias.",
            "Cartas proibidas no formato Eternal são identificadas antes da partida."
          ],
          en: [
            "Eternal decks require at least 40 cards and normally allow up to 3 cards with the same name, except where a card itself changes that limit.",
            "Contract Cards follow the one-type-per-deck rule, with up to 3 copies.",
            "Cards banned from the Eternal format are identified before a match."
          ]
        }
      },
      {
        title: { pt: "Regulamento oficial", en: "Official regulation" },
        items: {
          pt: [
            "O Deck Builder mostra se o deck também está apto ao regulamento oficial atual.",
            "Ranked usa o regulamento oficial Eternal vigente.",
            "Salas personalizadas podem usar Eternal, Eternal Oficial ou LAB."
          ],
          en: [
            "Deck Builder shows whether a deck is also valid under the current official regulation.",
            "Ranked uses the current official Eternal regulation.",
            "Custom rooms can use Eternal, Official Eternal or LAB."
          ]
        }
      }
    ]
  },
  {
    version: "3.9.3",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Player Experience Cleanup", en: "Player Experience Cleanup" },
    summary: {
      pt: "Uma grande revisão de textos e telas deixa o simulador mais direto, limpo e focado em quem está jogando.",
      en: "A major review of text and screens makes the simulator cleaner, more direct and focused on players."
    },
    sections: [
      {
        title: { pt: "Interface mais limpa", en: "Cleaner interface" },
        items: {
          pt: [
            "Menus e mensagens foram simplificados para deixar a experiência mais clara durante o jogo.",
            "Perfil, privacidade, Online, Ranked, configurações e atualizações agora usam mensagens mais curtas e naturais.",
            "Avisos de indisponibilidade agora explicam apenas o que o jogador precisa saber e fazer."
          ],
          en: [
            "Menus and messages were simplified to keep the experience clearer during play.",
            "Profile, privacy, Online, Ranked, settings and updates now use shorter, more natural messages.",
            "Availability notices now explain only what the player needs to know and do."
          ]
        }
      },
      {
        title: { pt: "Patch Notes renovado", en: "Refreshed Patch Notes" },
        items: {
          pt: [
            "O histórico de atualizações foi reescrito para destacar novidades visíveis e mudanças de experiência.",
            "As informações exibidas agora priorizam novidades, regras e mudanças que afetam diretamente a experiência."
          ],
          en: [
            "Update history was rewritten to highlight visible features and experience changes.",
            "Displayed information now prioritizes features, rules and changes that directly affect the experience."
          ]
        }
      }
    ]
  },
  {
    version: "3.9.2",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Custom Match Settings", en: "Custom Match Settings" },
    summary: { pt: "Salas Online ganharam novas opções para personalizar partidas casuais e sessões de teste.", en: "Online rooms gained new options for custom casual matches and testing sessions." },
    sections: [
      { title: { pt: "Novas opções", en: "New options" }, items: { pt: ["Escolha quem começa a partida.", "Ative um limite de tempo por turno.", "Mulligan pode ser ligado ou desligado por sala.", "O preset LAB facilita testes rápidos de decks."], en: ["Choose who starts the match.", "Enable a turn time limit.", "Mulligan can be enabled or disabled per room.", "The LAB preset makes quick deck testing easier."] } }
    ]
  },
  {
    version: "3.9.1",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Online Lobby 2.0", en: "Online Lobby 2.0" },
    summary: { pt: "O Online ganhou um lobby mais completo, com salas públicas, privadas e presença de jogadores.", en: "Online play received a fuller lobby with public rooms, private rooms and player presence." },
    sections: [
      { title: { pt: "Lobby", en: "Lobby" }, items: { pt: ["Veja salas públicas disponíveis antes de entrar.", "Crie salas privadas por código ou proteja uma sala com senha.", "Acompanhe jogadores disponíveis, buscando partida ou já em duelo.", "Troque seu deck diretamente no lobby."], en: ["Browse public rooms before joining.", "Create private rooms by code or protect a room with a password.", "See players who are available, searching or already in a match.", "Change your deck directly from the lobby."] } }
    ]
  },
  {
    version: "3.9.0",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Eternal CPU Tactical Memory", en: "Eternal CPU Tactical Memory" },
    summary: { pt: "A Eternal CPU passou a adaptar suas decisões ao que você demonstra durante a própria partida.", en: "Eternal CPU now adapts its decisions to what you reveal during the match." },
    sections: [
      { title: { pt: "CPU mais atenta", en: "Smarter CPU" }, items: { pt: ["A CPU reconhece padrões de ataque, bloqueio, Flash e Burst que já apareceram no duelo.", "A dificuldade Hard aproveita mais essa adaptação; Normal usa uma versão mais leve.", "Informações escondidas continuam fora das decisões da CPU."], en: ["The CPU recognizes attack, block, Flash and Burst patterns already shown in the duel.", "Hard makes greater use of this adaptation; Normal uses a lighter version.", "Hidden information remains outside CPU decisions."] } }
    ]
  },
  {
    version: "3.8.1",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Battle Experience Update", en: "Battle Experience Update" },
    summary: { pt: "A Arena recebeu novos feedbacks visuais para tornar cada ação mais clara e agradável de acompanhar.", en: "The Arena received new visual feedback to make every action clearer and easier to follow." },
    sections: [
      { title: { pt: "Durante o duelo", en: "During the duel" }, items: { pt: ["Transições entre Steps ficaram mais claras.", "Flash Timing e prioridade receberam destaque próprio.", "Ataques, bloqueios, seleção de cartas e movimentação de Cores ganharam feedback visual.", "O Log ficou mais fácil de ler durante partidas longas."], en: ["Step transitions are clearer.", "Flash Timing and priority received dedicated highlights.", "Attacks, blocks, card selection and Core movement gained visual feedback.", "The Log is easier to read during long matches."] } }
    ]
  },
  {
    version: "3.8.0",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Post-Match Screen", en: "Post-Match Screen" },
    summary: { pt: "Vitória e derrota agora levam a uma tela pós-partida completa, com progresso e ações rápidas.", en: "Victory and defeat now lead to a full post-match screen with progress and quick actions." },
    sections: [
      { title: { pt: "Fim de partida", en: "Match end" }, items: { pt: ["Veja duração, turnos, deck usado, Life restante e progresso de Maestria.", "Partidas Ranked mostram a mudança de RP.", "No Online Normal, os jogadores podem solicitar revanche.", "Também é possível abrir o perfil ou adicionar o adversário."], en: ["See duration, turns, used deck, remaining Life and Mastery progress.", "Ranked matches show RP changes.", "Normal Online allows players to request a rematch.", "You can also open the opponent profile or send a friend request."] } }
    ]
  },
  {
    version: "3.7.1",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Ranked Profile", en: "Ranked Profile" },
    summary: { pt: "O perfil passou a destacar sua identidade competitiva na Season 0.", en: "Profiles now highlight your competitive identity in Season 0." },
    sections: [
      { title: { pt: "Competitivo", en: "Competitive" }, items: { pt: ["Rank, RP, melhor marca da temporada e histórico Ranked aparecem no perfil.", "Molduras e badges refletem seu Rank atual.", "Estatísticas casuais e competitivas ficam separadas para facilitar a leitura."], en: ["Rank, RP, season peak and Ranked history now appear on profiles.", "Frames and badges reflect your current Rank.", "Casual and competitive statistics are separated for easier reading."] } }
    ]
  },
  {
    version: "3.7.0",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Ranked Season 0", en: "Ranked Season 0" },
    summary: { pt: "A pré-temporada competitiva chegou com RP, divisões e matchmaking Ranked.", en: "Competitive preseason arrived with RP, divisions and Ranked matchmaking." },
    sections: [
      { title: { pt: "Season 0", en: "Season 0" }, items: { pt: ["Progressão de Bronze até Master.", "Matchmaking busca adversários com RP próximo e amplia a busca com o tempo.", "Desconexões possuem uma janela de reconexão antes de contar como abandono.", "O histórico Ranked acompanha seus resultados competitivos."], en: ["Progress from Bronze to Master.", "Matchmaking searches for nearby RP and expands over time.", "Disconnects have a reconnect window before counting as a forfeit.", "Ranked history tracks your competitive results."] } }
    ]
  },
  {
    version: "3.6.3",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Card Mastery 2.0", en: "Card Mastery 2.0" },
    summary: { pt: "A Maestria passou a evoluir de acordo com as cartas usadas em partidas concluídas.", en: "Mastery now progresses according to cards used in completed matches." },
    sections: [
      { title: { pt: "Progressão", en: "Progression" }, items: { pt: ["Ganhe XP usando cartas em partidas.", "Vitórias e carta de capa concedem bônus adicionais.", "Cada carta possui níveis de Maestria I–VII, partidas, vitórias e taxa de vitória."], en: ["Earn XP by using cards in matches.", "Wins and cover cards grant additional bonuses.", "Each card has Mastery levels I–VII, matches, wins and win rate."] } }
    ]
  },
  {
    version: "3.6.2",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Match History & Statistics", en: "Match History & Statistics" },
    summary: { pt: "O Perfil ganhou histórico recente e estatísticas para acompanhar sua evolução.", en: "Profiles gained recent match history and statistics to track your progress." },
    sections: [
      { title: { pt: "Estatísticas", en: "Statistics" }, items: { pt: ["Acompanhe partidas, vitórias, derrotas e taxa de vitória.", "Veja decks e cores mais utilizados.", "Consulte seus resultados recentes diretamente pelo Perfil."], en: ["Track matches, wins, losses and win rate.", "See your most-used decks and colors.", "Check recent results directly from your Profile."] } }
    ]
  },
  {
    version: "3.6.1",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Social Hub Polish", en: "Social Hub Polish" },
    summary: { pt: "Amigos, mensagens e presença receberam melhorias de uso e organização.", en: "Friends, messages and presence received usability and organization improvements." },
    sections: [
      { title: { pt: "Social", en: "Social" }, items: { pt: ["Favoritos e amigos Online aparecem primeiro.", "Busca de amigos ficou mais rápida.", "Status personalizado, indicador de digitação, mensagens lidas e silenciamento de conversas foram adicionados."], en: ["Favorites and Online friends appear first.", "Friend search is faster.", "Custom status, typing indicators, read receipts and conversation muting were added."] } }
    ]
  },
  {
    version: "3.6.0",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Social Hub & Player Identity", en: "Social Hub & Player Identity" },
    summary: { pt: "O Perfil foi transformado em um espaço social completo para jogadores.", en: "Profile was transformed into a full social space for players." },
    sections: [
      { title: { pt: "Perfil e amigos", en: "Profile and friends" }, items: { pt: ["Novo perfil com avatar, banner, bio e opções de privacidade.", "Pedidos de amizade, lista de amigos, mensagens privadas e notificações.", "Controles para bloquear jogadores e escolher quem pode encontrar ou contatar você."], en: ["New profile with avatar, banner, bio and privacy options.", "Friend requests, friends list, private messages and notifications.", "Controls to block players and choose who can find or contact you."] } }
    ]
  }
];

export default function ProjectInfoButtons() {
  const { language } = useLanguage();
  const pt = language !== "en";
  const locale = pt ? "pt" : "en";
  const [modal, setModal] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(PATCHES[0].version);
  const selectedPatch = useMemo(() => PATCHES.find((patch) => patch.version === selectedVersion) || PATCHES[0], [selectedVersion]);

  useEffect(() => {
    if (!modal) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  function closeOnBackdrop(event) {
    if (event.target === event.currentTarget) setModal(null);
  }

  return (
    <>
      <div className="project-info-buttons">
        <button type="button" className="project-menu-card project-menu-about" onClick={() => setModal("about")}>
          <span className="project-menu-icon">i</span>
          <span className="project-menu-copy"><b>{pt ? "Sobre o projeto" : "About the project"}</b><small>{pt ? "Conheça mais" : "Learn more"}</small></span>
          <i className="project-menu-arrow">›</i>
        </button>
        <button type="button" className="project-menu-card project-menu-patch" onClick={() => { setSelectedVersion(PATCHES[0].version); setModal("patch"); }}>
          <span className="project-menu-icon">▤</span>
          <span className="project-menu-copy"><b>Patch Notes</b><small>{pt ? "Novidades do jogo" : "What's new"}</small></span>
          <i className="project-menu-arrow">›</i>
        </button>
      </div>

      {modal && (
        <div className="project-modal-backdrop" role="presentation" onMouseDown={closeOnBackdrop}>
          <section className="project-modal" role="dialog" aria-modal="true" aria-label={modal === "patch" ? "Patch Notes" : (pt ? "Sobre o projeto" : "About the project")}>
            <header>
              <div><span className="eyebrow">BATTLE SPIRITS</span><h2>{modal === "patch" ? "Patch Notes" : (pt ? "Sobre o projeto" : "About the project")}</h2></div>
              <button type="button" className="ghost" onClick={() => setModal(null)}>{pt ? "Fechar" : "Close"}</button>
            </header>

            {modal === "about" ? (
              <div className="about-content">
                <div className="project-version-badge">Battle Spirits Eternal Simulator v{PATCHES[0].version}</div>
                <p>{pt ? "Battle Spirits Eternal Simulator é um projeto de fã não oficial criado para jogar, testar decks e explorar diferentes gerações do Battle Spirits original." : "Battle Spirits Eternal Simulator is an unofficial fan project created to play, test decks and explore different generations of the original Battle Spirits game."}</p>
                <h3>{pt ? "O que você encontra aqui" : "What you'll find here"}</h3>
                <p>{pt ? "Partidas locais e Online, Eternal CPU, Deck Builder, coleção de cartas, perfis sociais, Maestria e modos competitivos em uma única experiência." : "Local and Online matches, Eternal CPU, Deck Builder, card collection, social profiles, Mastery and competitive modes in one experience."}</p>
                <h3>{pt ? "Em evolução" : "Always evolving"}</h3>
                <p>{pt ? "Novas cartas, recursos e melhorias de experiência chegam ao simulador por meio das atualizações." : "New cards, features and experience improvements are added over time."}</p>
                <strong className="about-thanks">{pt ? "Obrigado por jogar e acompanhar o projeto." : "Thank you for playing and following the project."}</strong>
                <small className="about-disclaimer">Battle Spirits é propriedade da BANDAI. {pt ? "Este é um projeto de fã não oficial e sem afiliação com a BANDAI." : "This is an unofficial fan project and is not affiliated with BANDAI."}</small>
              </div>
            ) : (
              <div className="patch-notes-layout">
                <aside className="patch-version-list">
                  {PATCHES.map((patch) => (
                    <button type="button" key={patch.version} className={selectedPatch.version === patch.version ? "active" : ""} onClick={() => setSelectedVersion(patch.version)}>
                      <b>v{patch.version}</b><span>{patch.title[locale]}</span>
                    </button>
                  ))}
                </aside>
                <article className="patch-content">
                  <span className="eyebrow">{selectedPatch.version === PATCHES[0].version ? (pt ? "ATUALIZAÇÃO ATUAL" : "CURRENT UPDATE") : (pt ? "HISTÓRICO" : "HISTORY")}</span>
                  <h2>v{selectedPatch.version}</h2>
                  <h3>{selectedPatch.title[locale]}</h3>
                  <small>{selectedPatch.date[locale]}</small>
                  <p>{selectedPatch.summary[locale]}</p>
                  {selectedPatch.sections.map((section) => (
                    <section className="patch-section" key={section.title[locale]}>
                      <h3>{section.title[locale]}</h3>
                      <ul>{section.items[locale].map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ))}
                </article>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
