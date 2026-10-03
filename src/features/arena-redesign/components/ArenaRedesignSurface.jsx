export default function ArenaRedesignSurface({
  opponent,
  center,
  player,
  utility
}) {
  return (
    <div className="arena-redesign-surface">
      <section
        className="arena-redesign-side arena-redesign-side-opponent"
        data-arena-region="opponent"
      >
        {opponent}
      </section>

      <section
        className="arena-redesign-center"
        data-arena-region="center"
      >
        {center}
      </section>

      <section
        className="arena-redesign-side arena-redesign-side-player"
        data-arena-region="player"
      >
        {player}
      </section>

      <aside
        className="arena-redesign-utility"
        data-arena-region="utility"
      >
        {utility}
      </aside>
    </div>
  );
}
