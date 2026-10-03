import {
  getArenaPlaymatById,
  getDefaultArenaPlaymat
} from "./playmatRegistry.js";

export function resolveArenaPlaymat(playmatId) {
  const requested = playmatId ? getArenaPlaymatById(playmatId) : null;

  if (requested?.enabled) {
    return requested;
  }

  return getDefaultArenaPlaymat();
}

export default resolveArenaPlaymat;
