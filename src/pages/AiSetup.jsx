import { useMemo, useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { createMatch, validateDeck } from "../game/state.js";
import EmptyState from "../components/common/EmptyState.jsx";
import "../styles/pages/aiSetup.css";

function deckSize(deck) {
  return deck?.cards?.reduce(
    (sum, entry) => sum + Number(entry.quantity || entry.qty || entry.count || 0),
    0
  ) || 0;
}

function difficultyName(difficulty) {
  if (difficulty === "easy") return "Fácil";
  if (difficulty === "hard") return "Difícil";
  return "Normal";
}

export default function AiSetup({ onBack, onStart }) {
  const decks = getDecks();
  const profile = getProfile();
  const [playerDeckId, setPlayerDeckId] = useState(decks[0]?.id || "");
  const [cpuDeckId, setCpuDeckId] = useState(decks[1]?.id || decks[0]?.id || "");
  const [difficulty, setDifficulty] = useState("normal");
  const [first, setFirst] = useState("random");
  const [error, setError] = useState("");

  const playerDeck = useMemo(
    () => decks.find((deck) => deck.id === playerDeckId),
    [decks, playerDeckId]
  );
  const cpuDeck = useMemo(
    () => decks.find((deck) => deck.id === cpuDeckId),
    [decks, cpuDeckId]
  );

  function start() {
    if (!playerDeck || !cpuDeck) {
      setError("Escolha um deck para você e um deck para a CPU.");
      return;
    }

    const humanValidation = validateDeck(playerDeck.cards, cardIndex);
    const cpuValidation = validateDeck(cpuDeck.cards, cardIndex);
    if (!humanValidation.ok || !cpuValidation.ok) {
      setError([...humanValidation.errors, ...cpuValidation.errors].join(" "));
      return;
    }

    const firstPlayerId = first === "random"
      ? (Math.random() < 0.5 ? "player1" : "player2")
      : first;

    const match = createMatch({
      player1: {
        name: profile.name || profile.displayName || "Jogador",
        avatar: profile.avatar,
        deck: playerDeck.cards
      },
      player2: {
        name: `Eternal CPU • ${difficultyName(difficulty)}`,
        avatar: null,
        deck: cpuDeck.cards
      },
      firstPlayerId,
      cardIndex,
      seed: `cpu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    });

    onStart({
      ...match,
      ai: {
        version: 3,
        playerId: "player2",
        humanPlayerId: "player1",
        difficulty
      }
    });
  }

  return (
    <main className="standard-page ai-setup-page">
      <header className="ai-setup-header">
        <button type="button" className="ghost ai-back-button" onClick={onBack}>
          <span>←</span>
          Voltar
        </button>

        <div>
          <span className="eyebrow">ETERNAL CPU • PLANNING / LOOKAHEAD</span>
          <h1>Partida contra IA</h1>
          <p>
            A CPU usa a Rules Engine e agora compara pequenas sequências de jogadas antes de escolher a primeira ação.
          </p>
        </div>

        <span className="ai-beta-pill">LOOKAHEAD 3.3</span>
      </header>

      {!decks.length ? (
        <section className="ai-empty-shell">
          <EmptyState title="Você ainda não tem decks">
            Crie ou importe pelo menos um deck válido para iniciar uma partida contra a CPU.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="ai-setup-grid">
            <article className="ai-player-card human">
              <span className="eyebrow">VOCÊ</span>
              <h2>{profile.name || profile.displayName || "Jogador"}</h2>

              <label>
                Deck
                <select value={playerDeckId} onChange={(event) => setPlayerDeckId(event.target.value)}>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
              </label>

              <div className="ai-deck-summary">
                <strong>{deckSize(playerDeck)}</strong>
                <span>cartas</span>
              </div>
            </article>

            <div className="ai-versus">VS</div>

            <article className="ai-player-card cpu">
              <span className="eyebrow">ETERNAL CPU</span>
              <h2>Oponente IA</h2>

              <label>
                Deck
                <select value={cpuDeckId} onChange={(event) => setCpuDeckId(event.target.value)}>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Dificuldade
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="easy">Fácil — decisões imediatas</option>
                  <option value="normal">Normal — planeja 1 ação à frente</option>
                  <option value="hard">Difícil — planeja até 3 ações à frente</option>
                </select>
              </label>

              <div className="ai-deck-summary">
                <strong>{deckSize(cpuDeck)}</strong>
                <span>cartas</span>
              </div>
            </article>
          </section>

          <section className="ai-behavior-strip" aria-label="Recursos da Eternal CPU Planning / Lookahead">
            <div>
              <strong>Ações legais</strong>
              <span>Usa a mesma Rules Engine da partida.</span>
            </div>
            <div>
              <strong>Planning / Lookahead</strong>
              <span>Compara sequências legais antes de escolher a primeira jogada.</span>
            </div>
            <div>
              <strong>Sem mão revelada</strong>
              <span>Não usa a identidade das cartas ocultas do oponente.</span>
            </div>
          </section>

          <footer className="ai-setup-footer">
            <label>
              Quem começa?
              <select value={first} onChange={(event) => setFirst(event.target.value)}>
                <option value="random">Aleatório</option>
                <option value="player1">Você</option>
                <option value="player2">CPU</option>
              </select>
            </label>

            <div>
              {error && <p className="ai-setup-error">{error}</p>}
              <button type="button" className="primary-btn big" onClick={start}>
                INICIAR CPU BATTLE
              </button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
