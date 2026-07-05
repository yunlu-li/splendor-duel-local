import type { CardLevel, GemColor, TokenCounts } from '../types/game.ts';

export type CardSource =
  | { type: 'market'; level: CardLevel; cardId: string }
  | { type: 'deck'; level: CardLevel }
  | { type: 'reserved'; cardId: string };

export type GameAction =
  | { type: 'SPEND_PRIVILEGE_TAKE_TOKEN'; cellId: string }
  | { type: 'REPLENISH_BOARD' }
  | { type: 'TAKE_TOKENS'; cellIds: string[] }
  | { type: 'RESERVE_CARD'; source: Extract<CardSource, { type: 'market' | 'deck' }>; goldCellId: string }
  | { type: 'PURCHASE_CARD'; source: Extract<CardSource, { type: 'market' | 'reserved' }>; payment: TokenCounts }
  | { type: 'DISCARD_TOKENS'; tokens: TokenCounts }
  | { type: 'CHOOSE_ROYAL'; royalCardId: string }
  | { type: 'CHOOSE_STEAL_TOKEN'; token: Exclude<keyof TokenCounts, 'gold'> }
  | { type: 'CHOOSE_MATCHING_TOKEN'; cellId: string }
  | { type: 'CHOOSE_COPY_BONUS'; cardId: string; color: GemColor }
  | { type: 'SKIP_EFFECT' };

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export const ok = (): ValidationResult => ({ ok: true });
export const fail = (reason: string): ValidationResult => ({ ok: false, reason });
