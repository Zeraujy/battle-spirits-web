import { FIELD_ZONES } from "./constants.js";

export function updateFieldCard(player, instanceId, updater) {
  for (const zone of FIELD_ZONES) {
    const index = player.field[zone].findIndex((c) => c.instanceId === instanceId);
    if (index >= 0) {
      const cards = [...player.field[zone]];
      cards[index] = updater(cards[index]);
      return { ...player, field: { ...player.field, [zone]: cards } };
    }
  }
  return player;
}

export function removeFieldCard(player, instanceId) {
  for (const zone of FIELD_ZONES) {
    const index = player.field[zone].findIndex((c) => c.instanceId === instanceId);
    if (index >= 0) {
      const cards = [...player.field[zone]];
      const [card] = cards.splice(index, 1);
      return { player: { ...player, field: { ...player.field, [zone]: cards } }, card, zone };
    }
  }
  return { player, card: null, zone: null };
}

export function addFieldCard(player, zone, card) {
  return { ...player, field: { ...player.field, [zone]: [...player.field[zone], card] } };
}

export function removeHandCard(player, instanceId) {
  const index = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (index < 0) return { player, card: null };
  const hand = [...player.hand];
  const [card] = hand.splice(index, 1);
  return { player: { ...player, hand }, card };
}
