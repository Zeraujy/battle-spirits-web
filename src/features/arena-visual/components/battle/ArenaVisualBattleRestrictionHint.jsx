export default function ArenaVisualBattleRestrictionHint({ battle }) {
  const restrictions = Array.isArray(battle?.restrictions) ? battle.restrictions.filter(Boolean) : [];
  if (!restrictions.length) return null;
  return (
    <div className="arena-visual-battle-restrictions">
      {restrictions.map((restriction, index) => (
        <span key={`${restriction}-${index}`}>{restriction}</span>
      ))}
    </div>
  );
}
