import type { GemColor, PlayerState, VictoryResult } from '../types/game.ts';
import { getJewelCard, getRoyalCard } from './cards.ts';

const GEM_COLORS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];

export function totalPrestige(player: PlayerState): number {
  const jewelPoints = player.purchased.reduce((sum, owned) => sum + getJewelCard(owned.cardId).prestige, 0);
  const royalPoints = player.royals.reduce((sum, cardId) => sum + getRoyalCard(cardId).prestige, 0);
  return jewelPoints + royalPoints;
}

export function totalCrowns(player: PlayerState): number {
  return player.purchased.reduce((sum, owned) => sum + getJewelCard(owned.cardId).crowns, 0);
}

export function bonusCounts(player: PlayerState): Record<GemColor, number> {
  const counts = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
  for (const owned of player.purchased) {
    const card = getJewelCard(owned.cardId);
    const color = card.bonusColor ?? owned.copiedBonusColor;
    if (color) counts[color] += 1;
  }
  return counts;
}

export function sameColorPrestige(player: PlayerState): Record<GemColor, number> {
  const totals = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
  for (const owned of player.purchased) {
    const card = getJewelCard(owned.cardId);
    const color = card.bonusColor ?? owned.copiedBonusColor;
    if (color) totals[color] += card.prestige;
  }
  return totals;
}

export function checkVictory(player: PlayerState): VictoryResult | null {
  const prestige = totalPrestige(player);
  if (prestige >= 20) return { winnerId: player.id, reason: 'TOTAL_PRESTIGE', value: prestige };

  const crowns = totalCrowns(player);
  if (crowns >= 10) return { winnerId: player.id, reason: 'CROWNS', value: crowns };

  const colorPoints = sameColorPrestige(player);
  for (const color of GEM_COLORS) {
    if (colorPoints[color] >= 10) {
      return { winnerId: player.id, reason: 'SAME_COLOR_PRESTIGE', value: colorPoints[color] };
    }
  }
  return null;
}
