import ArenaVisual from "../../ArenaVisual.jsx";

const playerHand = [
  ["SD13-001", "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-001.webp"],
  ["SD13-003", "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-003.webp"],
  ["SD13-005", "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-005.webp"],
  ["SD13-006", "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-006.webp"],
  ["SD13-X01", "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-X01.webp"]
].map(([id, image]) => ({ id, name: id, image }));

const previewViewModel = Object.freeze({
  playmatId: "default",
  player: {
    hand: { count: playerHand.length, cards: playerHand },
    battlefield: {
      count: 1,
      cards: [{
        id: "player-field-1",
        name: "SD13-X01",
        image: "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-X01.webp",
        level: 2,
        bp: 7000,
        coreCount: 3,
        soulCoreCount: 0,
        cardType: "Spirit",
        cost: 7,
        color: "red",
        keywords: ["Flash", "Burst"],
        effectText: "[Flash] When this Spirit attacks, resolve its Battle Spirits effect. Burst effects and other keywords use the card color in the Card Inspector."
      }]
    },
    life: { count: 5, coreCount: 5 },
    burst: { count: 1 },
    reserve: { count: 5, coreCount: 4, soulCoreCount: 1 },
    deck: { count: 34 },
    trash: { count: 2, cards: [{ id: "player-trash-preview", name: "SD13-003", image: "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-003.webp" }] },
    coreTrash: { count: 2, coreCount: 2 }
  },
  currentPhase: "main",
  turnNumber: 4,
  activePlayerName: "Player",
  priorityLabel: "Your priority",
  showAdvanceStep: true,
  canAdvanceStep: true,
  advanceStepLabel: "Avançar",
  availableActions: [
    { id: "pass", label: "Pass", emphasis: true },
    { id: "cancel", label: "Cancel", tone: "quiet" }
  ],
  logEntries: [
    { id: "log-1", turn: 4, phase: "main", text: "Player summoned SD13-X01." },
    { id: "log-2", turn: 3, phase: "attack", text: "Battle resolution completed." },
    { id: "log-3", turn: 3, phase: "draw", text: "Opponent drew a card." }
  ],
  chatMessages: [
    { id: "chat-1", author: "Opponent", text: "Good luck!" },
    { id: "chat-2", author: "You", text: "Have fun!", self: true }
  ],
  opponent: {
    hand: { count: 5 },
    battlefield: {
      count: 1,
      cards: [{
        id: "opponent-field-1",
        name: "SD13-X01",
        image: "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-X01.webp",
        level: 2,
        bp: 7000,
        coreCount: 3,
        soulCoreCount: 0,
        cardType: "Spirit",
        cost: 7,
        effectText: "Opponent field card preview. Visible battlefield cards can be inspected without exposing hidden information."
      }]
    },
    life: { count: 5, coreCount: 5 },
    burst: { count: 1 },
    reserve: { count: 5, coreCount: 4, soulCoreCount: 1 },
    deck: { count: 34 },
    trash: { count: 2, cards: [{ id: "opponent-trash-preview", name: "SD13-003", image: "/cards-database/SD13-AttributeEye-OpeningDeck-Amethyst/SD13-003.webp" }] },
    coreTrash: { count: 2, coreCount: 2 }
  }
});

export default function ArenaVisualPreview() {
  return <ArenaVisual viewModel={previewViewModel} />;
}
