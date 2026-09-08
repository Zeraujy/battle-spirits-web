import {
  useMemo,
  useState
} from "react";

import {
  useLanguage
} from "../i18n.jsx";

import {
  PATCH_NOTES
} from "../data/patchNotes.js";

import "../styles/v230.css";

const ABOUT = {
  ptBR: {
    title:
      "Sobre o projeto",

    paragraphs: [
      "Battle Spirits Simulator é um projeto de fã independente e não oficial, sem qualquer vínculo ou afiliação com a Bandai ou demais detentores da franquia Battle Spirits.",

      "Battle Spirits é uma franquia que faz parte da minha vida desde a infância. Sempre tive um enorme carinho pelo jogo e, ao mesmo tempo, senti que ele nunca recebeu no Ocidente o reconhecimento e a acessibilidade que merece.",

      "Foi dessa vontade que nasceu o Battle Spirits Simulator.",

      "O objetivo do projeto é tornar Battle Spirits mais acessível para jogadores de diferentes partes do mundo, oferecendo traduções das cartas em inglês e português do Brasil, com a possibilidade de adicionar novos idiomas futuramente.",

      "Através do simulador, queremos permitir que novos jogadores conheçam e aprendam Battle Spirits, ao mesmo tempo em que fãs que já conhecem a franquia possam voltar a jogar e experimentar suas cartas e decks.",

      "Atualmente, o projeto oferece tanto um ambiente de simulação individual, ideal para conhecer cartas, testar decks e aprender o jogo, quanto a possibilidade de disputar partidas online contra outros jogadores.",

      "Este é um projeto desenvolvido por fãs e não possui fins lucrativos. Seu único objetivo é contribuir para o crescimento da comunidade de Battle Spirits e ajudar mais pessoas a conhecerem essa incrível franquia."
    ],

    developmentTitle:
      "Projeto em desenvolvimento",

    development: [
      "O Battle Spirits Simulator ainda está em desenvolvimento e continuará recebendo melhorias, novas cartas, traduções, mecânicas e funcionalidades.",

      "Por esse motivo, durante suas partidas você poderá encontrar bugs, efeitos ainda não automatizados ou comportamentos que precisam ser melhorados.",

      "Todo feedback é muito bem-vindo. Esperamos contar com a ajuda da comunidade para encontrar problemas, sugerir melhorias e tornar o simulador cada vez melhor."
    ],

    thanks:
      "Obrigado por jogar e por ajudar a manter Battle Spirits vivo!",

    disclaimer:
      "Battle Spirits e todas as propriedades relacionadas pertencem aos seus respectivos detentores de direitos. Este projeto é uma iniciativa de fã, independente e não comercial."
  },

  en: {
    title:
      "About the project",

    paragraphs: [
      "Battle Spirits Simulator is an independent, unofficial fan project and is not affiliated with Bandai or any other rights holders of the Battle Spirits franchise.",

      "Battle Spirits has been part of my life since childhood. I have always loved the franchise, while also feeling that it never received the recognition and accessibility it deserves in the West.",

      "That desire is what led to the creation of Battle Spirits Simulator.",

      "The project's goal is to make Battle Spirits more accessible to players around the world by providing card translations in English and Brazilian Portuguese, with the possibility of adding more languages in the future.",

      "Through the simulator, we want new players to be able to discover and learn Battle Spirits, while also giving longtime fans a way to return to the game and experience its cards and decks.",

      "The project currently offers both an individual simulation environment for learning, testing decks and exploring cards, as well as online matches against other players.",

      "This is a fan-developed, non-profit project. Its only goal is to help grow the Battle Spirits community and introduce more people to this incredible franchise."
    ],

    developmentTitle:
      "Project in development",

    development: [
      "Battle Spirits Simulator is still under development and will continue to receive improvements, new cards, translations, mechanics and features.",

      "Because of this, you may encounter bugs, effects that still require manual resolution or other behavior that needs improvement.",

      "All feedback is welcome. We hope the community can help us find issues, suggest improvements and make the simulator better over time."
    ],

    thanks:
      "Thank you for playing and helping keep Battle Spirits alive!",

    disclaimer:
      "Battle Spirits and all related properties belong to their respective rights holders. This is an independent, non-commercial fan project."
  }
};

