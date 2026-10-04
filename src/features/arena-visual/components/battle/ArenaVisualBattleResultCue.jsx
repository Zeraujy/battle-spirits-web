export default function ArenaVisualBattleResultCue({ battle }) {
  if (!battle || !["resolve", "end"].includes(battle.stage)) return null;
  return (
    <div className="arena-visual-battle-result-cue">
      <span>Battle Resolution</span>
      <strong>{battle.blocker ? `${battle.attacker?.name || "Attacker"} vs ${battle.blocker?.name || "Blocker"}` : "Direct Attack"}</strong>
      <small>{battle.blocker ? "Battle comparison and destruction are resolved by the Rules Engine." : "The attack remains direct unless another rule changes the result."}</small>
    </div>
  );
}
