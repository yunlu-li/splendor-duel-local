import type { GameState } from '../types/game.ts';
import { sameColorPrestige, totalCrowns, totalPrestige } from '../rules/scoring.ts';
import type { BotPhase } from './types.ts';

export function getBotPhase(game: GameState): BotPhase {
  if (game.players.some((p) => totalPrestige(p) >= 15 || totalCrowns(p) >= 7 || Math.max(...Object.values(sameColorPrestige(p))) >= 7)) return 'late';
  if (game.players.some((p) => totalPrestige(p) >= 6 || totalCrowns(p) >= 3 || p.purchased.length >= 5)) return 'middle';
  return 'early';
}
