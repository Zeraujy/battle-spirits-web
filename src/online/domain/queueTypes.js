export const QueueType = Object.freeze({
  CASUAL: "casual",
  RANKED: "ranked"
});

export const QueueStatus = Object.freeze({
  IDLE: "idle",
  SEARCHING: "searching",
  READY_CHECK: "readyCheck",
  MATCHED: "matched",
  CANCELLED: "cancelled"
});

export function isQueueType(value) {
  return Object.values(QueueType).includes(value);
}

export function isQueueStatus(value) {
  return Object.values(QueueStatus).includes(value);
}
