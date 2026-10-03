import { memo, useMemo } from "react";
import "../../../styles/arena/gameLogDrawerV490.css";

function GameLogDrawerComponent({
  open = false,
  entries = [],
  classifyEntry,
  onClose,
  language = "ptBR"
}) {
  const visibleEntries = useMemo(
    () => [...(entries || [])].slice(-80).reverse(),
    [entries]
  );

  return (
    <section
      className={`game-log-drawer arena-overlay-interactive ${open ? "is-open" : ""}`}
      aria-hidden={!open}
      aria-label={language === "en" ? "Game log" : "Registro da partida"}
      data-game-log-drawer={open ? "open" : "closed"}
    >
      <header className="game-log-drawer-header">
        <div>
          <span>{language === "en" ? "MATCH HISTORY" : "HISTÓRICO DA PARTIDA"}</span>
          <strong>{language === "en" ? "Game Log" : "Registro"}</strong>
        </div>
        <button
          type="button"
          className="game-log-drawer-close"
          onClick={onClose}
          aria-label={language === "en" ? "Close game log" : "Fechar registro"}
          tabIndex={open ? 0 : -1}
        >
          ×
        </button>
      </header>

      <div className="game-log-drawer-list" role="log" aria-live="off">
        {visibleEntries.map((entry) => {
          const kind = classifyEntry?.(entry) || "system";
          return (
            <article className={`game-log-drawer-entry log-${kind}`} key={entry.id}>
              <span>T{entry.turn} • {String(entry.phase || "—").toUpperCase()}</span>
              <p>{entry.text}</p>
            </article>
          );
        })}

        {!visibleEntries.length && (
          <div className="game-log-drawer-empty">
            {language === "en" ? "No match events yet." : "Nenhum evento registrado ainda."}
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(GameLogDrawerComponent);
