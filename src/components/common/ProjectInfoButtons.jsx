import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n.jsx";
import "../../styles/theme/v230.css";

const PATCHES = [
  {
    version: "4.7.4",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Cliente Desktop Único & Auto Update", en: "Single Desktop Client & Auto Update" },
    summary: {
      pt: "O cliente Desktop passa a expor apenas o executável principal do jogo; atualização e conexão online permanecem integradas ao próprio aplicativo.",
      en: "The Desktop client now exposes only the main game executable; updating and online connectivity remain integrated into the application itself."
    },
    sections: [
      {
        title: { pt: "Distribuição Desktop", en: "Desktop distribution" },
        items: {
          pt: [
            "Os builds Windows não criam mais cópias separadas Server.exe ou Updater.exe ao lado do jogo.",
            "O updater continua dentro do executável principal e passa a iniciar automaticamente a instalação quando encontra uma release mais nova.",
            "No Windows, upgrades usam o instalador NSIS em modo silencioso; macOS e Linux continuam usando os fluxos internos de substituição do aplicativo.",
            "O servidor multiplayer continua remoto e não é distribuído como aplicativo que o jogador possa abrir manualmente."
          ],
          en: [
            "Windows builds no longer create separate Server.exe or Updater.exe copies beside the game.",
            "The updater remains inside the main executable and automatically starts installation when a newer release is found.",
            "On Windows, upgrades use the NSIS installer in silent mode; macOS and Linux keep their internal application replacement flows.",
            "The multiplayer server remains remote and is not distributed as an application players can launch manually."
          ]
        }
      }
    ]
  },
  {
    version: "4.7.1",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Hotfix de publicação Desktop", en: "Desktop Publishing Hotfix" },
    summary: {
      pt: "Corrige o pipeline do GitHub Actions para que Windows, macOS e Linux apenas gerem seus artefatos; a publicação acontece uma única vez no job final.",
      en: "Fixes the GitHub Actions pipeline so Windows, macOS and Linux only build artifacts; publishing now happens once in the final job."
    },
    sections: [
      {
        title: { pt: "Release unificada", en: "Unified release" },
        items: {
          pt: [
            "electron-builder passa a usar --publish never nos três builds de plataforma, evitando publicação implícita sem GH_TOKEN.",
            "Os jobs Windows, macOS e Linux enviam somente seus artefatos para o GitHub Actions.",
            "O job publish-desktop continua sendo o único responsável por criar ou atualizar a GitHub Release da versão."
          ],
          en: [
            "electron-builder now uses --publish never on all three platform builds, preventing implicit publishing without GH_TOKEN.",
            "Windows, macOS and Linux jobs only upload their artifacts to GitHub Actions.",
            "The publish-desktop job remains solely responsible for creating or updating the GitHub Release for the version."
          ]
        }
      }
    ]
  },
  {
    version: "4.7.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Nova identidade KAIHOU!", en: "New KAIHOU! Identity" },
    summary: {
      pt: "O projeto passa a adotar oficialmente o nome Battle Spirits: KAIHOU! Simulator, com favicon e ícones Desktop próprios.",
      en: "The project officially adopts the Battle Spirits: KAIHOU! Simulator name, with custom favicon and Desktop application icons."
    },
    sections: [
      {
        title: { pt: "Branding unificado", en: "Unified branding" },
        items: {
          pt: [
            "Nome oficial atualizado nas áreas globais do simulador e nos metadados do aplicativo.",
            "A aba do navegador agora exibe Gate Open, KAIHOU! e usa o novo favicon.",
            "Windows, macOS e Linux passam a usar a nova logo nos pacotes Desktop."
          ],
          en: [
            "The official name has been updated across global simulator surfaces and application metadata.",
            "The browser tab now displays Gate Open, KAIHOU! and uses the new favicon.",
            "Windows, macOS and Linux Desktop packages now use the new application logo."
          ]
        }
      }
    ]
  },
  {
    version: "4.6.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Segurança Desktop & Backend", en: "Desktop & Backend Security" },
    summary: {
      pt: "Clientes Desktop recebem uma camada extra de proteção em produção, enquanto o backend reforça a validação autoritativa de economia e administração.",
      en: "Desktop clients gain an additional production protection layer while the backend strengthens authoritative economy and administration validation."
    },
    sections: [
      {
        title: { pt: "Desktop protegido", en: "Hardened Desktop" },
        items: {
          pt: [
            "Windows, macOS e Linux continuam no mesmo pipeline de release, sempre gerados com NODE_ENV=production.",
            "Código do Electron é bundleado/minificado antes do empacotamento; fontes originais, server e arquivos .env não entram no cliente final.",
            "app.asar passa a conter renderer, configuração pública e runtime Desktop; DevTools, F12 e atalhos de inspeção ficam bloqueados no build final."
          ],
          en: [
            "Windows, macOS and Linux remain in the same release pipeline and are always generated with NODE_ENV=production.",
            "Electron code is bundled/minified before packaging; original sources, server code and .env files are excluded from the final client.",
            "app.asar contains the renderer, public configuration and Desktop runtime; DevTools, F12 and inspection shortcuts are blocked in release builds."
          ]
        }
      },
      {
        title: { pt: "Backend autoritativo", en: "Authoritative Backend" },
        items: {
          pt: [
            "A nova camada de segurança reforça o isolamento das informações privadas de economia e progresso de cada conta.",
            "Compras, craft e comandos administrativos permanecem validados pelo backend; o status de Admin é derivado da sessão autenticada, nunca de flags do cliente.",
            "Settlement Ranked continua exclusivo do backend, e auditorias de release passam a procurar segredos privados e configurações inseguras."
          ],
          en: [
            "The new security layer strengthens isolation of each account’s private economy and progression data.",
            "Purchases, crafting and administrative commands remain backend-validated; Admin status comes from the authenticated session, never client flags.",
            "Ranked settlement remains backend-only, and release audits now scan for private secrets and insecure packaging settings."
          ]
        }
      }
    ]
  },
  {
    version: "4.5.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Mobile, Touch & Onboarding UX", en: "Mobile, Touch & Onboarding UX" },
    summary: {
      pt: "A interface recebe uma camada responsiva global, gameplay por toque, docks mobile, cursores temáticos e um onboarding de Starter Decks totalmente reformulado.",
      en: "The interface gains a global responsive layer, touch gameplay, mobile docks, themed cursors and a completely revamped Starter Deck onboarding."
    },
    sections: [
      {
        title: { pt: "Mobile & Interação", en: "Mobile & Interaction" },
        items: {
          pt: [
            "Layouts principais passam a se adaptar a desktop, tablet e smartphone sem depender de hover.",
            "A Arena usa Pointer Events para mouse, caneta e toque; cartas podem ser arrastadas com o dedo e os docks Carta/Turno viram painéis retráteis acessíveis por botões.",
            "Cursores temáticos globais e feedback de glow foram centralizados em variáveis CSS para futuras temporadas e eventos."
          ],
          en: [
            "Main layouts now adapt to desktop, tablet and smartphone without relying on hover.",
            "The Arena uses Pointer Events for mouse, pen and touch; cards can be dragged with a finger and Card/Turn docks become retractable panels controlled by buttons.",
            "Global themed cursors and glow feedback are centralized in CSS variables for future seasons and events."
          ]
        }
      },
      {
        title: { pt: "Onboarding & Proteção de Assets", en: "Onboarding & Asset Protection" },
        items: {
          pt: [
            "A escolha inicial de Starter Decks agora usa carrossel horizontal com swipe, carta capa em destaque, Decklist completa e Card Details Modal em todas as cartas.",
            "Confirm Selection só é liberado com exatamente três decks selecionados.",
            "Context menu, drag nativo de mídia e touch callout foram bloqueados como proteção de conveniência contra download direto de assets no cliente público."
          ],
          en: [
            "Starter Deck onboarding now uses a horizontal swipe carousel with prominent cover cards, full Decklist inspection and the Card Details Modal on every card.",
            "Confirm Selection is enabled only when exactly three decks are selected.",
            "Context menus, native media dragging and touch callouts are blocked as convenience protection against direct asset downloads in the public client."
          ]
        }
      }
    ]
  },
  {
    version: "4.4.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Web + Desktop Unificados", en: "Unified Web + Desktop" },
    summary: {
      pt: "O mesmo update agora prepara a Web e gera automaticamente clientes Desktop para Windows, macOS e Linux.",
      en: "The same update now prepares the Web build and automatically generates Desktop clients for Windows, macOS and Linux."
    },
    sections: [
      {
        title: { pt: "Desktop", en: "Desktop" },
        items: {
          pt: [
            "A versão Web passa a exibir Download Desktop somente no navegador.",
            "Windows recebe instalador NSIS; macOS recebe builds Apple Silicon e Intel; Linux recebe AppImage e .deb.",
            "Clientes Desktop verificam automaticamente a release mais recente e usam a mesma conta, coleção e progresso da Web."
          ],
          en: [
            "The Web version now shows Download Desktop only in the browser.",
            "Windows gets an NSIS installer; macOS gets Apple Silicon and Intel builds; Linux gets AppImage and .deb.",
            "Desktop clients automatically check the latest release and use the same account, collection and progress as the Web version."
          ]
        }
      },
      {
        title: { pt: "Release unificada", en: "Unified release" },
        items: {
          pt: [
            "Um único push no GitHub dispara a validação e os builds Desktop da mesma versão.",
            "O preflight do Cloudflare bloqueia assets individuais acima de 25 MiB antes do push.",
            "O posicionamento aprovado do perfil local na tela Ranked foi preservado."
          ],
          en: [
            "A single GitHub push triggers validation and Desktop builds for the same version.",
            "Cloudflare preflight blocks individual assets above 25 MiB before the push.",
            "The approved local profile position on the Ranked screen was preserved."
          ]
        }
      }
    ]
  },
  {
    version: "4.3.2",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Correção visual do Admin Panel", en: "Admin Panel Visual Fix" },
    summary: {
      pt: "Corrige a ordem de camadas do painel administrativo para exibir corretamente jogadores, carteira, ajustes de economia e status.",
      en: "Fixes the Admin Panel layer order so players, wallet, economy controls and account status are displayed correctly."
    },
    sections: [
      {
        title: { pt: "Correção", en: "Fix" },
        items: {
          pt: [
            "O fundo cinematográfico não encobre mais a interface do Admin Panel.",
            "Lista de jogadores, Spirit Coins, Craft Coins, ajustes e status voltam a ficar totalmente visíveis.",
            "A autenticação e as permissões administrativas existentes foram preservadas."
          ],
          en: [
            "The cinematic background no longer covers the Admin Panel interface.",
            "Player list, Spirit Coins, Craft Coins, adjustments and status are fully visible again.",
            "Existing administrative authentication and permissions were preserved."
          ]
        }
      }
    ]
  },
  {
    version: "4.3.1",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Hotfix do Admin Panel", en: "Admin Panel Hotfix" },
    summary: {
      pt: "Corrige a abertura de Settings para contas owner/admin e restaura o acesso ao Admin Panel.",
      en: "Fixes Settings for owner/admin accounts and restores access to the Admin Panel."
    },
    sections: [
      {
        title: { pt: "Correção", en: "Fix" },
        items: {
          pt: [
            "Contas owner/admin não causam mais erro ao abrir Settings.",
            "O botão Admin Panel recebe corretamente a ação de navegação definida pelo aplicativo.",
            "As autorizações administrativas continuam protegidas e validadas pelo sistema."
          ],
          en: [
            "Owner/admin accounts no longer crash when opening Settings.",
            "The Admin Panel button now correctly receives the navigation action defined by the app.",
            "Administrative authorization remains protected and validated by the system."
          ]
        }
      }
    ]
  },
  {
    version: "4.3.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Crafting, Fundos Dinâmicos & Admin Panel", en: "Crafting, Dynamic Backgrounds & Admin Panel" },
    summary: {
      pt: "A economia recebe crafting de cartas, a interface ganha vídeos de fundo opcionais e o sistema passa a contar com administração restrita de gameplay/economia.",
      en: "The economy gains card crafting, the interface gets optional video backgrounds and the system receives restricted gameplay/economy administration."
    },
    sections: [
      {
        title: { pt: "Shop, Cartas & Interface", en: "Store, Cards & Interface" },
        items: {
          pt: [
            "Cartas do Card Preview e da abertura de packs agora abrem a mesma janela de detalhes usada no Deck Builder.",
            "O modal de carta permite forjar cópias com Craft Coins; o custo varia por raridade e cópias após a primeira recebem 25% de desconto.",
            "A Shop passa a ficar fixa na viewport, com scroll apenas nos catálogos internos, e os controles de ícone receberam correções de alinhamento."
          ],
          en: [
            "Cards in Card Preview and pack opening now open the same detail window used by Deck Builder.",
            "The card modal can craft copies with Craft Coins; cost scales by rarity and copies after the first receive a 25% discount.",
            "The Store now stays fixed to the viewport with scrolling limited to internal catalogs, and icon controls received alignment fixes."
          ]
        }
      },
      {
        title: { pt: "Fundos & Administração", en: "Backgrounds & Administration" },
        items: {
          pt: [
            "Settings agora permite alternar entre wallpapers estáticos e vídeos MP4 em loop, sempre sem som e com o degradê de navegação preservado.",
            "O Admin Panel usa autorização segura para ajustar Spirit Coins, Craft Coins e status de gameplay sem expor dados privados.",
            "A rotina de release passa a incluir verificação de integridade, limpeza de arquivos redundantes e auditoria de conteúdo técnico visível ao jogador."
          ],
          en: [
            "Settings can now switch between static wallpapers and muted looping MP4 backgrounds while preserving the navigation gradient.",
            "The Admin Panel uses secure authorization to adjust Spirit Coins, Craft Coins and gameplay status without exposing private data.",
            "The release routine now includes integrity checks, redundant-file cleanup and auditing of technical content visible to players."
          ]
        }
      }
    ]
  },
  {
    version: "4.2.2",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Preview, Reveal & Catálogo por Sagas", en: "Preview, Reveal & Saga Catalog" },
    summary: {
      pt: "A Shop ganha Card Preview visual completo, abertura de produtos inspirada no Vanguard DD2 e organização por sagas/eras.",
      en: "The Shop gains a complete visual Card Preview, Vanguard DD2-inspired product reveals and saga/era organization."
    },
    sections: [
      {
        title: { pt: "Shop & Abertura", en: "Shop & Reveal" },
        items: {
          pt: [
            "O Card Preview agora exibe o pool completo em galeria visual com ownership x/6 em cada carta.",
            "Após a compra, produtos com cartas entram em uma sequência de reveal: cartas novas mostram NEW! + GET ×1; duplicatas mostram os Craft Coins gerados; overflow em 6/6 é marcado como convertido.",
            "BSC49 passa a abrir 9 cartas por pack; PC01 e PC02 passam a funcionar como Premium Card Sets de conteúdo fixo."
          ],
          en: [
            "Card Preview now displays the full pool as a visual gallery with x/6 ownership on every card.",
            "After purchase, card products enter a reveal sequence: new cards show NEW! + GET ×1; duplicates show generated Craft Coins; 6/6 overflow is marked as converted.",
            "BSC49 now opens 9 cards per pack; PC01 and PC02 now behave as fixed-content Premium Card Sets."
          ]
        }
      },
      {
        title: { pt: "Sagas & QA", en: "Sagas & QA" },
        items: {
          pt: [
            "Boosters e Decks agora podem ser filtrados por saga/era na lateral da Shop.",
            "A organização da Shop foi preparada para crescer junto do catálogo de cartas.",
            "A arquitetura de DevMode/Admin foi documentada para implementação futura; nenhum comando administrativo foi ativado nesta versão."
          ],
          en: [
            "Boosters and Decks can now be filtered by saga/era from the Store sidebar.",
            "The Store organization is prepared to grow together with the card catalog.",
            "The DevMode/Admin architecture is documented for future implementation; no admin command is enabled in this version."
          ]
        }
      }
    ]
  },
  {
    version: "4.2.1",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Produtos Reais, Guest & Starter Economy", en: "Real Products, Guest & Starter Economy" },
    summary: {
      pt: "A Loja agora usa os produtos da database, recebe compra em quantidade, onboarding com 3 Starter Decks e a primeira regra completa de coleção/duplicatas.",
      en: "The Store now uses database products, supports quantity purchasing, 3-Starter-Deck onboarding and the first complete collection/duplicate rules."
    },
    sections: [
      {
        title: { pt: "Shop & Collection", en: "Shop & Collection" },
        items: {
          pt: [
            "Todos os boosters, Premium Card Sets e Starter Decks identificados na database foram adicionados ao catálogo da Loja.",
            "O modal de produto mostra o pool de cartas, quantidade possuída em x/6, seletor de quantidade e confirmação de compra.",
            "Duplicatas geram Craft Coins por raridade; cópias acima do limite de 6 são descartadas e convertidas apenas em Craft Coins."
          ],
          en: [
            "All boosters, Premium Card Sets and Starter Decks identified in the database were added to the Store catalog.",
            "The product modal shows the card pool, x/6 ownership, quantity selector and purchase confirmation.",
            "Duplicates grant Craft Coins by rarity; copies above the 6-copy limit are discarded and converted only into Craft Coins."
          ]
        }
      },
      {
        title: { pt: "Guest, Conta & Starter Decks", en: "Guest, Account & Starter Decks" },
        items: {
          pt: [
            "Guest Mode usa armazenamento de sessão para Coins, Collection e Decks, apagando esse progresso ao encerrar o simulador.",
            "Ao criar a conta, o progresso Guest atual é migrado e o AccountCreationBonus concede 1500 Spirit Coins + 1500 Craft Coins uma única vez.",
            "Novos jogadores escolhem exatamente 3 Starter Decks; as cartas entram na coleção e as Deck Recipes são liberadas em Ready Decks."
          ],
          en: [
            "Guest Mode uses session storage for Coins, Collection and Decks, wiping that progress when the simulator closes.",
            "Creating an account migrates the current Guest progress and AccountCreationBonus grants 1500 Spirit Coins + 1500 Craft Coins once.",
            "New players choose exactly 3 Starter Decks; their cards enter the collection and Deck Recipes unlock in Ready Decks."
          ]
        }
      }
    ]
  },
  {
    version: "4.2.0",
    date: { pt: "27/09/2026", en: "09/27/2026" },
    title: { pt: "Loja, Coleção & Dupla Economia", en: "Store, Collection & Dual Economy" },
    summary: {
      pt: "A Loja e a Coleção ganham uma nova base de progressão com Spirit Coins e Craft Coins, obtidas pelo gameplay.",
      en: "The Store and Collection gain a new progression foundation with Spirit Coins and Craft Coins earned through gameplay."
    },
    sections: [
      {
        title: { pt: "Duas moedas, dois objetivos", en: "Two currencies, two purposes" },
        items: {
          pt: [
            "Spirit Coins são a moeda principal da Loja para boosters, decks e futuros itens.",
            "Craft Coins ficam reservadas exclusivamente para o futuro sistema de crafting de cartas.",
            "A economia foi planejada sem microtransações com dinheiro real."
          ],
          en: [
            "Spirit Coins are the main Store currency for boosters, decks and future items.",
            "Craft Coins are reserved exclusively for the future card crafting system.",
            "The economy is designed without real-money microtransactions."
          ]
        }
      },
      {
        title: { pt: "Nova Loja e Coleção", en: "New Store and Collection" },
        items: {
          pt: [
            "A Loja ganhou categorias para Boosters, Decks e Acessórios, com espaço preparado para conteúdos futuros.",
            "A nova aba Coleção acompanha cartas diferentes, total de cópias e repetidas.",
            "Itens ainda não lançados aparecem como indisponíveis sem quebrar a estrutura da Loja."
          ],
          en: [
            "The Store now has Boosters, Decks and Accessories categories with room for future content.",
            "The new Collection tab tracks unique cards, total copies and duplicates.",
            "Items that are not released yet appear as unavailable without breaking the Store structure."
          ]
        }
      }
    ]
  },
  {
    version: "4.1.0",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Expansão da Database", en: "Database Expansion" },
    summary: {
      pt: "A base de cartas foi preparada para crescer com novos sets de forma mais organizada e confiável.",
      en: "The card catalog is now prepared to grow with new sets in a more organized and reliable way."
    },
    sections: [
      {
        title: { pt: "Catálogo preparado para crescer", en: "Catalog ready to grow" },
        items: {
          pt: [
            "Novos sets podem ser adicionados ao catálogo sem concentrar todas as cartas em um único arquivo.",
            "A leitura do catálogo agora reconhece automaticamente sets organizados em pastas próprias.",
            "A contagem do catálogo permanece sincronizada com as cartas realmente disponíveis no jogo."
          ],
          en: [
            "New sets can be added without concentrating every card into a single file.",
            "The catalog now recognizes sets organized into their own folders automatically.",
            "Catalog totals stay synchronized with the cards actually available in the game."
          ]
        }
      },
      {
        title: { pt: "Mais consistência", en: "More consistency" },
        items: {
          pt: [
            "Novas verificações ajudam a evitar cartas duplicadas, dados incompletos e imagens ausentes.",
            "A estrutura continua compatível com todos os sets e decks já existentes.",
            "O Deck Builder e a Database continuam usando o mesmo catálogo unificado."
          ],
          en: [
            "New checks help prevent duplicate cards, incomplete data and missing artwork.",
            "The structure remains compatible with all existing sets and decks.",
            "Deck Builder and Database continue using the same unified catalog."
          ]
        }
      }
    ]
  },
  {
    version: "4.0.0",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Battle Spirits Eternal Platform", en: "Battle Spirits Eternal Platform" },
    summary: {
      pt: "A versão 4.0 consolida as principais áreas do simulador e melhora a experiência competitiva, navegação e consistência visual.",
      en: "Version 4.0 consolidates the simulator's main areas and improves the competitive experience, navigation and visual consistency."
    },
    sections: [
      {
        title: { pt: "Ranked renovado", en: "Refined Ranked" },
        items: {
          pt: [
            "A tela Ranked foi reorganizada para manter jogadores, RP, estatísticas e histórico no lugar certo em diferentes resoluções.",
            "A fila competitiva mostra com mais clareza conexão, deck selecionado e estado da busca.",
            "O histórico ganhou leitura mais limpa e um estado inicial para quem ainda não jogou na temporada."
          ],
          en: [
            "The Ranked screen was reorganized to keep players, RP, statistics and history properly positioned across resolutions.",
            "The competitive queue now communicates connection, selected deck and search state more clearly.",
            "Match history is easier to scan and now has a proper first-season empty state."
          ]
        }
      },
      {
        title: { pt: "Experiência unificada", en: "Unified experience" },
        items: {
          pt: [
            "Transições e estados de carregamento ficaram mais consistentes entre as principais áreas do jogo.",
            "Foco por teclado e navegação receberam um passe geral de acessibilidade.",
            "O menu principal reconhece quando o tutorial já foi concluído e passa a tratá-lo como consulta, sem manter o selo de novidade."
          ],
          en: [
            "Transitions and loading states are now more consistent across the game's main areas.",
            "Keyboard focus and navigation received a broader accessibility pass.",
            "The main menu now recognizes completed tutorials and treats them as a reference instead of permanently showing a new badge."
          ]
        }
      }
    ]
  },
  {
    version: "3.9.9",
    date: { pt: "26/09/2026", en: "09/26/2026" },
    title: { pt: "Performance & Network Optimization", en: "Performance & Network Optimization" },
    summary: {
      pt: "O simulador ficou mais leve no Deck Builder, na arena e no Online sem alterar regras ou aparência do jogo.",
      en: "The simulator is now lighter in Deck Builder, the arena and Online without changing game rules or presentation."
    },
    sections: [
      {
        title: { pt: "Mais fluidez", en: "Smoother play" },
        items: {
          pt: [
            "Buscas e cartas relacionadas agora reaproveitam resultados recentes para responder mais rápido em catálogos grandes.",
            "O Deck Builder evita recalcular validação e análise quando apenas filtros ou busca mudam.",
            "O relógio de turno reduz atualizações desnecessárias sem perder precisão visual."
          ],
          en: [
            "Searches and related-card suggestions now reuse recent results for faster response in large catalogs.",
            "Deck Builder avoids recalculating validation and analysis when only search or filters change.",
            "The turn clock performs fewer unnecessary updates without losing visible accuracy."
          ]
        }
      },
      {
        title: { pt: "Online mais eficiente", en: "More efficient Online" },
        items: {
          pt: [
            "Entrar em salas e jogar Online ficou mais responsivo em sessões longas.",
            "O lobby evita atualizações repetidas quando nada realmente mudou.",
            "Reconexões ficaram mais rápidas e consistentes em conexões instáveis."
          ],
          en: [
            "Joining rooms and playing Online is more responsive during long sessions.",
            "The lobby avoids repeated updates when nothing actually changed.",
            "Reconnects are faster and more consistent on unstable connections."
          ]
        }
      }
    ]
  },
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
                <div className="project-version-badge">Battle Spirits: KAIHOU! Simulator v{PATCHES[0].version}</div>
                <p>{pt ? "Battle Spirits: KAIHOU! Simulator é um projeto de fã não oficial criado para jogar, testar decks e explorar diferentes gerações do Battle Spirits original." : "Battle Spirits: KAIHOU! Simulator is an unofficial fan project created to play, test decks and explore different generations of the original Battle Spirits game."}</p>
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
