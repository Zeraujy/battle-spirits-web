import crypto from "node:crypto";
import { MatchMode, normalizeMatchMode } from "../../src/online/domain/matchModes.js";
import { MatchStatus } from "../../src/online/domain/matchStatus.js";
import { MatchSession } from "./MatchSession.js";
import { MatchPlayer } from "./MatchPlayer.js";

export function createMatchSession({
  matchId = crypto.randomUUID(),
  mode = MatchMode.CASUAL,
  players = [],
  metadata = {},
  gameState = null,
  status = gameState ? MatchStatus.ACTIVE : MatchStatus.WAITING
} = {}) {
  return new MatchSession({
    matchId,
    mode: normalizeMatchMode(mode),
    status,
    players: players.map((player) => player instanceof MatchPlayer ? player : new MatchPlayer(player)),
    metadata,
    gameState
  });
}
