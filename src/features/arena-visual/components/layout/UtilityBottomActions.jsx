export default function UtilityBottomActions() {
  return (
    <div className="arena-visual-utility-actions is-bottom" aria-label="Bottom utility action slots">
      {Array.from({ length: 4 }, (_, index) => (
        <button
          key={index}
          type="button"
          className="arena-visual-utility-action"
          aria-label={`Bottom utility slot ${index + 1}`}
          tabIndex={-1}
        />
      ))}
    </div>
  );
}
