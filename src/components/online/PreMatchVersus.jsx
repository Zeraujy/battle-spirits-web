import {
  PlayerBattlePreview,
  VersusMark,
  getDeckPortrait
} from "../match/MatchSetupScreen.jsx";

function profileName(profile, fallback) {
  return String(profile?.name || profile?.displayName || fallback || "Player").trim() || fallback || "Player";
}

function profileAvatar(profile) {
  return profile?.avatar || profile?.avatarUrl || profile?.avatar_url || null;
}

function lockedDeckPortrait(deck) {
  if (!deck?.coverCardId) return "./images/card-back.webp";
  return getDeckPortrait({ coverCardId: deck.coverCardId, cards: [] });
}

export default function PreMatchVersus({ preMatch }) {
  const player = preMatch?.player || {};
  const opponent = preMatch?.opponent || {};

  return (
    <div className="match-setup-duel online-pre-match-versus" aria-live="polite">
      <PlayerBattlePreview
        side="left"
        kicker="VOCÊ"
        name={profileName(player.profile, "Jogador")}
        avatarSrc={profileAvatar(player.profile)}
        bannerSrc={lockedDeckPortrait(player.deck)}
        status="READY"
      />

      <div className="online-pre-match-versus__center">
        <VersusMark />
        <span>DECKS LOCKED</span>
        <small>Preparando batalha...</small>
      </div>

      <PlayerBattlePreview
        side="right"
        kicker="OPONENTE"
        name={profileName(opponent.profile, "Oponente")}
        avatarSrc={profileAvatar(opponent.profile)}
        bannerSrc={lockedDeckPortrait(opponent.deck)}
        status="READY"
      />
    </div>
  );
}
