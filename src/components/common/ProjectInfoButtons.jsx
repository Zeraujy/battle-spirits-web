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
    version: "3.2.1",
    date: { pt: "24/09/2026", en: "09/24/2026" },
    title: { pt: "Match Stability & AI Readiness", en: "Match Stability & AI Readiness" },
    summary: {
      pt: "Consolida a Arena atual e prepara a Rules Engine para IA, replay, debug e validação de partidas.",
      en: "Consolidates the current Arena and prepares the Rules Engine for AI, replay, debugging and match validation."
    },
    sections: [
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
