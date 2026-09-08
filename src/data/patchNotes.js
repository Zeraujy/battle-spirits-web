export const PATCH_NOTES = [
  {
    version: "2.3.0",
    releasedAt: "2026-09-08",

    title: {
      ptBR:
        "Informações do projeto e melhorias no Online",

      en:
        "Project information and Online improvements"
    },

    sections: [
      {
        title: {
          ptBR: "Novidades",
          en: "New"
        },

        items: {
          ptBR: [
            "Adicionado o menu Sobre o Projeto.",
            "Adicionado o histórico de Patch Notes.",
            "Adicionada a opção Procurar Partida para encontrar automaticamente outro jogador.",
            "Adicionada escolha de cor do jogador antes das partidas online."
          ],

          en: [
            "Added the About the Project menu.",
            "Added the Patch Notes history.",
            "Added Quick Match to automatically find another available player.",
            "Added player color selection before online matches."
          ]
        }
      },

      {
        title: {
          ptBR: "Online",
          en: "Online"
        },

        items: {
          ptBR: [
            "O endereço do servidor não precisa mais ser digitado manualmente.",
            "O servidor padrão agora é configurado internamente pelo simulador.",
            "Criar Sala e Entrar por Código continuam disponíveis.",
            "O matchmaking reutiliza o sistema de salas existente para preservar a estabilidade do online."
          ],

          en: [
            "The server address no longer needs to be entered manually.",
            "The default server is now configured internally by the simulator.",
            "Create Room and Join by Code remain available.",
            "Quick Match reuses the existing room system to preserve online stability."
          ]
        }
      },

      {
        title: {
          ptBR: "Estrutura",
          en: "Structure"
        },

        items: {
          ptBR: [
            "O endereço do servidor foi movido para um arquivo de configuração central.",
            "A estrutura de Patch Notes foi separada da interface para facilitar futuras atualizações.",
            "Nenhuma regra da engine de batalha foi alterada para implementar estas funcionalidades."
          ],

          en: [
            "The server address was moved to a central configuration file.",
            "Patch Notes data was separated from the interface to simplify future updates.",
            "No battle engine rules were changed to implement these features."
          ]
        }
      }
    ]
  },

  {
    version: "2.2.0",

    title: {
      ptBR: "Base estável",
      en: "Stable baseline"
    },

    sections: [
      {
        title: {
          ptBR: "Melhorias",
          en: "Improvements"
        },

        items: {
          ptBR: [
            "Melhorias gerais na experiência das partidas.",
            "Ajustes na interface da mesa de jogo.",
            "Melhorias na visualização de cartas e informações de Level/BP.",
            "Melhorias no fluxo de resolução manual de cartas e efeitos.",
            "Ajustes gerais de estabilidade."
          ],

          en: [
            "General improvements to the match experience.",
            "Improvements to the game table interface.",
            "Improved card and Level/BP information display.",
            "Improved manual card and effect resolution flow.",
            "General stability improvements."
          ]
        }
      },

      {
        title: {
          ptBR: "Online",
          en: "Online"
        },

        items: {
          ptBR: [
            "Melhorias na criação e funcionamento das salas online.",
            "Melhorias de sincronização entre jogadores.",
            "Jogador local permanece na parte inferior da mesa durante partidas online."
          ],

          en: [
            "Improved online room creation and operation.",
            "Improved synchronization between players.",
            "The local player remains at the bottom of the table during online matches."
          ]
        }
      },

      {
        title: {
          ptBR: "Mecânicas",
          en: "Mechanics"
        },

        items: {
          ptBR: [
            "Melhorias no sistema de ataque e bloqueio.",
            "Suporte à área de Burst.",
            "Melhorias no gerenciamento de Cores, Reserve, Trash e Void.",
            "Suporte às mecânicas de redução de custo.",
            "Expansão gradual do suporte aos efeitos das cartas."
          ],

          en: [
            "Improved attack and block system.",
            "Support for the Burst area.",
            "Improved Core, Reserve, Trash and Void management.",
            "Support for cost reduction mechanics.",
            "Gradual expansion of card effect support."
          ]
        }
      },

      {
        title: {
          ptBR: "Database",
          en: "Database"
        },

        items: {
          ptBR: [
            "Suporte às cartas em inglês e português do Brasil.",
            "Estrutura preparada para expansão contínua de novos sets e decks.",
            "Preparação para suporte a mais idiomas futuramente."
          ],

          en: [
            "English and Brazilian Portuguese card support.",
            "Database structure prepared for new sets and decks.",
            "Prepared for additional languages in the future."
          ]
        }
      }
    ]
  }
];

export default PATCH_NOTES;