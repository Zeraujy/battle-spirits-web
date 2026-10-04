export default function UtilityTopActions() {
  return (
    <div className="arena-visual-utility-actions is-top" aria-label="Top utility action slots">
      {Array.from({ length: 4 }, (_, index) => (
        <button
          key={index}
          type="button"
          className="arena-visual-utility-action"
          aria-label={`Top utility slot ${index + 1}`}
          tabIndex={-1}
        />
      ))}
    </div>
  );
}