export default function ProjectInfoButtons() {
  const {
    language
  } = useLanguage();

  const lang =
    language === "en"
      ? "en"
      : "ptBR";

  const [panel, setPanel] =
    useState(null);

  const [
    selectedVersion,
    setSelectedVersion
  ] = useState(
    PATCH_NOTES[0]
      ?.version ||
      ""
  );

  const patch =
    useMemo(
      () =>
        PATCH_NOTES.find(
          (entry) =>
            entry.version ===
            selectedVersion
        ) ||
        PATCH_NOTES[0],
      [selectedVersion]
    );

  const about =
    ABOUT[lang];

  return (
    <>
      <button
        type="button"
        className="menu-card project-menu-card"
        onClick={() =>
          setPanel(
            "patchNotes"
          )
        }
      >
        <b>
          PATCH NOTES
        </b>

        <span>
          Histórico de atualizações
        </span>
      </button>

      <button
        type="button"
        className="menu-card project-menu-card"
        onClick={() =>
          setPanel(
            "about"
          )
        }
      >
        <b>
          {lang === "en"
            ? "ABOUT"
            : "SOBRE"}
        </b>

        <span>
          {lang === "en"
            ? "About the project"
            : "Sobre o projeto"}
        </span>
      </button>

      {panel && (
        <div
          className="project-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPanel(null);
            }
          }}
        >
          <section className="project-modal">
            <header>
              <div>
                <span className="eyebrow">
                  BATTLE SPIRITS SIMULATOR
                </span>

                <h2>
                  {panel ===
                  "about"
                    ? about.title
                    : "Patch Notes"}
                </h2>
              </div>

              <button
                type="button"
                className="ghost"
                onClick={() =>
                  setPanel(
                    null
                  )
                }
              >
                ✕
              </button>
            </header>

            {panel ===
              "about" && (
              <div className="about-content">
                <div className="project-version-badge">
                  Battle Spirits Simulator • v2.3.0
                </div>

                {about.paragraphs.map(
                  (
                    paragraph,
                    index
                  ) => (
                    <p
                      key={
                        index
                      }
                    >
                      {
                        paragraph
                      }
                    </p>
                  )
                )}

                <h3>
                  {
                    about.developmentTitle
                  }
                </h3>

                {about.development.map(
                  (
                    paragraph,
                    index
                  ) => (
                    <p
                      key={
                        index
                      }
                    >
                      {
                        paragraph
                      }
                    </p>
                  )
                )}

                <strong className="about-thanks">
                  {
                    about.thanks
                  }
                </strong>

                <small className="about-disclaimer">
                  {
                    about.disclaimer
                  }
                </small>
              </div>
            )}

            {panel ===
              "patchNotes" &&
              patch && (
                <div className="patch-notes-layout">
                  <aside className="patch-version-list">
                    {PATCH_NOTES.map(
                      (
                        entry
                      ) => (
                        <button
                          type="button"
                          key={
                            entry.version
                          }
                          className={
                            selectedVersion ===
                            entry.version
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setSelectedVersion(
                              entry.version
                            )
                          }
                        >
                          <b>
                            v{
                              entry.version
                            }
                          </b>

                          <span>
                            {
                              entry
                                .title[
                                lang
                              ]
                            }
                          </span>
                        </button>
                      )
                    )}
                  </aside>

                  <article className="patch-content">
                    <span className="eyebrow">
                      UPDATE
                    </span>

                    <h2>
                      v
                      {
                        patch.version
                      }
                    </h2>

                    <h3>
                      {
                        patch
                          .title[
                          lang
                        ]
                      }
                    </h3>

                    {patch.releasedAt && (
                      <small>
                        {
                          patch.releasedAt
                        }
                      </small>
                    )}

                    {patch.sections.map(
                      (
                        section,
                        index
                      ) => (
                        <section
                          key={
                            index
                          }
                          className="patch-section"
                        >
                          <h3>
                            {
                              section
                                .title[
                                lang
                              ]
                            }
                          </h3>

                          <ul>
                            {section
                              .items[
                              lang
                            ].map(
                              (
                                item,
                                itemIndex
                              ) => (
                                <li
                                  key={
                                    itemIndex
                                  }
                                >
                                  {
                                    item
                                  }
                                </li>
                              )
                            )}
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