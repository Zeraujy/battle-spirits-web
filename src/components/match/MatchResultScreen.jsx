import { formatMatchDuration } from "../../services/postMatchService.js";

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "?";
}

function reasonCopy(reason, defeatedName, language) {
  const en = language === "en";
  if (reason === "life") return {
    title: en ? "Life depleted" : "Life reduzida a 0",
    text: en ? `${defeatedName} has no Life remaining.` : `${defeatedName} ficou sem Life.`
  };
  if (reason === "deck") return {
    title: en ? "Deck depleted" : "Deck esgotado",
    text: en ? `${defeatedName} can no longer continue with an empty Deck.` : `${defeatedName} não pode continuar com o Deck vazio.`
  };
  if (reason === "turn_timeout") return {
    title: en ? "Turn timer expired" : "Tempo do turno esgotado",
    text: en ? `${defeatedName} ran out of turn time.` : `${defeatedName} ficou sem tempo no turno.`
  };
  if (reason === "disconnect_timeout") return {
    title: en ? "Connection timeout" : "Tempo de reconexão esgotado",
    text: en ? `${defeatedName} did not reconnect in time.` : `${defeatedName} não voltou à partida dentro do prazo.`
  };
  if (reason === "concede" || reason === "surrender") return {
    title: en ? "Concession" : "Desistência",
    text: en ? `${defeatedName} conceded the match.` : `${defeatedName} desistiu da partida.`
  };
  return {
    title: en ? "Victory condition" : "Condição de vitória",
    text: en ? "The match victory condition was reached." : "A condição de vitória da partida foi alcançada."
  };
}

