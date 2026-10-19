import type { GameState } from '../types/game.ts';
import { applyAction } from '../rules/reducers.ts';
import { discountedCost, getPlayer, suggestPaymentFor, canPurchaseCard } from '../rules/validators.ts';
import { sameColorPrestige, totalCrowns, totalPrestige } from '../rules/scoring.ts';
import { PAYABLE, LEVELS } from './config.ts';
import { resolveChoices } from './resolveChoice.ts';

/** Public-market threats only. Hidden reservations and sampled future draws are excluded. */
export function hasPublicWinningPurchase(input: GameState, playerId: string, publicCards: ReadonlySet<string>): boolean {
  const player = getPlayer(input, playerId);
  if (totalPrestige(player) < 10 && totalCrowns(player) < 7 && Math.max(...Object.values(sameColorPrestige(player))) < 4) return false;
  const game = structuredClone(input);
  game.currentPlayerId = playerId;
  game.turnPhase = 'optional';
  game.optionalReplenishedThisTurn = false;
  game.awaitingChoice = null;
  game.pendingRoyalCheck = null;
  game.extraTurnPlayerId = null;
  game.status = 'playing';
  game.winner = null;
  for (const level of LEVELS) for (const cardId of game.market[level]) {
    if (!publicCards.has(cardId)) continue;
    const source = { type: 'market' as const, level, cardId };
    const visit = (state: GameState): boolean => {
      const p = getPlayer(state, playerId);
      const payment = suggestPaymentFor(p, cardId);
      if (canPurchaseCard(state, playerId, source, payment).ok) {
        const result = resolveChoices(applyAction(state, playerId, { type: 'PURCHASE_CARD', source, payment }), playerId);
        if (result.winner?.winnerId === playerId) return true;
      }
      if (!p.privileges) return false;
      const cost = discountedCost(p, cardId);
      const needed = PAYABLE.filter((c) => p.tokens[c] < cost[c]);
      const missing = needed.reduce((sum, c) => sum + cost[c] - p.tokens[c], 0) - p.tokens.gold;
      if (missing > p.privileges || missing <= 0) return false;
      for (const color of needed) {
        const cell = state.board.find((c) => c.token === color);
        if (cell && visit(applyAction(state, playerId, { type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId: cell.id }))) return true;
      }
      return false;
    };
    if (visit(game)) return true;
  }
  return false;
}
