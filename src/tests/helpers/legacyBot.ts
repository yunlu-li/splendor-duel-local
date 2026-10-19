// Frozen pre-upgrade policy for reproducible regression matches. Not imported by the app.
import type { GameAction } from '../../shared/rules/actions.ts';
import type { GameState } from '../../shared/types/game.ts';
import { getJewelCard } from '../../shared/rules/cards.ts';
import { bonusCounts } from '../../shared/rules/scoring.ts';
import { canPurchaseCard, canReserveCard, canReplenishBoard, getPlayer, getOpponent, suggestPaymentFor } from '../../shared/rules/validators.ts';
import { GEMS, TOKENS } from '../../shared/bot/config.ts';
import { tokenLines } from '../../shared/bot/legalActions.ts';

export function legacyBot(game: GameState): GameAction | null {
  const choice = game.awaitingChoice;
  const p = getPlayer(game, choice?.playerId ?? game.currentPlayerId);
  if (choice) {
    if (choice.type === 'DISCARD_TOKENS') {
      let n = choice.excess;
      const tokens: Record<string, number> = {};
      for (const c of TOKENS) { tokens[c] = Math.min(n, p.tokens[c]); n -= tokens[c]; }
      return { type: 'DISCARD_TOKENS', tokens };
    }
    if (choice.type === 'CHOOSE_ROYAL') return { type: 'CHOOSE_ROYAL', royalCardId: game.availableRoyals[0] };
    if (choice.type === 'CHOOSE_COPY_BONUS') {
      const color = GEMS.find((c) => bonusCounts(p)[c] > 0);
      return color ? { type: 'CHOOSE_COPY_BONUS', cardId: choice.cardId, color } : { type: 'SKIP_EFFECT' };
    }
    if (choice.type === 'CHOOSE_STEAL_TOKEN') {
      const token = TOKENS.find((c) => c !== 'gold' && getOpponent(game, p.id).tokens[c] > 0);
      return token && token !== 'gold' ? { type: 'CHOOSE_STEAL_TOKEN', token } : { type: 'SKIP_EFFECT' };
    }
    const cell = game.board.find((c) => c.token === choice.color);
    return cell ? { type: 'CHOOSE_MATCHING_TOKEN', cellId: cell.id } : { type: 'SKIP_EFFECT' };
  }
  const power = (id: string) => {
    const c = getJewelCard(id);
    return c.prestige * 10 + c.crowns * 4 + (c.ability ? 3 : 0) + (c.level - 1) * 2;
  };
  const market = ([3, 2, 1] as const).flatMap((level) => game.market[level].map((cardId) => ({ type: 'market' as const, level, cardId }))).sort((a, b) => power(b.cardId) - power(a.cardId));
  const reserved = p.reserved.map((cardId) => ({ type: 'reserved' as const, cardId })).sort((a, b) => power(b.cardId) - power(a.cardId));
  for (const source of [...market, ...reserved]) {
    const payment = suggestPaymentFor(p, source.cardId);
    if (canPurchaseCard(game, p.id, source, payment).ok) return { type: 'PURCHASE_CARD', source, payment };
  }
  const goldCellId = game.board.find((c) => c.token === 'gold')?.id;
  if (goldCellId && market[0] && canReserveCard(game, p.id, market[0], goldCellId).ok) return { type: 'RESERVE_CARD', source: market[0], goldCellId };
  const pearls = (ids: string[]) => ids.filter((id) => game.board.find((c) => c.id === id)?.token === 'pearl').length;
  const order = (ids: string[]) => ids.map((id) => game.board.findIndex((c) => c.id === id)).sort((a, b) => a - b);
  const lines = tokenLines(game).sort((a, b) => {
    const x = order(a), y = order(b);
    return b.length - a.length || pearls(b) - pearls(a) || x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  if (lines[0]) return { type: 'TAKE_TOKENS', cellIds: lines[0] };
  if (canReplenishBoard(game, p.id).ok) return { type: 'REPLENISH_BOARD' };
  return null;
}
