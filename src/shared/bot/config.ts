import type { CardLevel, GemColor, PayableTokenColor, TokenColor } from '../types/game.ts';
import type { BotPhase } from './types.ts';

export const GEMS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];
export const PAYABLE: PayableTokenColor[] = [...GEMS, 'pearl'];
export const TOKENS: TokenColor[] = [...PAYABLE, 'gold'];
export const LEVELS: CardLevel[] = [1, 2, 3];
// Initial heuristics, deliberately centralized for self-play tuning.
export const WEIGHTS: Record<BotPhase, { prestige: number; crowns: number; bonus: number; color: number }> = {
  early: { prestige: 2.2, crowns: 2.5, bonus: 3.6, color: 1.1 },
  middle: { prestige: 3.5, crowns: 3.8, bonus: 2.4, color: 2 },
  late: { prestige: 6, crowns: 5, bonus: 0.8, color: 3.5 },
};
