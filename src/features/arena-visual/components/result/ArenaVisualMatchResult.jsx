import ArenaVisualPostMatchStats from "../postmatch/ArenaVisualPostMatchStats.jsx";
import ArenaVisualPostMatchProgression from "../postmatch/ArenaVisualPostMatchProgression.jsx";
import ArenaVisualPostMatchSocialActions from "../postmatch/ArenaVisualPostMatchSocialActions.jsx";

function resultReason(reason, defeatedName, language) {
  const en = language === "en";
  if (reason === "life") return { title: en ? "Life Depleted" : "Life reduzida a 0", text: en ? `${defeatedName} has no Life remaining.` : `${defeatedName} ficou sem Life.` };
  if (reason === "deck") return { title: en ? "Deck Depleted" : "Deck esgotado", text: en ? `${defeatedName} can no longer continue with an empty Deck.` : `${defeatedName} não pode continuar com o Deck vazio.` };
  if (reason === "turn_timeout") return { title: en ? "Turn Timer Expired" : "Tempo do turno esgotado", text: en ? `${defeatedName} ran out of turn time.` : `${defeatedName} ficou sem tempo no turno.` };
  if (reason === "disconnect_timeout") return { title: en ? "Connection Timeout" : "Tempo de reconexão esgotado", text: en ? `${defeatedName} did not reconnect in time.` : `${defeatedName} não voltou à partida dentro do prazo.` };
  if (reason === "concede" || reason === "surrender") return { title: en ? "Concession" : "Desistência", text: en ? `${defeatedName} conceded the match.` : `${defeatedName} desistiu da partida.` };
  return { title: en ? "Victory Condition" : "Condição de vitória", text: en ? "The match victory condition was reached." : "A condição de vitória da partida foi alcançada." };
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

export default function ArenaVisualMatchResult({
  result,
  onRequestRematch,
  onPlayAgain,
  onAddOpponent,
  onOpenProfile,
  onExit
}) {
  if (!result) return null;
  const reason = resultReason(result.reason, result.defeated?.name || "Opponent", result.language);
  const resolvedResult = { ...result, reasonTitle: reason.title, reasonText: reason.text };
  return (
    <div className={`arena-visual-result-overlay ${result.isDefeat ? "is-defeat" : "is-victory"}`} role="dialog" aria-modal="true" aria-label="Match result">
      <section className="arena-visual-result-card">
        <header>
          <span>Match Complete</span>
          {result.serverVerified ? <b>Server Verified</b> : null}
          <h1>{result.isDefeat ? "Defeat" : "Victory"}</h1>
          <p>{result.isDefeat ? `${result.winner?.name || "Opponent"} won the match.` : `${result.winner?.name || "Player"} is victorious.`}</p>
        </header>

        <div className="arena-visual-result-versus">
          <article className="is-winner">
            <span>Winner</span>
            <div>{result.winner?.avatar ? <img src={result.winner.avatar} alt="" /> : initials(result.winner?.name)}</div>
            <strong>{result.winner?.name || "Player"}</strong>
          </article>
          <b>VS</b>
          <article>
            <span>Defeated</span>
            <div>{result.defeated?.avatar ? <img src={result.defeated.avatar} alt="" /> : initials(result.defeated?.name)}</div>
            <strong>{result.defeated?.name || "Player"}</strong>
          </article>
        </div>

        <ArenaVisualPostMatchStats result={resolvedResult} />

        <ArenaVisualPostMatchProgression result={resolvedResult} />

        {result.notice ? <div className="arena-visual-result-notice" role="status">{result.notice}</div> : null}

        <ArenaVisualPostMatchSocialActions
          result={resolvedResult}
          onRequestRematch={onRequestRematch}
          onPlayAgain={onPlayAgain}
          onAddOpponent={onAddOpponent}
          onOpenProfile={onOpenProfile}
          onExit={onExit}
        />
      </section>
    </div>
  );
}
