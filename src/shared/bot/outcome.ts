import type { GameAction } from '../rules/actions.ts';
import type { GameState } from '../types/game.ts';

/** Apply once per completed main action, whether or not a privilege/refill preceded it. */
export function outcomeFactors(state: GameState, playerId: string, mainAction?: GameAction): Record<string, number> {
  return {
    '额外回合': state.status === 'playing' && !state.awaitingChoice && state.currentPlayerId === playerId ? 5 : 0,
    '盲保不确定性': mainAction?.type === 'RESERVE_CARD' && mainAction.source.type === 'deck' ? -2 : 0,
  };
}

export function outcomeValue(state: GameState, playerId: string, mainAction?: GameAction): number {
  return Object.values(outcomeFactors(state, playerId, mainAction)).reduce((sum, value) => sum + value, 0);
}
