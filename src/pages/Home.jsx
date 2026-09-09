import {
  cards
} from "../services/cardRepository.js";

import {
  getDecks
} from "../services/storage.js";

import {
  useLanguage
} from "../i18n.jsx";

import ProjectInfoButtons from "../components/ProjectInfoButtons.jsx";


export default function Home({
  go
}) {
  const {
    t
  } =
    useLanguage();

  const decks =
    getDecks();


  return (
    <main className="home-page">

      <section className="hero-panel">

        <img
          className="game-logo"
          src="./images/logo_battlespirits.png"
          alt="Battle Spirits"
        />


        <div className="hero-copy">

          <span className="eyebrow">
            {t(
              "fanSimulator"
            )}
          </span>

          <h1>
            {t(
              "gateOpen"
            )}
          </h1>

        </div>


        <div className="home-stats">

          <div>
            <strong>
              {cards.length}
            </strong>

            <span>
              {t(
                "cardsLoaded"
              )}
            </span>
          </div>


          <div>
            <strong>
              {decks.length}
            </strong>

            <span>
              {t(
                "savedDecks"
              )}
            </span>
          </div>


          <div>
            <strong>
              17.1
            </strong>

            <span>
              {t(
                "rulesTarget"
              )}
            </span>
          </div>

        </div>

      </section>


      <section className="menu-grid clean-menu">

        <button
          className="menu-card primary"
          onClick={() =>
            go(
              "local"
            )
          }
        >
          <b>
            {t(
              "local"
            )}
          </b>
        </button>


        <button
          className="menu-card"
          onClick={() =>
            go(
              "online"
            )
          }
        >
          <b>
            {t(
              "online"
            )}
          </b>
        </button>


        <button
          className="menu-card"
          onClick={() =>
            go(
              "decks"
            )
          }
        >
          <b>
            {t(
              "decks"
            )}
          </b>
        </button>


        <button
          className="menu-card"
          onClick={() =>
            go(
              "profile"
            )
          }
        >
          <b>
            {t(
              "profile"
            )}
          </b>
        </button>


        <button
          className="menu-card"
          onClick={() =>
            go(
              "account"
            )
          }
        >
          <b>
            {t(
              "account"
            )}
          </b>
        </button>


        <button
          className="menu-card settings-menu-card"
          onClick={() =>
            go(
              "settings"
            )
          }
        >
          <b>
            {t(
              "settings"
            )}
          </b>
        </button>


        <ProjectInfoButtons />

      </section>


      <footer className="home-footer">
        Battle Spirits © BANDAI. Unofficial fan project.
      </footer>

    </main>
  );
}
