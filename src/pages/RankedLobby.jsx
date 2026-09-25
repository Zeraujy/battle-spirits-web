import { useEffect, useMemo, useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { getAccountSession } from "../services/socialService.js";
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

export default function RankedLobby({ onBack, onAccount, onDeckBuilder }) {
  const decks = useMemo(() => getDecks(), []);
  const profile = useMemo(() => getProfile() || {}, []);
  const [deckId, setDeckId] = useState(decks[0]?.id || "");
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getAccountSession()
      .then((session) => {
        if (active) setSignedIn(Boolean(session?.user));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  const deck = decks.find((item) => item.id === deckId) || null;
  const validDeck = deckIsValid(deck);
  const playerName = profile.displayName || profile.name || "Jogador";
  const accountState = checking ? "VERIFICANDO CONTA" : signedIn ? "CONTA CONECTADA" : "LOGIN NECESSÁRIO";

  return (
    <>
      <MatchSetupScreen
        className="ranked-match-setup"
        footer="RANKED · PRÉ-TEMPORADA · RATING E MATCHMAKING COMPETITIVO SERÃO VALIDADOS PELO SERVIDOR"
        menu={
          <MatchSetupMenu
            eyebrow="MULTIPLAYER ONLINE"
            titleTop="PARTIDA"
            titleBottom="RANQUEADA"
            status={`${accountState} · ${validDeck ? "DECK VÁLIDO" : "REVISAR DECK"}`}
            badge="PRÉ-TEMPORADA"
          >
            <MatchMenuButton
              label="Ranked em breve"
              detail="Fila competitiva ainda não está ativa"
              active
              disabled
            />
            <MatchMenuButton
              label="Rank & RP"
              detail="Bronze III · 1000 RP"
              disabled
            />
            <MatchMenuButton
              label="Histórico"
              detail="Será ativado junto ao Ranked"
              disabled
            />
            {!checking && !signedIn && (
              <MatchMenuButton label="Entrar na conta" detail="Conta será obrigatória no Ranked" onClick={onAccount} />
            )}
            <MatchMenuButton label="Deck Builder" onClick={onDeckBuilder} />
            <MatchMenuButton label="Voltar" onClick={onBack} />
          </MatchSetupMenu>
        }
      >
        <div className="match-setup-duel">
          <PlayerBattlePreview
            side="left"
            kicker="RANKED PLAYER"
            name={playerName}
            rank="BRONZE III · 1000 RP"
            avatarSrc={profile.avatar || profile.avatarUrl || profile.avatar_url || profile.photoURL || profile.photo || null}
            bannerSrc={getDeckPortrait(deck)}
            deck={deck}
            deckName={deck?.name || "Nenhum deck"}
            deckMeta={deck ? `${deckSize(deck)} cartas · ${validDeck ? "válido para 1v1" : "revisar deck"}` : "selecione seu deck ranqueado"}
            onChangeDeck={() => setPickerOpen(true)}
            status={signedIn ? "RANKED READY" : "CONTA NECESSÁRIA"}
          />

          <VersusMark />

          <PlayerBattlePreview
            side="right"
            kicker="RANKED MATCH"
            name="ADVERSÁRIO"
            avatarSrc={null}
            bannerSrc={null}
            deckName="Matchmaking competitivo"
            deckMeta="identidade revelada após o pareamento"
            status="PRÉ-TEMPORADA"
            waiting
          />
        </div>
      </MatchSetupScreen>

      <DeckPicker
        open={pickerOpen}
        title="Deck ranqueado"
        decks={decks}
        selectedId={deckId}
        onSelect={setDeckId}
        onClose={() => setPickerOpen(false)}
        onDeckBuilder={onDeckBuilder}
      />
    </>
  );
}