export default function MatchResultScreen({
  language = "ptBR",
  winner,
  defeated,
  isDefeat = false,
  reason = "other",
  turnNumber,
  summary,
  masteryImageSrc = null,
  masteryCardName = "",
  rankedDelta = 0,
  postMatchActionNotice = "",
  mode = "local",
  rematchPending = false,
  opponentUsername = "",
  onRequestRematch,
  onPlayAgain,
  onAddOpponent,
  onOpenProfile,
  onExit,
  mainMenuLabel = "Menu principal"
}) {
  const en = language === "en";
  const copy = reasonCopy(reason, defeated?.name || (en ? "The opponent" : "O oponente"), language);

  return (
    <div
      className={`game-result-overlay ${isDefeat ? "is-defeat" : "is-victory"}`}
      role="dialog"
      aria-modal="true"
      aria-label={en ? "Match result" : "Resultado da partida"}
    >
      <section className="game-result-card">
        <div className="game-result-ambient" />

        <header className="game-result-header">
          <span className="game-result-kicker">{en ? "MATCH COMPLETE" : "PARTIDA ENCERRADA"}</span>
          <div className="game-result-badge"><span>{isDefeat ? (en ? "DEFEAT" : "DERROTA") : (en ? "VICTORY" : "VITÓRIA")}</span></div>
          <h2>{isDefeat
            ? (en ? `${winner?.name || "Opponent"} won the match` : `${winner?.name || "Oponente"} venceu a partida`)
            : (en ? `${winner?.name || "Player"} is victorious` : `${winner?.name || "Jogador"} venceu!`)}</h2>
          <p>{isDefeat
            ? (en ? "The duel is over. Review the result and prepare for the next battle." : "O duelo terminou. Confira o resultado e prepare-se para a próxima batalha.")
            : (en ? "The final blow was dealt. The duel belongs to the winner." : "O golpe final foi dado. O duelo pertence ao vencedor.")}</p>
        </header>

        <div className="game-result-versus">
          <article className="game-result-player winner" style={{ "--result-player-color": winner?.playerColor || "#d8d8d8" }}>
            <span className="game-result-player-label">{en ? "WINNER" : "VENCEDOR"}</span>
            <div className="game-result-avatar">{winner?.avatar ? <img src={winner.avatar} alt="" /> : <span>{initials(winner?.name)}</span>}</div>
            <strong>{winner?.name || (en ? "Player" : "Jogador")}</strong>
            <small>{en ? "Victory" : "Vitória"}</small>
          </article>

          <div className="game-result-vs-mark">VS</div>

          <article className="game-result-player defeated" style={{ "--result-player-color": defeated?.playerColor || "#929292" }}>
            <span className="game-result-player-label">{en ? "DEFEATED" : "DERROTADO"}</span>
            <div className="game-result-avatar">{defeated?.avatar ? <img src={defeated.avatar} alt="" /> : <span>{initials(defeated?.name)}</span>}</div>
            <strong>{defeated?.name || (en ? "Player" : "Jogador")}</strong>
            <small>{en ? "Defeat" : "Derrota"}</small>
          </article>
        </div>

        <div className="game-result-summary">
          <div><span>{en ? "RESULT" : "RESULTADO"}</span><strong>{copy.title}</strong><p>{copy.text}</p></div>
          <div className="game-result-turn"><span>{en ? "FINAL TURN" : "TURNO FINAL"}</span><strong>{turnNumber || "-"}</strong></div>
        </div>

        <section className="post-match-v380-grid" aria-label={en ? "Match details" : "Detalhes da partida"}>
          <article><span>{en ? "DURATION" : "DURAÇÃO"}</span><strong>{formatMatchDuration(summary?.durationSeconds || 0, language)}</strong><small>{summary?.turns || turnNumber || 1} {en ? "turns" : "turnos"}</small></article>
          <article><span>DECK</span><strong>{summary?.deck?.name || (en ? "Unidentified" : "Não identificado")}</strong><small>{summary?.deck?.cardIds?.length ? `${summary.deck.cardIds.length} ${en ? "cards" : "cartas"}` : (en ? "Match snapshot" : "Snapshot da partida")}</small></article>
          <article><span>{en ? "LIFE REMAINING" : "LIFE RESTANTE"}</span><strong>{summary?.lifeRemaining ?? "—"}</strong><small>{summary?.result === "win" ? (en ? "Your final Life" : "Seu Life final") : (en ? "At match end" : "Ao encerrar")}</small></article>
          <article className="post-match-mastery-stat"><span>CARD MASTERY</span><strong>+{summary?.mastery?.totalXp || 0} XP</strong><small>{summary?.mastery?.trackedCards || 0} {en ? "cards progressed" : "cartas progrediram"}</small></article>
        </section>

        {(masteryImageSrc || summary?.ranked) && (
          <section className="post-match-v380-progression">
            {masteryImageSrc && (
              <article className="post-match-featured-mastery">
                <div className="post-match-featured-card"><img src={masteryImageSrc} alt={masteryCardName} /></div>
                <div><span>{en ? "MASTERY HIGHLIGHT" : "DESTAQUE DE MAESTRIA"}</span><strong>{masteryCardName}</strong><small>+{summary?.mastery?.featuredXp || 0} XP · {summary?.deck?.coverCardId === summary?.mastery?.featuredCardId ? (en ? "Deck cover bonus" : "Bônus de carta de capa") : (en ? "Used in this duel" : "Utilizada neste duelo")}</small></div>
              </article>
            )}
            {summary?.ranked && (
              <article className={`post-match-ranked-change ${rankedDelta >= 0 ? "positive" : "negative"}`}>
                <span>RANKED / SEASON 0</span><strong>{rankedDelta >= 0 ? "+" : ""}{rankedDelta} RP</strong><small>{summary.ranked.rpBefore} → {summary.ranked.rpAfter} RP</small><b>{summary.ranked.rank || "—"}</b>
              </article>
            )}
          </section>
        )}

        {postMatchActionNotice && <div className="post-match-action-notice" role="status">{postMatchActionNotice}</div>}

        <footer className="game-result-actions post-match-v380-actions">
          <div className="post-match-secondary-actions">
            {mode === "online" && <button type="button" onClick={onRequestRematch} disabled={rematchPending}>{rematchPending ? (en ? "Waiting…" : "Aguardando…") : (en ? "Request rematch" : "Pedir revanche")}</button>}
            {mode !== "online" && <button type="button" onClick={onPlayAgain}>{mode === "ranked" ? (en ? "Return to Ranked queue" : "Voltar à fila Ranked") : (en ? "Play again" : "Jogar novamente")}</button>}
            {opponentUsername && (mode === "online" || mode === "ranked") && (
              <>
                <button type="button" onClick={onAddOpponent}>{en ? "Add opponent" : "Adicionar adversário"}</button>
                <button type="button" onClick={() => onOpenProfile?.(opponentUsername)}>{en ? "Open profile" : "Abrir perfil"}</button>
              </>
            )}
          </div>
          <button type="button" className="game-result-main-button" onClick={onExit}><span>{mainMenuLabel}</span><b aria-hidden="true">→</b></button>
        </footer>
      </section>
    </div>
  );
}
