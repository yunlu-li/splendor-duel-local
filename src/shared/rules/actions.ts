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

const GEMS = ['white', 'blue', 'green', 'red', 'black'];
const PAYABLE = [...GEMS, 'pearl'];
const TOKENS = [...PAYABLE, 'gold'];
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export function validTokenCounts(value: unknown): value is TokenCounts {
  return record(value) && Object.entries(value).every(([color, count]) =>
    TOKENS.includes(color) && typeof count === 'number' && Number.isSafeInteger(count) && count >= 0);
}

function source(value: unknown, allowed: string[]): boolean {
  if (!record(value) || typeof value.type !== 'string' || !allowed.includes(value.type)) return false;
  if (value.type === 'reserved') return id(value.cardId);
  return [1, 2, 3].includes(value.level as number) && (value.type === 'deck' || id(value.cardId));
}

/** Runtime boundary: TypeScript types alone cannot validate JSON or direct JS callers. */
export function validateActionShape(value: unknown): ValidationResult {
  if (!record(value)) return fail('行动必须是有效对象');
  let valid = false;
  switch (value.type) {
    case 'REPLENISH_BOARD': case 'SKIP_EFFECT': valid = true; break;
    case 'SPEND_PRIVILEGE_TAKE_TOKEN': case 'CHOOSE_MATCHING_TOKEN': valid = id(value.cellId); break;
    case 'TAKE_TOKENS': valid = Array.isArray(value.cellIds) && value.cellIds.length >= 1 && value.cellIds.length <= 3 && value.cellIds.every(id); break;
    case 'RESERVE_CARD': valid = source(value.source, ['market', 'deck']) && id(value.goldCellId); break;
    case 'PURCHASE_CARD': valid = source(value.source, ['market', 'reserved']) && validTokenCounts(value.payment); break;
    case 'DISCARD_TOKENS': valid = validTokenCounts(value.tokens); break;
    case 'CHOOSE_ROYAL': valid = id(value.royalCardId); break;
    case 'CHOOSE_STEAL_TOKEN': valid = typeof value.token === 'string' && PAYABLE.includes(value.token); break;
    case 'CHOOSE_COPY_BONUS': valid = id(value.cardId) && typeof value.color === 'string' && GEMS.includes(value.color); break;
  }
  return valid ? ok() : fail('行动类型或参数无效；宝石数量必须为非负整数');
}
