import { useMemo, useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { createMatch, validateDeck } from "../game/state.js";
import { analyzeDeckArchetype } from "../game/aiArchetypes.js";
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
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [error, setError] = useState("");

  const playerDeck = useMemo(
    () => decks.find((deck) => deck.id === playerDeckId),
    [decks, playerDeckId]
  );
  const cpuDeck = useMemo(
    () => decks.find((deck) => deck.id === cpuDeckId),
    [decks, cpuDeckId]
  );

  const cpuArchetype = useMemo(
    () => analyzeDeckArchetype(cpuDeck?.cards || [], cardIndex),
    [cpuDeck]
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
        version: 4,
        playerId: "player2",
        humanPlayerId: "player1",
        difficulty,
        archetypeProfile: cpuArchetype,
        debugEnabled
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
          <span className="eyebrow">ETERNAL CPU • ARCHETYPE INTELLIGENCE</span>
          <h1>Partida contra IA</h1>
          <p>
            A CPU analisa o próprio deck, adapta seu estilo de jogo e continua planejando sequências legais antes de agir.
          </p>
        </div>

        <span className="ai-beta-pill">ARCHETYPE AI 3.3.1a</span>
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

              <div className="ai-archetype-summary">
                <span className="eyebrow">ESTILO DETECTADO</span>
                <strong>{cpuArchetype.labelPT}</strong>
                <small>{cpuArchetype.summaryPT}</small>
                <div className="ai-archetype-tags">
                  {cpuArchetype.top.slice(0, 3).map((item) => (
                    <span key={item.id}>{item.labelPT} {item.affinity}%</span>
                  ))}
                </div>
              </div>

              <div className="ai-deck-summary">
                <strong>{deckSize(cpuDeck)}</strong>
                <span>cartas</span>
              </div>
            </article>
          </section>

          <section className="ai-behavior-strip" aria-label="Recursos da Eternal CPU Archetype Intelligence">
            <div>
              <strong>Arquétipo automático</strong>
              <span>Analisa curva, tipos, efeitos e sinergias do próprio deck.</span>
            </div>
            <div>
              <strong>Planning / Lookahead</strong>
              <span>O plano futuro agora recebe pesos diferentes conforme o estilo detectado.</span>
            </div>
            <div>
              <strong>AI Debugger</strong>
              <span>Opcionalmente mostra scores, alternativas e o plano previsto pela CPU.</span>
            </div>
          </section>

          <footer className="ai-setup-footer">
            <div className="ai-setup-options">
              <label>
                Quem começa?
                <select value={first} onChange={(event) => setFirst(event.target.value)}>
                  <option value="random">Aleatório</option>
                  <option value="player1">Você</option>
                  <option value="player2">CPU</option>
                </select>
              </label>

              <label className="ai-debug-toggle">
                <input
                  type="checkbox"
                  checked={debugEnabled}
                  onChange={(event) => setDebugEnabled(event.target.checked)}
                />
                <span>
                  <strong>AI Debugger</strong>
                  <small>Mostra por que a CPU escolheu cada jogada.</small>
                </span>
              </label>
            </div>

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
