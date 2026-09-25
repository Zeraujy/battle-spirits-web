import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useLanguage
} from "../../i18n.jsx";

import "../../styles/theme/v230.css";


const PATCHES = [
  {
    version: "3.5.2d",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Alinhamento de VS e Banners", en: "VS & Banner Alignment Fix" },
    summary: {
      pt: "Normaliza o tamanho dos dois banners e alinha o VS pelo centro real das molduras, independentemente de um lado possuir ou não o botão Trocar deck.",
      en: "Normalizes both banner sizes and aligns the VS to the true center of the frames, regardless of whether one side has the Change Deck button."
    },
    sections: [
      {
        title: { pt: "Geometria compartilhada", en: "Shared geometry" },
        items: {
          pt: [
            "Jogador e adversário passam a reservar exatamente a mesma altura de cabeçalho, banner e área inferior.",
            "O espaço do botão Trocar deck é reservado mesmo quando o oponente/CPU não possui essa ação, evitando deslocamento vertical.",
            "O VS agora ocupa a mesma linha estrutural dos banners e é centralizado pela moldura, não pelo bloco inteiro do jogador."
          ],
          en: [
            "Player and opponent now reserve the exact same header, banner and lower-action heights.",
            "The Change Deck action slot is reserved even when the opponent/CPU does not have that action, preventing vertical drift.",
            "VS now occupies the same structural row as the banners and is centered on the frame instead of the whole player block."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.2c",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Correção das Imagens dos Banners", en: "Banner Image Wiring Fix" },
    summary: {
      pt: "Corrige os banners que estavam caindo para as iniciais em vez de mostrar a carta de capa e a foto de perfil, tornando o patch cumulativo para todos os modos de jogo.",
      en: "Fixes banners falling back to initials instead of showing deck cover art and profile pictures, while making the patch cumulative across all match setup modes."
    },
    sections: [
      {
        title: { pt: "Imagens restauradas", en: "Images restored" },
        items: {
          pt: [
            "Jogo Livre, Eternal CPU, Online Normal e Ranked passam novamente a enviar separadamente a carta de capa do deck e o avatar do jogador para o banner.",
            "A resolução da carta de capa agora aceita IDs de capa e formatos legados com mais tolerância, usando a primeira carta válida como fallback.",
            "O patch passa a incluir explicitamente as quatro telas de preparação para não depender da ordem em que as revisões 3.5.2 foram aplicadas."
          ],
          en: [
            "Free Play, Eternal CPU, Online Normal and Ranked once again send deck cover art and player avatar separately to the banner.",
            "Deck-cover resolution now accepts cover IDs and legacy formats more robustly, falling back to the first valid card.",
            "The patch now explicitly includes all four match setup screens so it no longer depends on the order in which the 3.5.2 revisions were applied."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.2b",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Limpeza Visual do Banner de Perfil", en: "Profile Banner Visual Cleanup" },
    summary: {
      pt: "Refina o novo banner VS para ficar mais limpo: a capa do deck vira a arte principal, o avatar ocupa o quadro lateral e os textos auxiliares foram removidos.",
      en: "Refines the new VS banner into a cleaner presentation: the deck cover becomes the main art, the avatar occupies the side frame and auxiliary texts were removed."
    },
    sections: [
      {
        title: { pt: "Layout do banner", en: "Banner layout" },
        items: {
          pt: [
            "A imagem principal do banner agora usa de forma fixa a carta de capa do deck selecionado pelo jogador.",
            "O quadro menor passa a priorizar a foto de perfil do jogador; quando não existir avatar, o fallback por iniciais continua disponível.",
            "O nome do deck, contagem de cartas e demais textos auxiliares ao lado do avatar foram removidos para deixar o banner mais limpo."
          ],
          en: [
            "The main banner art now consistently uses the selected deck's cover card.",
            "The smaller framed area now prioritizes the player's profile picture; when no avatar exists, the initials fallback remains available.",
            "Deck name, card count and other auxiliary texts next to the avatar were removed for a cleaner banner presentation."
          ]
        }
      },
      {
        title: { pt: "Informação revelada", en: "Revealed information" },
        items: {
          pt: [
            "O aviso \"Clique na capa para ver detalhes\" foi removido do topo da arte.",
            "Os avisos curtos no canto superior direito, como status de erro, online ou pré-temporada, deixam de aparecer sobre o banner.",
            "O clique continua disponível apenas para revelar Rank/Status quando existir algo relevante para mostrar, mantendo o visual principal mais limpo."
          ],
          en: [
            "The \"Click the cover to view details\" hint was removed from the top of the art.",
            "Short notices in the top-right corner such as error, online or preseason states no longer appear over the banner.",
            "Clicking remains available only to reveal Rank/Status when there is something relevant to show, keeping the main visual cleaner."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.2a",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Polimento dos Banners Ranqueados", en: "Ranked Banner Visual Polish" },
    summary: {
      pt: "Segunda passada visual nos banners VS: molduras por tier, crest de Rank, avatar mais integrado e animação de reveal mais cinematográfica.",
      en: "Second visual pass on VS banners: tier-based frames, Rank crest, better avatar integration and a more cinematic reveal animation."
    },
    sections: [
      {
        title: { pt: "Molduras por Rank", en: "Rank frames" },
        items: {
          pt: [
            "Ranked Bronze passa a usar uma moldura Bronze real; a estrutura também já suporta Silver, Gold, Platinum, Diamond e Master.",
            "Modos sem Rank continuam usando a versão Eternal monocromática para preservar a identidade visual principal do simulador.",
            "Avatar e moldura agora compartilham o mesmo acabamento do tier, deixando o perfil mais integrado ao banner."
          ],
          en: [
            "Ranked Bronze now uses an actual Bronze frame; the same system is ready for Silver, Gold, Platinum, Diamond and Master.",
            "Unranked modes keep the monochrome Eternal frame to preserve the simulator's main visual identity.",
            "Avatar and frame now share the same tier finish, integrating the profile more naturally into the banner."
          ]
        }
      },
      {
        title: { pt: "Reveal e acabamento", en: "Reveal & polish" },
        items: {
          pt: [
            "Ao clicar na capa, o Rank/Status entra com animação curta, crest central e glow correspondente ao tier.",
            "A arte da carta escurece e aproxima levemente durante o reveal para destacar a informação sem abandonar a capa do deck.",
            "Ornamentos laterais, topo, avatar e reflexos foram refinados sem alterar o fluxo de Trocar Deck."
          ],
          en: [
            "Clicking the cover now reveals Rank/Status with a short animation, centered crest and tier-matched glow.",
            "The deck-cover art darkens and subtly zooms during reveal so the information stands out without replacing the card art.",
            "Side ornaments, top crest, avatar frame and highlights were refined without changing the Change Deck flow."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.2",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Banners de Jogador nos Modos de Jogo", en: "Player Banners in Match Setup" },
    summary: {
      pt: "As telas VS de Jogo Livre, Eternal CPU, Online Normal e Ranked agora usam banners inspirados em jogos competitivos, combinando capa do deck, avatar do perfil, nome do jogador e Rank/Status ao clicar na arte.",
      en: "The VS screens for Free Play, Eternal CPU, Online Normal and Ranked now use banners inspired by competitive game loading screens, combining deck cover art, profile avatar, player name and Rank/Status on art click."
    },
    sections: [
      {
        title: { pt: "Visual dos jogadores", en: "Player visuals" },
        items: {
          pt: [
            "A antiga caixa horizontal foi substituída por um banner vertical com moldura, aproximando a apresentação do estilo de loading banner que você sugeriu.",
            "A carta de capa do deck passa a ocupar a arte principal do banner, enquanto o avatar do perfil fica sobreposto em destaque, com o nome do jogador preservado no topo.",
            "O botão de Trocar Deck continua disponível abaixo de cada banner, mantendo o fluxo rápido de preparação da partida."
          ],
          en: [
            "The old horizontal panel has been replaced by a framed vertical banner, bringing the presentation closer to the loading-banner style you suggested.",
            "The deck cover card now fills the main banner art while the profile avatar is overlaid in focus, with the player name preserved at the top.",
            "The Change Deck button remains available below each banner, keeping match preparation quick."
          ]
        }
      },
      {
        title: { pt: "Interação e consistência", en: "Interaction & consistency" },
        items: {
          pt: [
            "Ao clicar na arte do banner, o simulador revela um painel com Rank, Status ou detalhes do deck, dependendo do modo de jogo.",
            "O banner recebe efeito de perspectiva/tilt no hover para manter a linguagem Eternal e dar mais presença à capa do deck.",
            "Jogo Livre, Eternal CPU, Online Normal e Ranked compartilham o mesmo componente visual, reduzindo diferenças entre os modos."
          ],
          en: [
            "Clicking the banner art reveals a panel with Rank, Status or deck details depending on the game mode.",
            "The banner now uses a perspective/tilt hover effect to keep the Eternal visual language and give the deck cover more presence.",
            "Free Play, Eternal CPU, Online Normal and Ranked now share the same visual component, reducing mode-to-mode inconsistencies."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.1a",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Correção da Biblioteca de Decks", en: "Deck Library Visibility Fix" },
    summary: {
      pt: "Corrige o colapso visual dos cards de decks salvos após o redesign v3.5.1 e adapta a paginação à altura disponível da tela.",
      en: "Fixes saved deck cards collapsing after the v3.5.1 redesign and adapts pagination to the available viewport height."
    },
    sections: [
      {
        title: { pt: "Meus Decks", en: "My Decks" },
        items: {
          pt: [
            "Os decks salvos voltam a aparecer normalmente; nenhum dado de deck foi perdido ou alterado.",
            "O contêiner do efeito 3D agora possui altura própria e os cards preenchem essa área de forma estável, independentemente da ordem de carregamento do CSS.",
            "Em telas mais baixas, como 864p/900p, a biblioteca mostra 4 decks por página; em telas mais altas, mostra até 8, evitando scroll vertical do documento.",
            "O efeito 3D/Perspectiva das capas de deck permanece ativo."
          ],
          en: [
            "Saved decks are visible again; no deck data was lost or modified.",
            "The 3D wrapper now owns a stable height and deck cards fill it regardless of CSS loading order.",
            "On shorter viewports such as 864p/900p the library shows 4 decks per page; taller viewports show up to 8, avoiding document scrolling.",
            "Deck-cover 3D/Perspective remains enabled."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.1",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Fluxo de Jogo e Modais", en: "Game Flow & Modal UX" },
    summary: {
      pt: "As telas Eternal passam a se comportar mais como um jogo: ações usam a linguagem do Menu Principal, páginas evitam scroll vertical e modais ficam realmente centralizados no viewport.",
      en: "Eternal screens now behave more like a game: actions use the Main Menu language, pages avoid document scrolling and dialogs are truly centered in the viewport."
    },
    sections: [
      {
        title: { pt: "Navegação e fluxo", en: "Navigation & flow" },
        items: {
          pt: [
            "Voltar, Aplicar, Novo Deck, Salvar e ações de conta usam a mesma linguagem tipográfica e interação do Menu Principal, sem setas decorativas no botão Voltar.",
            "Configurações agora funciona como uma janela central sobre o wallpaper; apenas o conteúdo interno rola quando necessário.",
            "Meus Decks e Deck Builder ficam presos ao viewport no desktop, usando paginação/áreas internas em vez de empurrar a página para baixo.",
            "A biblioteca de decks mostra até 8 decks por página para manter a composição centralizada."
          ],
          en: [
            "Back, Apply, New Deck, Save and account actions now use the Main Menu typography and interaction language, without decorative arrows on Back.",
            "Settings now behaves as a centered window over the wallpaper; only its internal content scrolls when needed.",
            "My Decks and Deck Builder stay viewport-bound on desktop, using pagination/internal work areas instead of pushing the document downward.",
            "The deck library shows up to 8 decks per page to preserve the centered game composition."
          ]
        }
      },
      {
        title: { pt: "Deck Builder e modais", en: "Deck Builder & dialogs" },
        items: {
          pt: [
            "Novo Deck e detalhes de carta agora usam portals e permanecem centralizados no meio da tela, independentemente da posição da página.",
            "Deck Builder passa a mostrar 14 cartas por página.",
            "O modal de detalhes mantém integralmente o 3D/Perspectiva, glare e resposta ao movimento do mouse."
          ],
          en: [
            "New Deck and card-details dialogs now use portals and remain centered in the viewport regardless of page layout.",
            "Deck Builder now shows 14 cards per page.",
            "The card-details dialog fully preserves its 3D/Perspective, glare and pointer response."
          ]
        }
      }
    ]
  },

  {
    version: "3.5.0",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Interface Eternal Unificada", en: "Unified Eternal Interface" },
    summary: {
      pt: "Meus Decks, Deck Builder, Configurações, Conta/Perfil e Loja passam a compartilhar a mesma linguagem cinematográfica do Menu Principal e do Match Setup.",
      en: "My Decks, Deck Builder, Settings, Account/Profile and Store now share the same cinematic language as the Main Menu and Match Setup."
    },
    sections: [
      {
        title: { pt: "Redesign visual", en: "Visual redesign" },
        items: {
          pt: [
            "Wallpapers locais agora acompanham as principais telas de sistema com gradiente, grain e contraste iguais à identidade da Home.",
            "Meus Decks ganhou cabeçalho cinematográfico, biblioteca mais limpa e cards de deck com perspectiva 3D sutil no mouse.",
            "Deck Builder recebeu composição mais limpa e translúcida, mantendo filtros, paginação, importação/exportação, capas e todas as funções atuais.",
            "Configurações usa navegação lateral inspirada no Menu Principal, com barra branca de seleção e painéis menos parecidos com dashboard web.",
            "Conta, Perfil e Loja foram integrados ao mesmo sistema visual, mantendo login, sincronização e fluxos existentes."
          ],
          en: [
            "Local wallpapers now follow the main system screens with the same gradient, grain and contrast identity used by Home.",
            "My Decks gains a cinematic header, cleaner library and subtle pointer-responsive 3D perspective on deck cards.",
            "Deck Builder receives a cleaner translucent composition while preserving filters, pagination, import/export, covers and current features.",
            "Settings uses Main Menu-inspired side navigation with a white selector bar and less dashboard-like panels.",
            "Account, Profile and Store are integrated into the same visual system while keeping login, sync and existing flows."
          ]
        }
      },
      {
        title: { pt: "Cartas e perspectiva", en: "Cards & perspective" },
        items: {
          pt: [
            "O efeito 3D/Perspectiva do modal de detalhes da carta foi preservado integralmente.",
            "Capas na biblioteca de decks, preview do deck pronto e capa atual do Deck Builder recebem uma versão mais sutil do efeito 3D para manter a sensação física das cartas sem sobrecarregar a interface."
          ],
          en: [
            "The card-details 3D/Perspective effect is fully preserved.",
            "Deck-library covers, prebuilt preview and the current Deck Builder cover receive a subtler 3D effect to keep the physical-card feel without overloading the interface."
          ]
        }
      }
    ]
  },

  {
    version: "3.4.1b",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Coerência do Menu de Partida", en: "Match Menu Consistency" },
    summary: {
      pt: "As telas de preparação passam a usar menu e títulos à esquerda, tipografia alinhada à Home e menos controles duplicados.",
      en: "Match setup screens now use left-side menus and titles, Home-matched typography and fewer duplicated controls."
    },
    sections: [
      {
        title: { pt: "Interface", en: "Interface" },
        items: {
          pt: [
            "Título, status e opções dos modos foram movidos para o lado esquerdo, seguindo a composição do Menu Principal.",
            "Os botões do Match Setup agora usam a mesma tipografia, peso, tamanho e comportamento de hover do Menu Principal.",
            "Troca de deck duplicada foi removida dos menus: o controle permanece abaixo do retrato do respectivo jogador.",
            "O seletor de cor foi removido do Online Normal; a preferência de cor já salva continua sendo utilizada.",
            "Jogo Livre, Eternal CPU, Online Normal e Ranked receberam o mesmo tratamento visual sem alteração de gameplay."
          ],
          en: [
            "Mode title, status and options moved to the left side following the Main Menu composition.",
            "Match Setup buttons now use the Main Menu typography, weight, sizing and hover behavior.",
            "Duplicated deck-change actions were removed from menus; the control remains below each player's portrait.",
            "The color selector was removed from Normal Online while the saved color preference continues to be used.",
            "Free Play, Eternal CPU, Normal Online and Ranked received the same visual treatment without gameplay changes."
          ]
        }
      }
    ]
  },

  {
    version: "3.4.1a",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Polimento Visual do Match Setup", en: "Match Setup Visual Polish" },
    summary: {
      pt: "Ajuste visual do Match Setup para alinhar títulos, informações e opções pela mesma margem esquerda, além de padronizar os botões com a escrita do menu principal.",
      en: "Visual Match Setup polish aligning titles, information and options to the same left edge while matching button capitalization with the main menu."
    },
    sections: [
      {
        title: { pt: "Interface", en: "Interface" },
        items: {
          pt: [
            "Títulos, status e opções do menu lateral agora compartilham a mesma referência de alinhamento à esquerda.",
            "Botões deixam de usar CAPS LOCK e passam a seguir o padrão do menu principal, como Iniciar partida, Trocar deck e Voltar.",
            "Jogo Livre, Eternal CPU, Online Normal e Ranked recebem o mesmo ajuste sem alterar suas regras ou fluxos."
          ],
          en: [
            "Titles, status and side-menu options now share the same left alignment reference.",
            "Buttons no longer use all caps and now follow the main-menu writing style, such as Start match, Change deck and Back.",
            "Free Play, Eternal CPU, Normal Online and Ranked receive the same polish without changing rules or flows."
          ]
        }
      }
    ]
  },

  {
    version: "3.4.1",
    date: { pt: "25/09/2026", en: "09/25/2026" },
    title: { pt: "Match Setup e Versus Screen", en: "Match Setup & Versus Screen" },
    summary: {
      pt: "Jogo Livre, Eternal CPU, Online Normal e Ranked ganham uma nova preparação de partida inspirada no mockup do Photoshop, mantendo a mesma identidade visual da Home.",
      en: "Free Play, Eternal CPU, Normal Online and Ranked gain a new Photoshop-mockup-inspired match setup while keeping the same visual identity as Home."
    },
    sections: [
      {
        title: { pt: "Pré-batalha", en: "Pre-battle" },
        items: {
          pt: [
            "Novo layout VS compartilhado com jogador, oponente, deck, moldura e menu lateral sobre os wallpapers locais.",
            "Jogo Livre mantém dois decks, nomes editáveis e escolha de primeiro jogador.",
            "Eternal CPU mantém dificuldade, Archetype Intelligence e AI Debugger dentro da nova interface.",
            "Online mostra estados Aguardando/Buscando/Conectado sem alterar o matchmaking, criar sala ou entrar por código.",
            "Ranked adota a mesma linguagem competitiva com Bronze III / 1000 RP como pré-temporada visual."
          ],
          en: [
            "New shared VS layout with player, opponent, deck, frame and side menu over the local wallpapers.",
            "Free Play keeps two decks, editable names and first-player selection.",
            "Eternal CPU keeps difficulty, Archetype Intelligence and AI Debugger inside the new interface.",
            "Online shows Waiting/Searching/Connected states without changing matchmaking, room creation or code joining.",
            "Ranked adopts the same competitive language with Bronze III / 1000 RP as a visual pre-season."
          ]
        }
      },
      {
        title: { pt: "Fluxo e navegação", en: "Flow & navigation" },
        items: {
          pt: [
            "Novo seletor de deck rápido abre sobre a tela sem abandonar a preparação da partida.",
            "O wallpaper atual é lembrado durante a sessão para diminuir cortes visuais entre Home e Match Setup.",
            "Deck Builder aberto a partir de um setup retorna ao modo de origem."
          ],
          en: [
            "A new quick deck selector opens over the setup screen without leaving match preparation.",
            "The current wallpaper is remembered during the session to reduce visual cuts between Home and Match Setup.",
            "Deck Builder opened from a setup returns to the originating mode."
          ]
        }
      }
    ]
  },

  {
    version: "3.4.0",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Novo Menu Principal e Modos de Jogo", en: "Main Menu & Game Modes Redesign" },
    summary: {
      pt: "A Home foi reconstruída com navegação inspirada no mockup do Photoshop, usando os wallpapers locais e separando Partida Local, Online Normal/Ranqueada, Loja, Deck Builder e Configurações.",
      en: "Home was rebuilt with navigation inspired by the Photoshop mockup, using local wallpapers and separating Local Match, Normal/Ranked Online, Store, Deck Builder and Settings."
    },
    sections: [
      {
        title: { pt: "Menu principal", en: "Main menu" },
        items: {
          pt: [
            "Novo layout em tela cheia com gradiente escuro à esquerda, logo e menu vertical, preservando o slideshow otimizado de public/images/wallpapers.",
            "Partida Local agora abre um submenu com Jogo Livre e Eternal CPU.",
            "Multiplayer Online agora abre um submenu com Partida Normal e Partida Ranqueada.",
            "O botão Voltar dos setups retorna ao submenu correto, mantendo o contexto da navegação.",
            "Conta do jogador, Patch Notes e Sobre continuam acessíveis de forma compacta no topo."
          ],
          en: [
            "New fullscreen layout with a dark left gradient, logo and vertical menu while preserving the optimized public/images/wallpapers slideshow.",
            "Local Match now opens a submenu with Free Play and Eternal CPU.",
            "Online Multiplayer now opens a submenu with Normal Match and Ranked Match.",
            "Setup back buttons return to the correct submenu, preserving navigation context.",
            "Player account, Patch Notes and About remain available through compact top controls."
          ]
        }
      },
      {
        title: { pt: "Fundação dos novos modos", en: "New mode foundations" },
        items: {
          pt: [
            "Partida Normal continua usando o Online existente: matchmaking rápido, criar sala e entrar por código.",
            "Nova tela de pré-temporada Ranqueada prepara login obrigatório, deck válido, tiers e rating sem alterar a fila Normal ainda.",
            "A entrada Loja já existe no novo menu e abre uma área própria em desenvolvimento, isolada das regras do simulador."
          ],
          en: [
            "Normal Match continues to use the existing Online flow: quick matchmaking, create room and join by code.",
            "A new Ranked pre-season screen prepares account requirements, legal decks, tiers and rating without changing the Normal queue yet.",
            "The Store entry now exists in the new menu and opens its own in-development area, isolated from simulator rules."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.1e",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Compatibilidade Conta + Online", en: "Account + Online Compatibility" },
    summary: {
      pt: "Perfis logados deixam de transportar avatar/banner e dados locais em excesso ao entrar em salas ou matchmaking, evitando desconexões do Socket.IO.",
      en: "Signed-in profiles no longer transport oversized avatar/banner and local profile data when joining rooms or matchmaking, preventing Socket.IO disconnects."
    },
    sections: [
      {
        title: { pt: "Perfil público Online", en: "Online public profile" },
        items: {
          pt: [
            "O Online envia somente nome, username, cor do jogador e um avatar compacto.",
            "Banner, bio, e-mail e quaisquer outros campos locais/da conta não entram no payload da sala.",
            "Avatares Base64 grandes são reduzidos para uma versão de até 128 px; se não puderem ser reduzidos, a partida segue sem avatar.",
            "URLs públicas curtas de avatar continuam suportadas."
          ],
          en: [
            "Online now sends only player name, username, player color and a compact avatar.",
            "Banner, bio, email and any other local/account fields are excluded from room payloads.",
            "Large Base64 avatars are reduced to a version up to 128 px; if resizing fails, the match continues without an avatar.",
            "Short public avatar URLs remain supported."
          ]
        }
      },
      {
        title: { pt: "Proteção de transporte", en: "Transport protection" },
        items: {
          pt: [
            "O cliente bloqueia perfis fora do orçamento antes de emitir pelo Socket.IO.",
            "O servidor sanitiza novamente o perfil e rejeita payloads exagerados com mensagem clara.",
            "Salas privadas e matchmaking usam a mesma identidade pública compacta."
          ],
          en: [
            "The client blocks profiles over budget before emitting them through Socket.IO.",
            "The server sanitizes the profile again and rejects oversized payloads with a clear message.",
            "Private rooms and matchmaking use the same compact public identity."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.1d",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Teste do Pipeline de Atualização", en: "Update Pipeline Test" },
    summary: {
      pt: "Atualização mínima criada de propósito para confirmar o novo fluxo automático: aplicar PATCH, validar, enviar ao GitHub e publicar no Cloudflare.",
      en: "A deliberately tiny update created to confirm the new automatic workflow: apply PATCH, validate, push to GitHub and deploy to Cloudflare."
    },
    sections: [
      {
        title: { pt: "Confirmação visual", en: "Visual confirmation" },
        items: {
          pt: [
            "A Home agora mostra `V3.3.1d` e o selo `UPDATE OK` no topo.",
            "Se esse selo aparecer no site publicado, o PATCH chegou ao projeto e o deploy do Cloudflare recebeu a nova versão.",
            "Nenhuma regra, IA, Online ou database foi alterada neste teste."
          ],
          en: [
            "Home now shows `V3.3.1d` and an `UPDATE OK` badge in the top bar.",
            "If this badge appears on the published site, the PATCH reached the project and Cloudflare received the new version.",
            "No rules, AI, Online or database behavior was changed by this test."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.1c",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Atualização e Deploy Rápidos", en: "Fast Update & Deploy Workflow" },
    summary: {
      pt: "O projeto ganha um gerenciador de atualização em um clique e reduz bastante o peso dos assets enviados ao Cloudflare, mantendo GitHub e deploy sincronizados sem trocar arquivos pasta por pasta.",
      en: "The project gains a one-click update manager and significantly reduces static asset weight, keeping GitHub and Cloudflare deployment in sync without manually replacing folders."
    },
    sections: [
      {
        title: { pt: "Fluxo de atualização", en: "Update workflow" },
        items: {
          pt: [
            "Novo `GERENCIAR_PROJETO.bat` aplica ZIPs PATCH-ONLY automaticamente, preservando `.git`, `node_modules`, `dist`, `.env` e `server/.env`.",
            "O gerenciador roda verify/test/build, cria commit, faz `git push` e pode publicar direto no Cloudflare com Wrangler.",
            "`npm install` só é executado quando o lockfile muda ou `node_modules` não existe."
          ],
          en: [
            "New `GERENCIAR_PROJETO.bat` automatically applies PATCH-ONLY ZIPs while preserving `.git`, `node_modules`, `dist`, `.env` and `server/.env`.",
            "The manager runs verify/test/build, creates a commit, runs `git push` and can deploy directly to Cloudflare with Wrangler.",
            "`npm install` only runs when the lockfile changes or `node_modules` is missing."
          ]
        }
      },
      {
        title: { pt: "Assets & deploy", en: "Assets & deployment" },
        items: {
          pt: [
            "Wallpapers foram recomprimidos mantendo 1920×1080; o conjunto caiu de ~20,3 MB para ~1,7 MB.",
            "Verso da carta e indicadores de Level passaram para WebP e ficaram muito menores.",
            "As cartas atuais já são WebP 300×437, então o Database reutiliza a imagem canônica diretamente em vez de procurar uma árvore duplicada de thumbnails.",
            "Isso remove requisições 404 de thumbnail + fallback e reduz o pacote estático do deploy."
          ],
          en: [
            "Wallpapers were recompressed while keeping 1920×1080; the set dropped from ~20.3 MB to ~1.7 MB.",
            "Card back and Level indicators now use much smaller WebP assets.",
            "Current card artwork is already 300×437 WebP, so Database reuses the canonical image directly instead of requesting a duplicate thumbnail tree.",
            "This removes thumbnail 404 + fallback requests and reduces the static deployment package."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.1b",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Card Back Loading Placeholder", en: "Card Back Loading Placeholder" },
    summary: {
      pt: "O Database e o Deck Builder agora exibem o verso da carta enquanto a thumbnail está inativa ou carregando, evitando espaços vazios e imagens quebradas.",
      en: "Database and Deck Builder now show the card back while a thumbnail is idle or loading, avoiding empty spaces and broken images."
    },
    sections: [
      {
        title: { pt: "Carregamento visual", en: "Visual loading" },
        items: {
          pt: [
            "Cartas em lazy-loading mostram `card-back.webp` até a frente terminar de carregar.",
            "A frente entra com um fade curto para evitar o efeito de imagem aparecendo bruscamente.",
            "Se a thumbnail falhar, o componente tenta automaticamente a arte original em alta qualidade.",
            "Se thumbnail e arte original falharem, o verso permanece visível no lugar da imagem quebrada."
          ],
          en: [
            "Lazy-loaded cards show `card-back.webp` until the front artwork finishes loading.",
            "The front artwork fades in briefly to avoid a harsh image pop-in.",
            "If the thumbnail fails, the component automatically tries the original high-quality artwork.",
            "If both thumbnail and original artwork fail, the card back remains visible instead of a broken image."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.1a",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Image Performance Hotfix", en: "Image Performance Hotfix" },
    summary: {
      pt: "O site passa a carregar cartas e wallpapers de forma progressiva, reduzindo drasticamente o tráfego inicial sem diminuir a qualidade usada na Arena e nos detalhes.",
      en: "The site now loads cards and wallpapers progressively, drastically reducing initial traffic without lowering the quality used in the Arena and card details."
    },
    sections: [
      {
        title: { pt: "Imagens & carregamento", en: "Images & loading" },
        items: {
          pt: [
            "382 thumbnails WebP de 300 px foram adicionadas para listas e Deck Builder; as artes originais continuam intactas.",
            "A Home não baixa mais os 10 wallpapers de uma vez: mostra o atual e prepara somente o próximo quando o navegador está ocioso.",
            "Deck Builder usa lazy loading e prioridade baixa, com prefetch da próxima página somente em idle.",
            "Se uma thumbnail estiver ausente, o componente cai automaticamente para a arte original."
          ],
          en: [
            "382 300px WebP thumbnails were added for lists and Deck Builder while original artwork stays untouched.",
            "Home no longer downloads all 10 wallpapers at once: it shows the current one and prepares only the next one while the browser is idle.",
            "Deck Builder uses lazy loading and low priority, with next-page prefetch only during idle time.",
            "If a thumbnail is missing, the component automatically falls back to the original artwork."
          ]
        }
      },
      {
        title: { pt: "Cache", en: "Cache" },
        items: {
          pt: ["Novas regras em `public/_headers` melhoram o cache de thumbnails, cartas, wallpapers e assets versionados no Cloudflare/navegador."],
          en: ["New `public/_headers` rules improve browser/Cloudflare caching for thumbnails, cards, wallpapers and versioned assets."]
        }
      }
    ]
  },

  {
    version: "3.3.1",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Archetype Intelligence & AI Debugger", en: "Archetype Intelligence & AI Debugger" },
    summary: {
      pt: "A Eternal CPU passa a reconhecer o estilo do próprio deck e usar essa identidade no score das jogadas. O primeiro AI Debugger visual mostra a ação escolhida, alternativas, lookahead e os pesos do arquétipo.",
      en: "Eternal CPU now recognizes its own deck style and uses that identity when scoring moves. The first visual AI Debugger shows the chosen action, alternatives, lookahead and archetype weights."
    },
    sections: [
      {
        title: { pt: "Deck & Archetype Intelligence", en: "Deck & Archetype Intelligence" },
        items: {
          pt: [
            "Novo `aiArchetypes.js` analisa curva, tipos de carta, cores, Burst/Flash, ações estruturadas, redução e presença de Ultimate/Brave.",
            "O perfil trabalha com afinidades combináveis — Agressivo, Controle, Defensivo, Ultimate, Brave, Recursos e Equilibrado — permitindo estratégias híbridas.",
            "SD23 Eris é reconhecido como Ultimate / Controle; SD28 Land of Deep Green como Ultimate / Brave na database atual.",
            "O perfil é calculado pela decklist conhecida antes da partida e armazenado no estado da IA; a CPU não recalcula o arquétipo lendo a ordem escondida do deck durante o jogo."
          ],
          en: [
            "New `aiArchetypes.js` analyzes curve, card types, colors, Burst/Flash, structured actions, reductions and Ultimate/Brave presence.",
            "Profiles use mixable affinities — Aggressive, Control, Defensive, Ultimate, Brave, Resources and Balanced — allowing hybrid strategies.",
            "SD23 Eris is recognized as Ultimate / Control; SD28 Land of Deep Green as Ultimate / Brave in the current database.",
            "The profile is calculated from the known deck list before the match and stored in AI state; the CPU does not recompute its archetype by reading hidden deck order during play."
          ]
        }
      },
      {
        title: { pt: "AI Debugger", en: "AI Debugger" },
        items: {
          pt: [
            "A tela Contra IA mostra o estilo detectado e as três maiores afinidades antes de iniciar a partida.",
            "O AI Debugger opcional exibe score total, score imediato, bônus de lookahead, peso do arquétipo e score semântico de efeitos.",
            "A linha prevista e as melhores alternativas aparecem no mesmo painel, usando exatamente o ranking que escolheu a jogada real da CPU.",
            "`chooseAIDecision()` preserva compatibilidade com `chooseAIAction()` e expõe metadados de decisão sem alterar a legalidade das ações."
          ],
          en: [
            "The Play vs AI screen shows the detected style and top three affinities before the match starts.",
            "The optional AI Debugger displays total score, immediate score, lookahead bonus, archetype weight and semantic effect score.",
            "The predicted line and best alternatives appear in the same panel, using the exact ranking that selected the CPU's real move.",
            "`chooseAIDecision()` keeps compatibility with `chooseAIAction()` while exposing decision metadata without changing action legality."
          ]
        }
      },
      {
        title: { pt: "Segurança & validação", en: "Safety & validation" },
        items: {
          pt: [
            "Os pesos de arquétipo só reordenam ações que já vieram de `getLegalActions()` e continuam passando pelo reducer normal.",
            "Sem metadados de deck pré-calculados, a IA cai para um perfil Equilibrado em vez de inferir estratégia olhando cartas ainda escondidas no deck.",
            "Novos testes cobrem detecção Ultimate/Brave, Controle, influência estratégica sem ação ilegal e os metadados usados pelo AI Debugger."
          ],
          en: [
            "Archetype weights only reorder actions already exposed by `getLegalActions()` and still run through the normal reducer.",
            "Without precomputed deck metadata, AI falls back to Balanced instead of inferring strategy by inspecting still-hidden deck cards.",
            "New tests cover Ultimate/Brave detection, Control detection, strategic influence without illegal actions and AI Debugger metadata."
          ]
        }
      }
    ]
  },

  {
    version: "3.3.0",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Planning / Lookahead", en: "Planning / Lookahead" },
    summary: {
      pt: "A Eternal CPU passa a comparar pequenas sequências de ações legais antes de escolher a primeira jogada, com profundidade maior no Difícil e replanejamento após cada mudança real da partida.",
      en: "Eternal CPU now compares short sequences of legal actions before choosing its first move, with a deeper horizon on Hard and replanning after every real match-state change."
    },
    sections: [
      {
        title: { pt: "Planejamento multi-ação", en: "Multi-action planning" },
        items: {
          pt: [
            "Novo `rankAIPlans()` combina o score imediato com continuações legais futuras usando beam search limitado e orçamento determinístico de nós.",
            "Normal analisa uma continuação; Difícil pode analisar até três decisões futuras além da ação atual.",
            "Ações de progresso como Main → Attack permanecem no feixe de busca para que a CPU consiga enxergar pressão e lethal que só aparecem depois de avançar a fase.",
            "O plano nunca é executado inteiro de uma vez: somente a primeira ação é confirmada e a CPU recalcula após cada resolução real."
          ],
          en: [
            "New `rankAIPlans()` combines immediate score with future legal continuations using bounded beam search and a deterministic node budget.",
            "Normal analyzes one continuation; Hard can analyze up to three future decisions beyond the current action.",
            "Progress actions such as Main → Attack stay in the search beam so the CPU can see pressure and lethal that only exist after advancing the phase.",
            "A whole plan is never committed at once: only the first action is executed and the CPU replans after every real resolution."
          ]
        }
      },
      {
        title: { pt: "Informação oculta & segurança", en: "Hidden information & safety" },
        items: {
          pt: [
            "A busca para imediatamente quando o controle passa ao adversário, evitando simular a mão oculta do outro jogador.",
            "Compras, reveals e outras mudanças que consomem cartas do deck encerram o horizonte atual; a CPU só replana depois que a informação realmente foi revelada.",
            "Toda etapa simulada continua vindo de `getLegalActions()` e passando por `applyGameAction()` — o lookahead não ganha atalhos próprios de regra.",
            "A avaliação de uma compra não usa a identidade específica da carta ainda desconhecida para inflar o score antes da resolução."
          ],
          en: [
            "Search stops immediately when control passes to the opponent, avoiding simulation of the other player's hidden hand.",
            "Draws, reveals and other deck-consuming changes end the current horizon; the CPU replans only after that information is actually revealed.",
            "Every simulated step still comes from `getLegalActions()` and runs through `applyGameAction()` — lookahead gains no private rules shortcuts.",
            "A draw evaluation does not use the specific identity of the still-unknown card to inflate the score before resolution."
          ]
        }
      },
      {
        title: { pt: "Diagnóstico & validação", en: "Diagnostics & validation" },
        items: {
          pt: [
            "Ações ranqueadas agora podem expor `planScore`, `planBonus`, `planDepth`, `planNodes` e `planActions`, formando a base do futuro AI Debugger.",
            "Novos testes verificam lethal através de mudança de fase, legalidade de toda a sequência planejada, profundidade por dificuldade, determinismo e fronteiras de informação oculta.",
            "A CPU continua recalculando sua decisão a cada ação, podendo abandonar um plano antigo quando Trigger, Burst, alvo, compra ou resposta do adversário muda o estado."
          ],
          en: [
            "Ranked actions can now expose `planScore`, `planBonus`, `planDepth`, `planNodes` and `planActions`, forming the basis of the future AI Debugger.",
            "New tests cover lethal through phase advancement, legality of the entire planned sequence, difficulty-based depth, determinism and hidden-information boundaries.",
            "The CPU still recalculates after every action and can abandon an old plan when Trigger, Burst, targets, draws or opponent responses change the state."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.5",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Card Effect Intelligence", en: "Card Effect Intelligence" },
    summary: {
      pt: "A Eternal CPU passa a avaliar semanticamente o resultado dos efeitos estruturados, escolhendo alvos e respostas com base no valor real de destruir, exaurir, dar Refresh, alterar BP, comprar, gerar Cores e remover cartas do campo.",
      en: "Eternal CPU now evaluates structured effects semantically, choosing targets and responses based on the real value of destroying, exhausting, refreshing, changing BP, drawing, generating Cores and removing cards from the field."
    },
    sections: [
      {
        title: { pt: "Leitura semântica de efeitos", en: "Semantic effect evaluation" },
        items: {
          pt: [
            "Novo módulo `aiEffectSemantics.js` mede o impacto estratégico real de uma resolução estruturada além do score genérico do estado.",
            "Destruir e devolver para a mão consideram o valor do corpo removido, BP, símbolos, Cores investidos e relevância na batalha atual.",
            "Exhaust e Refresh agora diferenciam ameaças fortes de alvos fracos; mudanças de BP recebem peso adicional quando atingem atacante ou bloqueador da batalha em andamento.",
            "Compra/recuperação de cartas, geração de Core, recuperação/perda de Life, proteções e restrições de batalha também entram na avaliação semântica."
          ],
          en: [
            "New `aiEffectSemantics.js` module measures the real strategic impact of a structured resolution beyond the generic board-state score.",
            "Destroy and return-to-hand evaluate the removed body's value, BP, symbols, invested Cores and relevance to the current battle.",
            "Exhaust and Refresh now distinguish major threats from weak targets; BP changes receive extra weight when they affect the current attacker or blocker.",
            "Card draw/recovery, Core generation, Life gain/loss, protections and battle restrictions are also part of semantic evaluation."
          ]
        }
      },
      {
        title: { pt: "Decisões & alvos", en: "Decisions & targets" },
        items: {
          pt: [
            "A pré-visualização da Decision Queue usa o novo score semântico antes da CPU confirmar um alvo ou opção.",
            "A CPU tende a exaurir, devolver ou destruir a ameaça mais valiosa em vez de tratar todos os alvos legais como equivalentes.",
            "Buffs de BP em Flash priorizam o corpo que está realmente participando da batalha quando isso muda a troca.",
            "As decisões ranqueadas agora guardam `effectScore` e `effectReasons`, preparando a futura tela de debug da IA."
          ],
          en: [
            "Decision Queue preview uses the new semantic score before the CPU confirms a target or option.",
            "The CPU tends to exhaust, bounce or destroy the most valuable threat instead of treating every legal target as equivalent.",
            "Flash BP buffs prioritize the body actually involved in the current battle when that changes the exchange.",
            "Ranked decisions now keep `effectScore` and `effectReasons`, preparing the future AI debug view."
          ]
        }
      },
      {
        title: { pt: "Validação", en: "Validation" },
        items: {
          pt: [
            "A suíte automatizada passa de 96 para 102 testes.",
            "Novos testes cobrem escolha de alvo para Exhaust, Refresh e retorno à mão, buff de BP contextual, leitura de Draw/Core e privacidade da mão oculta do oponente.",
            "A IA continua sem consultar a identidade das cartas ocultas do adversário e continua executando apenas ações legais da Rules Engine."
          ],
          en: [
            "The automated suite grows from 96 to 102 tests.",
            "New tests cover Exhaust, Refresh and return-to-hand target choice, contextual BP buffs, Draw/Core semantics and opponent hidden-hand privacy.",
            "The AI still never inspects the identity of hidden opponent cards and continues to execute only legal Rules Engine actions."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.4",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Flash, Magic & Burst Intelligence", en: "Flash, Magic & Burst Intelligence" },
    summary: {
      pt: "A Eternal CPU passa a respeitar melhor os timings de Magic, guardar respostas de Flash e avaliar quando Set/ativação de Burst realmente compensa.",
      en: "Eternal CPU now handles Magic timing more carefully, preserves useful Flash responses and evaluates when setting or activating Burst is actually worthwhile."
    },
    sections: [
      {
        title: { pt: "Flash & Magic", en: "Flash & Magic" },
        items: {
          pt: [
            "Magic estruturada agora só aparece no timing que realmente possui; cartas antigas ainda sem estrutura permanecem disponíveis para resolução manual.",
            "Durante o Main Step, efeitos Main e Flash são expostos como ações separadas e continuam validados pela mesma Rules Engine.",
            "A CPU pré-visualiza decisões de alvo estruturadas antes de gastar a Magic e evita usar cartas sem alvo ou ganho real.",
            "Em batalha, respostas de Flash recebem valor adicional quando evitam lethal ou mudam uma troca de BP; fora de combate, a CPU tende a preservar respostas defensivas úteis."
          ],
          en: [
            "Structured Magic is now exposed only in timings the card actually has, while older unstructured cards remain available for manual resolution.",
            "During Main Step, Main and Flash effects are exposed as separate actions and still validated by the same Rules Engine.",
            "The CPU previews structured target decisions before spending a Magic and avoids cards with no valid target or meaningful gain.",
            "During battle, Flash responses gain extra value when they prevent lethal or swing a BP trade; outside combat the CPU tends to preserve useful defensive responses."
          ]
        }
      },
      {
        title: { pt: "Burst", en: "Burst" },
        items: {
          pt: [
            "Timings `lifeDecrease` e `afterLifeReduced` passam a compartilhar a janela automática já usada por Burst após redução de Life.",
            "A CPU prioriza Set Burst de condições que consegue verificar automaticamente e evita gastar cartas em condições ainda exclusivamente manuais.",
            "Ao abrir uma janela de Burst, a CPU compara ativar contra passar e mantém a carta setada quando o efeito não possui alvo legal ou valor suficiente."
          ],
          en: [
            "`lifeDecrease` and `afterLifeReduced` timings now share the automatic window already used by Burst after Life loss.",
            "The CPU prioritizes Burst conditions it can verify automatically and avoids committing cards to conditions that still require manual confirmation.",
            "When a Burst window opens, the CPU compares activation against passing and keeps the set card when the effect has no legal target or enough value."
          ]
        }
      },
      {
        title: { pt: "Validação", en: "Validation" },
        items: {
          pt: [
            "A suíte automatizada passa de 90 para 96 testes.",
            "Novos testes cobrem timings Main/Flash, resposta de Flash a lethal, economia de Magic sem alvo, prioridade de Set Burst e ativação/passagem de Burst.",
            "Toda decisão continua sendo escolhida exclusivamente entre ações retornadas por getLegalActions() e executada por applyGameAction()."
          ],
          en: [
            "The automated suite grows from 90 to 96 tests.",
            "New tests cover Main/Flash timing, lethal Flash responses, saving Magic with no target, Burst set priority and Burst activate/pass decisions.",
            "Every decision is still chosen exclusively from actions returned by getLegalActions() and executed through applyGameAction()."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.3",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "CPU Core & Resource Management", en: "CPU Core & Resource Management" },
    summary: {
      pt: "A Eternal CPU passa a administrar Cores, níveis e redução de custo com mais planejamento, preservando recursos para jogadas futuras.",
      en: "Eternal CPU now manages Cores, Levels and cost reduction with more planning while preserving resources for future plays."
    },
    sections: [
      {
        title: { pt: "Gestão de Cores", en: "Core management" },
        items: {
          pt: [
            "A CPU agora pode colocar Cores da Reserve em cartas no campo para alcançar níveis superiores quando a melhoria compensa o investimento.",
            "Invocações passam a considerar variantes legais de quantidade de Cores, permitindo entrar diretamente em níveis superiores quando houver recursos.",
            "A avaliação distingue Cores flexíveis na Reserve de Cores comprometidos em níveis ativos e evita gastar recursos sem ganho estratégico suficiente.",
            "O Soul Core recebe valor de flexibilidade adicional e tende a ser preservado quando não é necessário."
          ],
          en: [
            "The CPU can now move Cores from Reserve to field cards to reach higher Levels when the upgrade is worth the investment.",
            "Summons now consider legal Core-placement variants, allowing cards to enter at higher Levels when resources permit.",
            "Evaluation distinguishes flexible Reserve Cores from Cores committed to active Levels and avoids spending resources without enough strategic gain.",
            "Soul Core flexibility is valued and it tends to be preserved when it is not required."
          ]
        }
      },
      {
        title: { pt: "Redução & planejamento", en: "Reduction & planning" },
        items: {
          pt: [
            "Símbolos no campo agora ganham valor adicional quando reduzem o custo de cartas que a CPU ainda possui na mão.",
            "A CPU mede quantas jogadas futuras permanecem disponíveis antes e depois de gastar Cores.",
            "Subir um nível considera ganho de BP, efeitos vinculados ao Level e a capacidade de manter recursos para uma segunda jogada.",
            "A lógica continua sem consultar a identidade das cartas ocultas do oponente."
          ],
          en: [
            "Field symbols gain extra value when they reduce the cost of cards still in the CPU's hand.",
            "The CPU measures how many future plays remain available before and after spending Cores.",
            "Leveling considers BP gains, Level-gated effects and whether resources remain for a follow-up play.",
            "The logic still never inspects the identity of the opponent's hidden cards."
          ]
        }
      },
      {
        title: { pt: "Validação", en: "Validation" },
        items: {
          pt: [
            "Adicionados testes para invocação em Level superior, Level Up por MOVE_CORE, preservação de Reserve e sinergia de redução.",
            "A suíte automatizada passa de 86 para 90 testes mantendo todas as ações da CPU sob getLegalActions() e applyGameAction().",
            "Simulação real SD23 vs SD28 completou 110 ações em 6 turnos, com uso de Level Up e nenhuma ação ilegal."
          ],
          en: [
            "Added tests for higher-Level summoning, MOVE_CORE Level Up, Reserve preservation and reduction synergy.",
            "The automated suite grows from 86 to 90 tests while keeping every CPU action under getLegalActions() and applyGameAction().",
            "A real SD23 vs SD28 simulation completed 110 actions in 6 turns with Level Up usage and no illegal actions."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.2",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "CPU Combat Intelligence", en: "CPU Combat Intelligence" },
    summary: {
      pt: "A Eternal CPU passa a avaliar o Attack Step como um plano de combate, preservando defesa e escolhendo trocas de BP com mais critério.",
      en: "Eternal CPU now evaluates the Attack Step as a combat plan, preserving defense and choosing BP trades more carefully."
    },
    sections: [
      {
        title: { pt: "Ataque inteligente", en: "Smarter attacking" },
        items: {
          pt: [
            "A CPU agora considera todos os atacantes prontos e todos os bloqueadores disponíveis, em vez de avaliar cada ataque isoladamente.",
            "Ataques não letais que entregariam uma carta gratuitamente para um bloqueador muito mais forte passam a ser evitados.",
            "A CPU reconhece pressão acumulada do Attack Step e sequências em que a quantidade de atacantes supera a quantidade de bloqueadores.",
            "Ataques imediatamente letais continuam tendo prioridade máxima."
          ],
          en: [
            "The CPU now considers all ready attackers and available blockers instead of evaluating every attack in isolation.",
            "Non-lethal attacks that would donate a body to a much stronger blocker are now avoided.",
            "The CPU recognizes full Attack Step pressure and sequences where attackers outnumber blockers.",
            "Immediate lethal attacks still receive maximum priority."
          ]
        }
      },
      {
        title: { pt: "Defesa & bloqueios", en: "Defense & blocking" },
        items: {
          pt: [
            "A CPU estima o risco do próximo turno antes de exaurir seu último bloqueador em um ataque.",
            "Com Life baixa, ela pode encerrar o Attack Step para manter defesa suficiente contra a resposta do oponente.",
            "Ao bloquear, a CPU prefere o menor bloqueador que vence o combate e preserva corpos maiores quando eles não são necessários.",
            "A decisão entre bloquear ou receber dano considera Life atual, próximos atacantes e o valor da troca de BP."
          ],
          en: [
            "The CPU estimates next-turn risk before exhausting its last blocker on an attack.",
            "At low Life it may end the Attack Step to preserve enough defense against the opponent's response.",
            "When blocking, the CPU prefers the smallest body that wins combat and preserves larger bodies when they are unnecessary.",
            "Block-versus-damage decisions consider current Life, future attackers and BP trade value."
          ]
        }
      },
      {
        title: { pt: "Validação", en: "Validation" },
        items: {
          pt: [
            "Adicionados testes para preservação do último bloqueador, rejeição de ataque suicida, bloqueio eficiente e prioridade de lethal.",
            "A suíte automatizada passa de 82 para 86 testes, mantendo a regra de que toda ação da CPU precisa vir de getLegalActions()."
          ],
          en: [
            "Added tests for preserving the last blocker, refusing suicide attacks, efficient blocking and lethal priority.",
            "The automated suite grows from 82 to 86 tests while keeping the rule that every CPU action must come from getLegalActions()."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.1",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Match Stability, Matchmaking & CPU Beta 2", en: "Match Stability, Matchmaking & CPU Beta 2" },
    summary: {
      pt: "Consolida a Arena atual, corrige o matchmaking e ativa a nova Eternal CPU Beta 2 usando a própria Rules Engine.",
      en: "Consolidates the current Arena, fixes matchmaking and enables the new Eternal CPU Beta 2 using the same Rules Engine."
    },
    sections: [
      {
        title: { pt: "Eternal CPU Beta 2", en: "Eternal CPU Beta 2" },
        items: {
          pt: [
            "O modo Contra IA foi reativado na Home com seleção de deck e dificuldades Fácil, Normal e Difícil.",
            "A CPU escolhe somente ações retornadas por getLegalActions(), usando a mesma Rules Engine das partidas local e online.",
            "A avaliação considera Life, BP, recursos, presença de campo, ataque, bloqueio, Burst, Mirage, Brave, Magic e decisões de efeito já automatizadas.",
            "A CPU não usa a identidade das cartas ocultas da mão do oponente para decidir jogadas.",
            "Adicionado bloqueio contra loops de gerenciamento de Brave/Mirage e atraso visual entre ações para tornar os turnos legíveis.",
            "A suíte automatizada ganhou testes de legalidade da IA, ataque letal, bloqueio letal, informação oculta, decisão determinística e simulação IA vs IA."
          ],
          en: [
            "VS AI has been re-enabled on Home with deck selection and Easy, Normal and Hard difficulties.",
            "The CPU only chooses actions returned by getLegalActions(), using the same Rules Engine as local and online matches.",
            "Evaluation considers Life, BP, resources, board presence, attacking, blocking, Burst, Mirage, Brave, Magic and already-automated effect decisions.",
            "The CPU does not use the identity of the opponent's hidden hand cards when choosing actions.",
            "A loop guard for Brave/Mirage management and a readable delay between CPU actions were added.",
            "The automated suite now tests AI legality, lethal attacks, lethal blocks, hidden information, deterministic decisions and AI-vs-AI simulation."
          ]
        }
      },
      {
        title: { pt: "Arquitetura & estabilidade", en: "Architecture & stability" },
        items: {
          pt: [
            "Nova camada getLegalActions(match, playerId) enumera ações válidas usando a própria Rules Engine como autoridade.",
            "Validador de integridade detecta estados impossíveis como cartas duplicadas em zonas, recursos negativos e referências inválidas de batalha/Brave.",
            "Ações bem-sucedidas agora geram um Action Log estruturado, separado do log visual da partida.",
            "Snapshots, restauração e replay de Action Log foram adicionados como base para save/load, debug e futuras partidas contra IA.",
            "Shuffle inicial e Mulligan podem usar seed determinística para testes e reprodução de partidas."
          ],
          en: [
            "A new getLegalActions(match, playerId) layer enumerates valid actions using the Rules Engine itself as the authority.",
            "An integrity validator detects impossible states such as cards duplicated across zones, negative resources and invalid battle/Brave references.",
            "Successful actions now create a structured Action Log separate from the visual match log.",
            "Snapshots, restoration and Action Log replay were added as groundwork for save/load, debugging and future AI matches.",
            "Initial shuffle and Mulligan can use deterministic seeds for testing and reproducible matches."
          ]
        }
      },
      {
        title: { pt: "Online & matchmaking", en: "Online & matchmaking" },
        items: {
          pt: [
            "Corrigido o botão Procurar Partida: o servidor agora mantém a fila de matchmaking e pareia dois jogadores conectados.",
            "A partida rápida agora cria a sala automaticamente, conecta o segundo jogador e inicia a partida sem exigir código manual.",
            "Cancelamento, desconexão e tempo limite do matchmaking agora limpam a fila e avisam o outro jogador.",
            "O bridge Online da versão desktop passou a encaminhar também os eventos de matchmaking."
          ],
          en: [
            "Fixed Find Match: the server now maintains the matchmaking queue and pairs two connected players.",
            "Quick Match now creates the room automatically, connects the second player and starts the match without a manual code.",
            "Matchmaking cancellation, disconnection and timeout now clean up the queue and notify the other player.",
            "The desktop Online bridge now forwards matchmaking events as well."
          ]
        }
      },
      {
        title: { pt: "Arena & organização", en: "Arena & organization" },
        items: {
          pt: [
            "Os hotfixes visuais acumulados da v3.2.0 foram consolidados em arenaLayoutV321.css.",
            "O layout atual de Decks, mãos e zonas invisíveis foi preservado como nova base oficial da Arena.",
            "O wallpaper personalizado da Arena permanece como playmat padrão.",
            "Versão interna, Home, Configurações, Deck Builder, scripts e documentação foram sincronizados para v3.2.1."
          ],
          en: [
            "Accumulated v3.2.0 visual hotfixes were consolidated into arenaLayoutV321.css.",
            "The current Deck, hand and invisible-zone layout is preserved as the new official Arena baseline.",
            "The custom Arena wallpaper remains the default playmat.",
            "Internal version, Home, Settings, Deck Builder, scripts and documentation were synchronized to v3.2.1."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0h",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Readability & Spacing Tweak", en: "Deck Readability & Spacing Tweak" },
    summary: {
      pt: "Ajusta o espaçamento da área do Deck e melhora a leitura do contador com um degradê sutil.",
      en: "Adjusts Deck area spacing and improves the counter readability with a subtle gradient."
    },
    sections: [
      {
        title: { pt: "Arena — Deck", en: "Arena — Deck" },
        items: {
          pt: [
            "Separa um pouco mais os botões laterais da pilha do Deck.",
            "Aplica um degradê sutil atrás do número de cartas para melhorar a leitura.",
            "Move o número do Deck um pouco mais para baixo, preservando o mockup aprovado."
          ],
          en: [
            "Adds a little more spacing between the side buttons and the Deck stack.",
            "Applies a subtle gradient behind the card count for readability.",
            "Moves the Deck number slightly lower while preserving the approved mockup."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0g",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Photoshop Final Alignment", en: "Deck Photoshop Final Alignment" },
    summary: {
      pt: "Ajusta a área do Deck para seguir mais fielmente o mockup do Photoshop aprovado.",
      en: "Adjusts the Deck area to follow the approved Photoshop mockup more faithfully."
    },
    sections: [
      {
        title: { pt: "Arena — Deck", en: "Arena — Deck" },
        items: {
          pt: [
            "Reduz o tamanho do contador do Deck para um visual mais limpo.",
            "Deixa os botões Revelar, Topo e Fundo com proporções mais equilibradas.",
            "Encaixa melhor a pilha do Deck nos cantos superior e inferior.",
            "Aplica um corte visual mais bonito no Deck do oponente, como no mockup."
          ],
          en: [
            "Reduces the Deck counter size for a cleaner look.",
            "Makes the Reveal, Top and Bottom buttons more balanced in size.",
            "Fits the Deck stack better into the upper and lower corners.",
            "Applies a cleaner cropped look to the opponent Deck, as in the mockup."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0f",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Photoshop Fidelity Pass", en: "Deck Photoshop Fidelity Pass" },
    summary: {
      pt: "Refina a área do Deck para seguir de forma ainda mais fiel o mockup aprovado no Photoshop.",
      en: "Refines the Deck area to follow the approved Photoshop mockup even more closely."
    },
    sections: [
      {
        title: { pt: "Arena — Deck", en: "Arena — Deck" },
        items: {
          pt: [
            "Reequilibra a proporção entre a pilha do Deck e os botões laterais do jogador local.",
            "Mantém o Deck do oponente compacto e com leitura central do contador.",
            "Ajusta espaçamentos, alturas e tamanhos tipográficos para ficar mais próximo do mockup do Photoshop.",
            "Mantém a mão centralizada na arena."
          ],
          en: [
            "Rebalances the proportion between the Deck pile and side buttons for the local player.",
            "Keeps the opponent Deck compact with a centered count display.",
            "Adjusts spacing, heights and typography to stay closer to the Photoshop mockup.",
            "Keeps the hand centered in the arena."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0e",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Area Photoshop Alignment", en: "Deck Area Photoshop Alignment" },
    summary: {
      pt: "A área do Deck foi reorganizada para seguir mais de perto o mockup aprovado, com apresentação diferente para o Deck do oponente e do jogador local.",
      en: "The Deck area was reorganised to follow the approved mockup more closely, with a different presentation for the opponent and local player Decks."
    },
    sections: [
      {
        title: { pt: "Arena — Deck", en: "Arena — Deck" },
        items: {
          pt: [
            "O Deck do oponente agora aparece de forma compacta, sem a coluna de botões laterais.",
            "O Deck do jogador local passa a usar uma pilha à esquerda com três botões compactos à direita, seguindo o mockup do Photoshop.",
            "Os contadores e proporções foram reajustados para evitar botões e textos exagerados.",
            "A mão do jogador continua centralizada visualmente na arena."
          ],
          en: [
            "The opponent Deck is now shown in a compact format without the side button column.",
            "The local player Deck now uses a left-side pile with three compact buttons on the right, matching the Photoshop mockup.",
            "Counters and proportions were rebalanced to avoid oversized buttons and text.",
            "The player's hand remains visually centred in the arena."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0d",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Mockup Sizing Fix", en: "Deck Mockup Sizing Fix" },
    summary: {
      pt: "A área do Deck foi reajustada para remover o visual exagerado e ficar mais próxima do mockup original do Photoshop.",
      en: "The Deck area was resized to remove the oversized look and better match the original Photoshop mockup."
    },
    sections: [
      {
        title: { pt: "Arena — Deck e mão", en: "Arena — Deck and hand" },
        items: {
          pt: [
            "Os botões Revelar, Topo e Fundo foram reduzidos e reequilibrados para um visual mais fiel ao mockup.",
            "A pilha do Deck recebeu proporções mais controladas e mais próximas da referência aprovada.",
            "A mão do jogador foi mantida centralizada visualmente após o refinamento da lateral do Deck.",
            "O ajuste preserva a identidade visual monocromática do simulador."
          ],
          en: [
            "Reveal, Top and Bottom were reduced and rebalanced for a look closer to the mockup.",
            "The Deck pile received more controlled proportions closer to the approved reference.",
            "The player's hand remains visually centred after the Deck-side refinement.",
            "The adjustment preserves the simulator's monochrome visual identity."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0c",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Mockup Refinement", en: "Deck Mockup Refinement" },
    summary: {
      pt: "A área do Deck foi refinada para ficar mais fiel ao mockup, e a mão voltou a ficar visualmente centralizada na arena.",
      en: "The Deck area was refined to better match the mockup, and the hand fan is visually centred again in the arena."
    },
    sections: [
      {
        title: { pt: "Arena — Deck e mão", en: "Arena — Deck and hand" },
        items: {
          pt: [
            "A pilha do Deck agora segue de forma mais fiel o mockup aprovado, com apresentação vertical mais destacada.",
            "Os botões Revelar, Topo e Fundo receberam proporções e estilo mais próximos do layout de referência.",
            "A mão do jogador foi recentralizada visualmente após a mudança na área do Deck.",
            "A revisão mantém a identidade preto e branco do simulador e preserva as funções já existentes."
          ],
          en: [
            "The Deck pile now follows the approved mockup more closely with a stronger vertical presentation.",
            "Reveal, Top and Bottom received proportions and styling closer to the reference layout.",
            "The player's hand fan was visually re-centred after the Deck area changes.",
            "The revision preserves the simulator's black-and-white identity and keeps existing functionality intact."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0b",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Deck Stack Refresh", en: "Deck Stack Refresh" },
    summary: {
      pt: "Redesign visual da área do Deck na Arena, com pilha maior, contador central e botões Revelar/Topo/Fundo mais elegantes.",
      en: "Visual redesign for the Arena Deck area with a larger pile, centred counter and cleaner Reveal/Top/Bottom buttons."
    },
    sections: [
      {
        title: { pt: "Arena — Deck", en: "Arena — Deck" },
        items: {
          pt: [
            "A área do Deck foi redesenhada com base no mockup aprovado.",
            "A pilha do Deck agora aparece maior e com o número de cartas centralizado sobre a carta de verso.",
            "Os botões Revelar, Topo e Fundo foram reorganizados em uma coluna vertical com melhor leitura e acabamento visual.",
            "O visual continua monocromático, preservando a identidade do simulador sem perder clareza funcional."
          ],
          en: [
            "The Deck area was redesigned based on the approved mockup.",
            "The Deck pile is now larger and shows the card count centred over the card back.",
            "Reveal, Top and Bottom were reorganised into a vertical action column with cleaner readability and styling.",
            "The layout remains monochrome to preserve the simulator identity while improving functional clarity."
          ]
        }
      }
    ]
  },

  {
    version: "3.2.0",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Rules & Effects Expansion", en: "Rules & Effects Expansion" },
    summary: {
      pt: "Expansão da Rules Engine com uma janela real de Burst, mais efeitos estruturados automáticos e menos dependência de resolução manual.",
      en: "Rules Engine expansion with a real Burst window, more automatic structured effects and less reliance on manual resolution."
    },
    sections: [
      {
        title: { pt: "Burst e Mirage", en: "Burst and Mirage" },
        items: {
          pt: [
            "Bursts com condição Após sua Life diminuir agora detectam automaticamente a redução de Life causada por ataque não bloqueado.",
            "Quando essa condição é detectada, a partida abre uma janela de Burst com Ativar ou Passar antes de continuar.",
            "A ativação usa o timing estruturado burstLifeDecrease, permitindo que efeitos catalogados sejam resolvidos pela Effect Engine.",
            "Mirages agora resolvem automaticamente operações estruturadas ligadas ao momento em que são setadas."
          ],
          en: [
            "Bursts with an After your Life decreases condition now automatically detect Life loss caused by an unblocked attack.",
            "When the condition is detected, the match opens a Burst window with Activate or Pass before play continues.",
            "Activation uses the structured burstLifeDecrease timing so catalogued effects can be resolved by the Effect Engine.",
            "Mirages now automatically resolve structured operations tied to being set."
          ]
        }
      },
      {
        title: { pt: "Effect Engine", en: "Effect Engine" },
        items: {
          pt: [
            "A Engine ganhou suporte a setTurnProtection, incluindo limite de dano à Life por ataques de Spirits durante o turno.",
            "A Engine agora resolve discardOpponentSetBurst, enviando a Burst setada do oponente ao Trash quando um efeito estruturado exige isso.",
            "Novo teste de cobertura verifica se todos os tipos de operação estruturada presentes na database atual são reconhecidos pela Engine.",
            "A cobertura automatizada subiu de 65 para 71 testes."
          ],
          en: [
            "The Engine now supports setTurnProtection, including per-turn Life damage limits from Spirit attacks.",
            "The Engine now resolves discardOpponentSetBurst, sending the opponent's set Burst to Trash when required by a structured effect.",
            "A new coverage test checks that every structured operation type in the current database is recognized by the Engine.",
            "Automated coverage increased from 65 to 71 tests."
          ]
        }
      },
      {
        title: { pt: "Arena e interface", en: "Arena and interface" },
        items: {
          pt: [
            "A Reserve não exibe mais a caixa Origem do pagamento durante invocações.",
            "O Core Trash não exibe mais a caixa Pago X/Y durante pagamentos.",
            "O progresso de custo continua disponível no painel da jogada pendente, mantendo a Arena mais limpa.",
            "A nova janela de Burst segue a identidade visual monocromática e evita interromper a fluidez da Arena."
          ],
          en: [
            "Reserve no longer shows the Payment source box during summons.",
            "Core Trash no longer shows the Paid X/Y box during payments.",
            "Cost progress remains available in the pending-play panel, keeping the Arena cleaner.",
            "The new Burst window follows the monochrome visual identity without adding unnecessary visual noise."
          ]
        }
      }
    ]
  },

  {
    version: "3.1.9",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Card Interaction", en: "Card Interaction" },
    summary: {
      pt: "Interações mais fluidas para cartas e Cores, com clique inteligente na Reserve, hover/zoom mais rápido e feedback de drag-and-drop mais claro.",
      en: "Smoother card and Core interactions with smart Reserve clicks, faster hover/zoom and clearer drag-and-drop feedback."
    },
    sections: [
      {
        title: { pt: "Cores: clique ou arraste", en: "Cores: click or drag" },
        items: {
          pt: [
            "Durante uma invocação, clicar em Cores da Reserve paga primeiro o custo e depois coloca Cores na carta para o Lv mínimo.",
            "Depois do mínimo, novos cliques podem adicionar Cores extras para invocar em níveis maiores.",
            "Durante Magic/Flash, clicar em Cores da Reserve envia automaticamente os Cores necessários ao Core Trash.",
            "Clicar em Cores pagos no Core Trash durante uma jogada pendente desfaz o pagamento Core por Core.",
            "O drag manual continua disponível para quem prefere escolher o destino diretamente."
          ],
          en: [
            "During a summon, clicking Reserve Cores pays the cost first and then places Cores on the card for its minimum Level.",
            "After the minimum is met, further clicks can add extra Cores for higher-Level summons.",
            "During Magic/Flash, clicking Reserve Cores automatically sends the required Cores to Core Trash.",
            "Clicking paid Cores in Core Trash during a pending play undoes the payment one Core at a time.",
            "Manual dragging remains available for players who prefer choosing the destination directly."
          ]
        }
      },
      {
        title: { pt: "Interação das cartas", en: "Card interaction" },
        items: {
          pt: [
            "Hover/zoom abre mais rápido e aparece ao lado da carta sempre que possível.",
            "A mão recebeu animação leve de entrada para compras e novas cartas.",
            "Drag-and-drop ganhou feedback visual mais claro para campo, mão, deck, Trash e Burst.",
            "As animações respeitam prefers-reduced-motion para preservar acessibilidade e desempenho."
          ],
          en: [
            "Hover/zoom opens faster and appears beside the card whenever possible.",
            "The hand now has a light entry animation for draws and newly added cards.",
            "Drag-and-drop has clearer visual feedback for field, hand, deck, Trash and Burst.",
            "Animations respect prefers-reduced-motion for accessibility and performance."
          ]
        }
      }
    ]
  },

  {
    version: "3.1.8",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Core & Combat UX", en: "Core & Combat UX" },
    summary: {
      pt: "Pagamento de Cores mais claro, redução de custo mais legível e fluxo de ataque/bloqueio/Flash com feedback visual mais direto.",
      en: "Clearer Core payments, more readable cost reduction and a more direct attack/block/Flash flow."
    },
    sections: [
      {
        title: { pt: "Custo e Cores", en: "Cost and Cores" },
        items: {
          pt: [
            "Resumo de custo agora mostra Custo base − Redução = Custo final de forma visual.",
            "Pagamento e Cores mínimos possuem barras de progresso e mensagens de conclusão.",
            "Reserve e Core Trash recebem orientação contextual apenas enquanto existe pagamento pendente.",
            "A cor da carta aparece somente como acento sutil, mantendo a identidade preto e branco."
          ],
          en: [
            "Cost summary now shows Base cost − Reduction = Final cost visually.",
            "Payment and minimum Cores use progress bars and completion feedback.",
            "Reserve and Core Trash show contextual guidance only while a payment is pending.",
            "Card color is used only as a subtle accent, preserving the black-and-white identity."
          ]
        }
      },
      {
        title: { pt: "Combate e Flash", en: "Combat and Flash" },
        items: {
          pt: [
            "Uma ligação visual conecta o atacante ao bloqueador atual ou ao Life em ataques diretos.",
            "Block Step orienta o jogador a escolher apenas bloqueadores válidos fornecidos pela Rules Engine.",
            "Flash Timing ganhou instruções mais claras de prioridade e ação.",
            "O painel central de batalha ficou mais legível sem aumentar o peso visual da Arena."
          ],
          en: [
            "A visual link connects the attacker to the current blocker or Life on direct attacks.",
            "Block Step guides the player toward legal blockers supplied by the Rules Engine.",
            "Flash Timing has clearer priority and action instructions.",
            "The central battle panel is easier to read without adding visual weight to the Arena."
          ]
        }
      }
    ]
  },

  {
    version: "3.1.7",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Arena Visual Polish", en: "Arena Visual Polish" },
    summary: {
      pt: "Refinamento visual da Arena clássica com cartas mais legíveis, Brave combinado mais claro e feedback de combate ligado à cor da carta.",
      en: "Classic Arena visual refinement with clearer field cards, improved Brave presentation and card-color combat feedback."
    },
    sections: [
      {
        title: { pt: "Cartas em campo", en: "Field cards" },
        items: {
          pt: [
            "Tamanho e espaçamento das cartas foram refinados para melhor encaixe sem perder legibilidade.",
            "LV e BP continuam externos à carta e permanecem retos mesmo quando a carta está Exhausted.",
            "Cartas selecionadas usam um destaque sutil sem moldura branca ao redor do slot.",
            "A camada das cartas pode ultrapassar visualmente a moldura da zona, evitando cortes de Brave, glow e status."
          ],
          en: [
            "Field card size and spacing were refined for a cleaner fit without sacrificing readability.",
            "LV and BP remain outside the card and stay upright while the card is Exhausted.",
            "Selected cards use a subtle highlight without a white frame around the slot.",
            "Card presentation can visually extend beyond the zone border, preventing Brave, glow and status clipping."
          ]
        }
      },
      {
        title: { pt: "Brave, raridade e combate", en: "Brave, rarity and combat" },
        items: {
          pt: [
            "Brave combinado aparece atrás do host com deslocamento mais legível e tag BRAVE menor.",
            "Glows de raridade alta continuam seguindo a cor principal da carta.",
            "Atacante e bloqueador recebem destaque pela própria cor da carta, sem abandonar a identidade preto e branco.",
            "Durante o Block Step, bloqueadores válidos recebem uma indicação visual discreta baseada diretamente na Rules Engine."
          ],
          en: [
            "Combined Braves sit behind their host with a clearer offset and a smaller BRAVE tag.",
            "High-rarity glows continue to follow the card's primary color.",
            "Attacker and blocker emphasis follows the card's own color while preserving the black-and-white identity.",
            "During the Block Step, legal blockers get a subtle visual cue derived directly from the Rules Engine."
          ]
        }
      }
    ]
  },

  {
    version: "3.1.2",
    date: { pt: "23/09/2026", en: "09/23/2026" },
    title: { pt: "Arena 2D v3.1", en: "2D Arena v3.1" },
    summary: {
      pt: "Nova apresentação de partida em tela cheia, com mão em leque, preview ampliado e playmat mais próximo de um TCG digital.",
      en: "New fullscreen match presentation with a fanned hand, larger card preview and a playmat closer to a digital TCG."
    },
    sections: [
      {
        title: { pt: "Arena e cartas", en: "Arena and cards" },
        items: {
          pt: [
            "Mesa 2D redesenhada sem dependências 3D.",
            "Mão em leque com elevação e ampliação no hover.",
            "Preview grande da carta com nome, código e tipo.",
            "HUD, Deck, Trash, Burst, Reserve e Core Trash mais integrados à arena."
          ],
          en: [
            "Redesigned 2D playmat with no 3D dependencies.",
            "Fanned hand with hover lift and enlargement.",
            "Large card preview with name, code and type.",
            "HUD, Deck, Trash, Burst, Reserve and Core Trash are more integrated into the arena."
          ]
        }
      },
      {
        title: { pt: "Fluxo da partida", en: "Match flow" },
        items: {
          pt: [
            "Avanço de fase disponível na barra superior.",
            "Painéis Carta e Turno podem ser recolhidos para ampliar o campo.",
            "Estados de batalha e cartas exauridas ganharam feedback visual reforçado.",
            "Rules Engine e protocolo Online permanecem na mesma base da v3."
          ],
          en: [
            "Phase advance is available from the top bar.",
            "Card and Turn docks can be collapsed to maximize the field.",
            "Battle focus and exhausted cards have stronger visual feedback.",
            "Rules Engine and Online protocol remain on the same v3 foundation."
          ]
        }
      }
    ]
  },

  {
    version: "3.0.0",
    date: { pt: "10/09/2026", en: "09/10/2026" },
    title: { pt: "Eternal Rebuild v3", en: "Eternal Rebuild v3" },
    summary: {
      pt: "Rebuild independente com foco em usabilidade, manutenção, visual e uma estrutura Online muito mais simples de configurar.",
      en: "Independent rebuild focused on usability, maintainability, visuals and a much simpler Online configuration structure."
    },
    sections: [
      {
        title: { pt: "Experiência", en: "Experience" },
        items: {
          pt: [
            "Novo menu principal com Partida Local e Online como ações prioritárias.",
            "Camada visual v3 unificada para reduzir conflitos entre hotfixes de interface.",
            "Arena reorganizada em Braves/Other, Spirits/Ultimates e Nexus, com foco maior nas cartas.",
            "Sequência Eternal e painéis laterais redesenhados para leitura mais rápida."
          ],
          en: [
            "New main menu prioritizing Local and Online play.",
            "Unified v3 visual layer to reduce conflicts between interface hotfixes.",
            "Arena organized into Braves/Other, Spirits/Ultimates and Nexus with stronger card focus.",
            "Eternal Sequence and side panels redesigned for faster reading."
          ]
        }
      },
      {
        title: { pt: "Engine e cartas", en: "Engine and cards" },
        items: {
          pt: [
            "Núcleo de regras compartilhado por Partida Local e Online.",
            "Effect Engine e fila de decisões integrados à base v3.",
            "Suporte avançado a Brave, Ultimate, Ultimate Trigger, Critical Hit, XU Trigger e Trigger Counter.",
            "Deck Builder mantém paginação de 21 cartas, importação/exportação e detalhes 3D."
          ],
          en: [
            "Shared rules core for Local and Online matches.",
            "Effect Engine and decision queue integrated into the v3 base.",
            "Advanced support for Brave, Ultimate, Ultimate Trigger, Critical Hit, XU Trigger and Trigger Counter.",
            "Deck Builder keeps 21-card pagination, import/export and 3D details."
          ]
        }
      },
      {
        title: { pt: "Online simplificado", en: "Simplified Online" },
        items: {
          pt: [
            "Endereço do servidor isolado em public/config/online-config.js.",
            "CONFIGURAR-ONLINE.bat troca o endereço com poucos cliques.",
            "INICIAR-ONLINE.bat prepara e inicia o servidor Node/Socket.IO.",
            "TESTAR-ONLINE.bat consulta /health para confirmar se o servidor está acessível.",
            "Servidor escuta 0.0.0.0 por padrão para facilitar testes na mesma rede local."
          ],
          en: [
            "Server address isolated in public/config/online-config.js.",
            "CONFIGURAR-ONLINE.bat changes the address in a few clicks.",
            "INICIAR-ONLINE.bat prepares and starts the Node/Socket.IO server.",
            "TESTAR-ONLINE.bat checks /health to confirm server reachability.",
            "Server listens on 0.0.0.0 by default for easier LAN testing."
          ]
        }
      }
    ]
  },

  {
    version: "2.4.0",
    date: {
      pt: "09/09/2026",
      en: "09/09/2026"
    },
    title: {
      pt: "Interface, Perfil e BSC49",
      en: "Interface, Profile and BSC49"
    },
    summary: {
      pt:
        "Grande atualização visual do simulador, melhorias na biblioteca de decks e conclusão da coleção BSC49.",
      en:
        "Major visual update for the simulator, deck library improvements and completion of the BSC49 set."
    },
    sections: [
      {
        title: {
          pt: "Interface",
          en: "Interface"
        },
        items: {
          pt: [
            "Redesign completo da tela de Partida Local.",
            "Redesign da tela de Partida Online mantendo matchmaking, salas privadas e seleção de cor.",
            "Nova identidade visual compartilhada entre as principais telas do simulador.",
            "Melhorias de responsividade, hierarquia visual, painéis, botões e estados de conexão."
          ],
          en: [
            "Complete redesign of the Local Match setup screen.",
            "Redesign of the Online Match screen while preserving matchmaking, private rooms and player colors.",
            "New shared visual identity across the main simulator screens.",
            "Improved responsiveness, visual hierarchy, panels, buttons and connection states."
          ]
        }
      },
      {
        title: {
          pt: "Meus Decks",
          en: "My Decks"
        },
        items: {
          pt: [
            "Nova biblioteca de decks com layout híbrido entre o visual antigo e o redesign atual.",
            "Cartas escolhidas como capa voltaram a ter grande destaque visual.",
            "Adicionados busca, total de decks, decks válidos e total de cartas.",
            "Cada deck agora mostra status de validação, cartas únicas, total de cartas e data de atualização.",
            "Corrigido o carregamento de algumas capas usando coverCardId e resolveCardImage().",
            "Adicionado fallback seguro para decks antigos ou imagens ausentes."
          ],
          en: [
            "New deck library combining the previous cover-focused layout with the current redesign.",
            "Selected cover cards once again receive strong visual emphasis.",
            "Added search, deck count, valid deck count and total card count.",
            "Each deck now shows validation status, unique cards, total cards and update date.",
            "Fixed some deck covers by resolving coverCardId through resolveCardImage().",
            "Added a safe fallback for older decks or missing images."
          ]
        }
      },
      {
        title: {
          pt: "Perfil e Conta",
          en: "Profile and Account"
        },
        items: {
          pt: [
            "Redesign completo das áreas Meu Perfil e Conta Battle Spirits.",
            "Perfil com banner, avatar e identidade do jogador reorganizados.",
            "Melhorias nas abas Perfil, Amigos e Chat.",
            "Nova apresentação para nome de exibição, username, bio e estado de salvamento.",
            "Conta reorganizada como hub de identidade e sincronização com a nuvem.",
            "Ações de envio e download de Perfil e Decks agora ficam separadas e mais claras.",
            "Ajustado o topo do Perfil para remover informações duplicadas e melhorar o alinhamento."
          ],
          en: [
            "Complete redesign of My Profile and Battle Spirits Account.",
            "Profile banner, avatar and player identity have been reorganized.",
            "Improved Profile, Friends and Chat tabs.",
            "New presentation for display name, username, bio and save state.",
            "Account page reorganized as an identity and cloud sync hub.",
            "Profile and Deck upload/download actions are now clearer and separated.",
            "Adjusted the Profile header to remove duplicate information and improve alignment."
          ]
        }
      },
      {
        title: {
          pt: "BSC49 - Dream Booster: Stars Around",
          en: "BSC49 - Dream Booster: Stars Around"
        },
        items: {
          pt: [
            "Coleção BSC49 concluída na database do simulador.",
            "102 cartas numeradas catalogadas.",
            "3 Campaign Cards catalogadas.",
            "12 XV Rare catalogadas.",
            "Total de 117 IDs adicionados à coleção.",
            "Dados preparados em inglês e português com caminhos de imagem integrados ao cards-database."
          ],
          en: [
            "BSC49 set completed in the simulator database.",
            "102 numbered cards catalogued.",
            "3 Campaign Cards catalogued.",
            "12 XV Rare cards catalogued.",
            "117 total IDs added to the set.",
            "Data prepared in English and Portuguese with image paths integrated into cards-database."
          ]
        }
      },
      {
        title: {
          pt: "Detalhes e correções",
          en: "Details and fixes"
        },
        items: {
          pt: [
            "Melhorado o destaque visual das cartas ao passar o mouse em visualizações de detalhes.",
            "Ajustadas capas, glows e estados visuais para manter consistência com o restante do simulador.",
            "Alterações visuais foram separadas da lógica de jogo e rede sempre que possível."
          ],
          en: [
            "Improved card highlighting when hovering over card detail previews.",
            "Adjusted covers, glows and visual states to remain consistent with the rest of the simulator.",
            "Visual changes were kept separate from game and network logic whenever possible."
          ]
        }
      }
    ]
  },

  {
    version: "2.3.0",
    date: {
      pt: "08/09/2026",
      en: "08/09/2026"
    },
    title: {
      pt: "Online e recursos sociais",
      en: "Online and social features"
    },
    summary: {
      pt:
        "Expansão do modo Online 1v1, matchmaking, identidade dos jogadores e recursos sociais.",
      en:
        "Expanded Online 1v1, matchmaking, player identity and social features."
    },
    sections: [
      {
        title: {
          pt: "Online 1v1",
          en: "Online 1v1"
        },
        items: {
          pt: [
            "Matchmaking para encontrar outro jogador automaticamente.",
            "Criação de salas privadas e entrada por código.",
            "Seleção de cor individual para cada jogador.",
            "Melhorias de conexão, reconexão e estado das salas.",
            "Chat e sincronização da partida online."
          ],
          en: [
            "Matchmaking to automatically find another player.",
            "Private room creation and room-code joining.",
            "Individual player color selection.",
            "Connection, reconnection and room-state improvements.",
            "Online match chat and synchronization."
          ]
        }
      },
      {
        title: {
          pt: "Simulador",
          en: "Simulator"
        },
        items: {
          pt: [
            "Melhorias no fluxo de batalha e Flash Timing.",
            "Aprimoramentos na movimentação manual de Cores.",
            "Melhorias de interface para cartas, campo e painéis laterais."
          ],
          en: [
            "Battle flow and Flash Timing improvements.",
            "Improvements to manual Core movement.",
            "Interface improvements for cards, battlefield and side panels."
          ]
        }
      }
    ]
  },

  {
    version: "2.2.0",
    date: {
      pt: "07/09/2026",
      en: "07/09/2026"
    },
    title: {
      pt: "Base estável",
      en: "Stable baseline"
    },
    summary: {
      pt:
        "Consolidação da base estável do Battle Spirits Eternal Simulator.",
      en:
        "Consolidation of the stable Battle Spirits Eternal Simulator baseline."
    },
    sections: [
      {
        title: {
          pt: "Base do projeto",
          en: "Project baseline"
        },
        items: {
          pt: [
            "Simulador local, Deck Builder e database consolidados em uma única base.",
            "Online 1v1 integrado ao projeto.",
            "Estrutura preparada para futuras atualizações e distribuição desktop."
          ],
          en: [
            "Local simulator, Deck Builder and database consolidated into a single baseline.",
            "Online 1v1 integrated into the project.",
            "Structure prepared for future updates and desktop distribution."
          ]
        }
      }
    ]
  }
];


export default function ProjectInfoButtons() {
  const {
    language
  } =
    useLanguage();

  const pt =
    language !== "en";

  const locale =
    pt
      ? "pt"
      : "en";

  const [
    modal,
    setModal
  ] =
    useState(
      null
    );

  const [
    selectedVersion,
    setSelectedVersion
  ] =
    useState(
      PATCHES[0].version
    );


  const selectedPatch =
    useMemo(
      () =>
        PATCHES.find(
          (patch) =>
            patch.version ===
            selectedVersion
        ) ||
        PATCHES[0],
      [
        selectedVersion
      ]
    );


  useEffect(
    () => {
      if (!modal) {
        return;
      }

      function onKeyDown(
        event
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setModal(
            null
          );
        }
      }

      window.addEventListener(
        "keydown",
        onKeyDown
      );

      return () =>
        window.removeEventListener(
          "keydown",
          onKeyDown
        );
    },
    [
      modal
    ]
  );


  function closeOnBackdrop(
    event
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      setModal(
        null
      );
    }
  }


  return (
    <>
      <div className="project-info-buttons">

        <button
          type="button"
          className="project-menu-card project-menu-about"
          onClick={() =>
            setModal(
              "about"
            )
          }
        >
          <span className="project-menu-icon">i</span>
          <span className="project-menu-copy">
            <b>
              {pt
                ? "Sobre o projeto"
                : "About the project"}
            </b>
            <small>
              {pt
                ? "Conheça mais"
                : "Learn more"}
            </small>
          </span>
          <i className="project-menu-arrow">›</i>
        </button>


        <button
          type="button"
          className="project-menu-card project-menu-patch"
          onClick={() => {
            setSelectedVersion(
              PATCHES[0].version
            );

            setModal(
              "patch"
            );
          }}
        >
          <span className="project-menu-icon">▤</span>
          <span className="project-menu-copy">
            <b>
              Patch Notes
            </b>
            <small>
              {pt
                ? "Histórico de atualizações"
                : "Update history"}
            </small>
          </span>
          <i className="project-menu-arrow">›</i>
        </button>

      </div>


      {modal && (
        <div
          className="project-modal-backdrop"
          role="presentation"
          onMouseDown={
            closeOnBackdrop
          }
        >

          <section
            className="project-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "patch"
                ? "Patch Notes"
                : (
                  pt
                    ? "Sobre o projeto"
                    : "About the project"
                )
            }
          >

            <header>

              <div>
                <span className="eyebrow">
                  BATTLE SPIRITS
                </span>

                <h2>
                  {modal === "patch"
                    ? "Patch Notes"
                    : (
                      pt
                        ? "Sobre o projeto"
                        : "About the project"
                    )}
                </h2>
              </div>


              <button
                type="button"
                className="ghost"
                onClick={() =>
                  setModal(
                    null
                  )
                }
              >
                {pt
                  ? "Fechar"
                  : "Close"}
              </button>

            </header>


            {modal === "about" ? (
              <div className="about-content">

                <div className="project-version-badge">
                  Battle Spirits Eternal Simulator v{PATCHES[0].version}
                </div>


                <p>
                  {pt
                    ? "Battle Spirits Eternal Simulator é um projeto de fã não oficial criado para jogar, testar decks, catalogar cartas e preservar diferentes gerações do Battle Spirits original."
                    : "Battle Spirits Eternal Simulator is an unofficial fan project created to play, test decks, catalogue cards and preserve different generations of the original Battle Spirits game."}
                </p>


                <h3>
                  {pt
                    ? "Objetivo"
                    : "Goal"}
                </h3>

                <p>
                  {pt
                    ? "O projeto busca reunir simulador local, partidas online, Deck Builder, database bilíngue e recursos de perfil em uma única aplicação."
                    : "The project aims to combine local simulation, online matches, Deck Builder, a bilingual database and profile features in a single application."}
                </p>


                <h3>
                  {pt
                    ? "Desenvolvimento"
                    : "Development"}
                </h3>

                <p>
                  {pt
                    ? "O simulador está em desenvolvimento contínuo. Novas cartas, regras, efeitos e melhorias de interface são adicionados progressivamente."
                    : "The simulator is under continuous development. New cards, rules, effects and interface improvements are added progressively."}
                </p>


                <strong className="about-thanks">
                  {pt
                    ? "Obrigado por acompanhar o desenvolvimento."
                    : "Thank you for following the development."}
                </strong>


                <small className="about-disclaimer">
                  Battle Spirits é propriedade da BANDAI.
                  {" "}
                  {pt
                    ? "Este é um projeto de fã não oficial e sem afiliação com a BANDAI."
                    : "This is an unofficial fan project and is not affiliated with BANDAI."}
                </small>

              </div>
            ) : (
              <div className="patch-notes-layout">

                <aside className="patch-version-list">

                  {PATCHES.map(
                    (
                      patch
                    ) => (
                      <button
                        type="button"
                        key={
                          patch.version
                        }
                        className={
                          selectedPatch.version ===
                          patch.version
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedVersion(
                            patch.version
                          )
                        }
                      >
                        <b>
                          v{patch.version}
                        </b>

                        <span>
                          {
                            patch.title[
                              locale
                            ]
                          }
                        </span>
                      </button>
                    )
                  )}

                </aside>


                <article className="patch-content">

                  <span className="eyebrow">
                    LATEST UPDATE
                  </span>

                  <h2>
                    v{selectedPatch.version}
                  </h2>

                  <h3>
                    {
                      selectedPatch.title[
                        locale
                      ]
                    }
                  </h3>

                  <small>
                    {
                      selectedPatch.date[
                        locale
                      ]
                    }
                  </small>


                  <p>
                    {
                      selectedPatch.summary[
                        locale
                      ]
                    }
                  </p>


                  {selectedPatch.sections.map(
                    (
                      section
                    ) => (
                      <section
                        className="patch-section"
                        key={
                          section.title[
                            locale
                          ]
                        }
                      >
                        <h3>
                          {
                            section.title[
                              locale
                            ]
                          }
                        </h3>

                        <ul>
                          {
                            section.items[
                              locale
                            ].map(
                              (
                                item
                              ) => (
                                <li
                                  key={
                                    item
                                  }
                                >
                                  {item}
                                </li>
                              )
                            )
                          }
                        </ul>
                      </section>
                    )
                  )}

                </article>

              </div>
            )}

          </section>

        </div>
      )}
    </>
  );
}
