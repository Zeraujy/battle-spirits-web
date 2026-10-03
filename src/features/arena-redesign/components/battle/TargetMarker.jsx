export default function TargetMarker({ selected = false }) {
  return (
    <span
      className={`arena-redesign-target-marker${selected ? " is-selected" : ""}`}
      aria-hidden="true"
    >
      {selected ? "Selected" : "Target"}
    </span>
  );
}
