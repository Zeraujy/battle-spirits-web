import { useMemo, useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { createMatch, validateDeck } from "../game/state.js";
import { analyzeDeckArchetype } from "../game/aiArchetypes.js";
import {
  DeckPicker,
  MatchMenuButton,
  MatchSetupMenu,
  MatchSetupScreen,
  PlayerBattlePreview,
  VersusMark,
  deckIsValid,
  deckSize,
  getDeckPortrait
} from "../components/match/MatchSetupScreen.jsx";

function difficultyName(value) {
  if (value === "easy") return "Fácil";
  if (value === "hard") return "Difícil";
  return "Normal";
}

function nextDifficulty(value) {
  if (value === "easy") return "normal";
  if (value === "normal") return "hard";
  return "easy";
}

function firstLabel(value) {
  if (value === "player1") return "Você";
  if (value === "player2") return "CPU";
  return "Aleatório";
}

function nextFirst(value) {
  if (value === "random") return "player1";
  if (value === "player1") return "player2";
  return "random";
}

export default function AiSetup({ onBack, onStart, onDeckBuilder }) {
  const decks = useMemo(() => getDecks(), []);
  const profile = useMemo(() => getProfile() || {}, []);
  const [playerDeckId, setPlayerDeckId] = useState(decks[0]?.id || "");
  const [cpuDeckId, setCpuDeckId] = useState(decks[1]?.id || decks[0]?.id || "");
  const [difficulty, setDifficulty] = useState("normal");
  const [first, setFirst] = useState("random");
  const [picker, setPicker] = useState(null);
  const [error, setError] = useState("");

  const playerDeck = decks.find((deck) => deck.id === playerDeckId) || null;
  const cpuDeck = decks.find((deck) => deck.id === cpuDeckId) || null;
  const cpuArchetype = useMemo(
    () => analyzeDeckArchetype(cpuDeck?.cards || [], cardIndex),
    [cpuDeck]
  );

  function start() {
    if (!playerDeck || !cpuDeck) {
      setError("Escolha um deck para você e um deck para a Eternal CPU.");
      return;
    }

    const humanValidation = validateDeck(playerDeck.cards, cardIndex);
    const cpuValidation = validateDeck(cpuDeck.cards, cardIndex);
    if (!humanValidation.ok || !cpuValidation.ok) {
      setError([...humanValidation.errors, ...cpuValidation.errors].join(" "));
      return;
    }

    setError("");
    const firstPlayerId = first === "random"
      ? (Math.random() < 0.5 ? "player1" : "player2")
      : first;

    const match = createMatch({
      player1: {
        name: profile.displayName || profile.name || "Jogador",
        avatar: profile.avatar || null,
        deck: playerDeck.cards
      },
      player2: {
        name: `Eternal CPU · ${difficultyName(difficulty)}`,
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
        version: 5,
        playerId: "player2",
        humanPlayerId: "player1",
        difficulty,
        archetypeProfile: cpuArchetype,
        debugEnabled: false
      }
    });
  }

  const noDecks = !decks.length;
  const cpuStyle = cpuArchetype?.top?.slice(0, 2).map((item) => item.labelPT).join(" / ") || "Equilibrado";

  return (
    <>
      <MatchSetupScreen
        className="cpu-match-setup"
        error={error}
        footer={`ETERNAL CPU · ${difficultyName(difficulty)} · ${cpuStyle}`}
        menu={
          <MatchSetupMenu eyebrow="PARTIDA LOCAL" titleTop="ETERNAL" titleBottom="CPU" status={`ESTILO: ${cpuStyle.toUpperCase()}`} badge="CPU">
            <MatchMenuButton label="Iniciar partida" detail="Enfrentar a Eternal CPU" active disabled={noDecks} onClick={start} />
            <MatchMenuButton
              label={`Dificuldade: ${difficultyName(difficulty)}`}
              detail={difficulty === "hard" ? "Desafio máximo" : difficulty === "easy" ? "Mais tranquila para aprender" : "Desafio equilibrado"}
              disabled={noDecks}
              onClick={() => setDifficulty(nextDifficulty(difficulty))}
            />
            <MatchMenuButton
              label={`Primeiro: ${firstLabel(first)}`}
              detail="Clique para alternar"
              disabled={noDecks}
              onClick={() => setFirst(nextFirst(first))}
            />
            <MatchMenuButton label="Deck Builder" onClick={onDeckBuilder} />
            <MatchMenuButton label="Voltar" onClick={onBack} />
          </MatchSetupMenu>
        }
      >
        <div className="match-setup-duel">
          <PlayerBattlePreview
            side="left"
            kicker="PLAYER"
            name={profile.displayName || profile.name || "Jogador"}
            avatarSrc={profile.avatar || profile.avatarUrl || profile.avatar_url || profile.photoURL || profile.photo || null}
            bannerSrc={getDeckPortrait(playerDeck)}
            deck={playerDeck}
            deckName={playerDeck?.name || "Nenhum deck"}
            deckMeta={playerDeck ? `${deckSize(playerDeck)} cartas · ${deckIsValid(playerDeck) ? "pronto" : "revisar"}` : "selecione um deck"}
            onChangeDeck={noDecks ? null : () => setPicker("player")}
          />

          <VersusMark />

          <PlayerBattlePreview
            side="right"
            kicker="ETERNAL CPU"
            name="ETERNAL CPU"
            rank={`${difficultyName(difficulty)} · ${cpuStyle}`}
            avatarSrc={null}
            bannerSrc={getDeckPortrait(cpuDeck)}
            deck={cpuDeck}
            deckName={cpuDeck?.name || "Nenhum deck"}
            deckMeta={cpuDeck ? `${deckSize(cpuDeck)} cartas · ${deckIsValid(cpuDeck) ? "pronto" : "revisar"}` : "selecione um deck"}
            onChangeDeck={noDecks ? null : () => setPicker("cpu")}
          />
        </div>
      </MatchSetupScreen>

      <DeckPicker
        open={picker === "player"}
        title="SEU DECK"
        decks={decks}
        selectedId={playerDeckId}
        onSelect={setPlayerDeckId}
        onClose={() => setPicker(null)}
        onDeckBuilder={onDeckBuilder}
      />
      <DeckPicker
        open={picker === "cpu"}
        title="DECK DA ETERNAL CPU"
        decks={decks}
        selectedId={cpuDeckId}
        onSelect={setCpuDeckId}
        onClose={() => setPicker(null)}
        onDeckBuilder={onDeckBuilder}
      />
    </>
  );
}
