import { JEWEL_CARDS, ROYAL_CARDS } from '../constants/cards.local.ts';
import type { CardLevel, JewelCardDef, RoyalCardDef } from '../types/game.ts';

export const jewelById = new Map<string, JewelCardDef>(JEWEL_CARDS.map((card) => [card.id, card]));
export const royalById = new Map<string, RoyalCardDef>(ROYAL_CARDS.map((card) => [card.id, card]));

export function getJewelCard(cardId: string): JewelCardDef {
  const card = jewelById.get(cardId);
  if (!card) throw new Error(`Unknown jewel card: ${cardId}`);
  return card;
}

export function getRoyalCard(cardId: string): RoyalCardDef {
  const card = royalById.get(cardId);
  if (!card) throw new Error(`Unknown royal card: ${cardId}`);
  return card;
}

export function cardsByLevel(level: CardLevel): JewelCardDef[] {
  return JEWEL_CARDS.filter((card) => card.level === level);
}
