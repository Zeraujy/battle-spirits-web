export const QueueType = Object.freeze({
  CASUAL: "casual",
  RANKED: "ranked"
});

export function isQueueType(value) {
  return Object.values(QueueType).includes(value);
}
