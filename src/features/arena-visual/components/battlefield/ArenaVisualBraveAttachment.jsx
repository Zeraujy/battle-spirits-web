export default function ArenaVisualBraveAttachment({ brave }) {
  if (!brave) return null;
  return (
    <div className="arena-visual-brave-attachment" aria-label={`Attached Brave: ${brave.name || "Brave"}`}>
      <img src={brave.image || "/images/card-back.webp"} alt={brave.name || "Brave"} draggable="false" />
    </div>
  );
}
