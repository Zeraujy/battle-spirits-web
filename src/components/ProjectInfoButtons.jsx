import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useLanguage
} from "../i18n.jsx";

import "../styles/v230.css";


const PATCHES = [
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
          className="project-menu-card"
          onClick={() =>
            setModal(
              "about"
            )
          }
        >
          <b>
            {pt
              ? "Sobre o projeto"
              : "About the project"}
          </b>
        </button>


        <button
          type="button"
          className="project-menu-card"
          onClick={() => {
            setSelectedVersion(
              PATCHES[0].version
            );

            setModal(
              "patch"
            );
          }}
        >
          <b>
            Patch Notes
          </b>
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
