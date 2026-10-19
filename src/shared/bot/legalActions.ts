import type { GameAction } from '../rules/actions.ts';
import type { GameState, TokenCounts } from '../types/game.ts';
import { bonusCounts } from '../rules/scoring.ts';
import { canPurchaseCard, canReplenishBoard, canReserveCard, canSpendPrivilegeTakeToken, canTakeTokens, discountedCost, getPlayer } from '../rules/validators.ts';
import { GEMS, LEVELS, PAYABLE, TOKENS } from './config.ts';

export function tokenLines(game: GameState): string[][] {
  const lines: string[][] = [];
  const positions = new Map(game.board.map((cell) => [`${cell.pos.x},${cell.pos.y}`, cell]));
  for (const cell of game.board) {
    if (!cell.token || cell.token === 'gold') continue;
    lines.push([cell.id]);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const ids = [cell.id];
      for (let step = 1; step < 3; step++) {
        const next = positions.get(`${cell.pos.x + dx * step},${cell.pos.y + dy * step}`);
        if (!next?.token || next.token === 'gold') break;
        ids.push(next.id);
        lines.push([...ids]);
      }
    }
  }
  return lines;
}

/** Enumerate exact payments, including spending gold to preserve a useful colored token. */
export function purchaseActions(game: GameState, playerId: string): GameAction[] {
  const player = getPlayer(game, playerId);
  const sources = [
    ...LEVELS.flatMap((level) => game.market[level].map((cardId) => ({ type: 'market' as const, level, cardId }))),
    ...player.reserved.map((cardId) => ({ type: 'reserved' as const, cardId })),
  ];
  const actions: GameAction[] = [];
  for (const source of sources) {
    const cost = discountedCost(player, source.cardId);
    const visit = (index: number, gold: number, payment: TokenCounts) => {
      if (gold > player.tokens.gold) return;
      if (index === PAYABLE.length) {
        const exact = { ...payment, gold };
        if (canPurchaseCard(game, playerId, source, exact).ok) actions.push({ type: 'PURCHASE_CARD', source, payment: exact });
        return;
      }
      const color = PAYABLE[index];
      for (let count = Math.min(cost[color], player.tokens[color]); count >= 0; count--) {
        visit(index + 1, gold + cost[color] - count, { ...payment, [color]: count });
      }
    };
    visit(0, 0, {});
  }
  return actions;
}

export function legalActions(game: GameState, playerId = game.awaitingChoice?.playerId ?? game.currentPlayerId): GameAction[] {
  if (game.status !== 'playing') return [];
  const player = getPlayer(game, playerId);
  const choice = game.awaitingChoice;
  if (choice) {
    if (choice.playerId !== playerId) return [];
    if (choice.type === 'CHOOSE_ROYAL') return game.availableRoyals.map((royalCardId) => ({ type: 'CHOOSE_ROYAL', royalCardId }));
    if (choice.type === 'DISCARD_TOKENS') {
      const actions: GameAction[] = [];
      const visit = (index: number, remaining: number, tokens: TokenCounts) => {
        if (!remaining) { actions.push({ type: 'DISCARD_TOKENS', tokens }); return; }
        if (index === TOKENS.length) return;
        const color = TOKENS[index];
        for (let n = 0; n <= Math.min(remaining, player.tokens[color]); n++) visit(index + 1, remaining - n, { ...tokens, [color]: n });
      };
      visit(0, choice.excess, {});
      return actions;
    }
    const actions: GameAction[] = [{ type: 'SKIP_EFFECT' }];
    if (choice.type === 'CHOOSE_STEAL_TOKEN') {
      const other = game.players.find((p) => p.id !== playerId)!;
      for (const token of PAYABLE) if (other.tokens[token] > 0) actions.push({ type: 'CHOOSE_STEAL_TOKEN', token });
    }
    if (choice.type === 'CHOOSE_MATCHING_TOKEN') {
      for (const cell of game.board) if (cell.token === choice.color) actions.push({ type: 'CHOOSE_MATCHING_TOKEN', cellId: cell.id });
    }
    if (choice.type === 'CHOOSE_COPY_BONUS') {
      // Match the association choices offered by the existing UI, excluding the unresolved card.
      const counts = bonusCounts({ ...player, purchased: player.purchased.filter((c) => c.cardId !== choice.cardId) });
      for (const color of GEMS) if (counts[color] > 0) actions.push({ type: 'CHOOSE_COPY_BONUS', cardId: choice.cardId, color });
    }
    return actions;
  }
  if (game.currentPlayerId !== playerId) return [];
  const actions = purchaseActions(game, playerId);
  for (const cellIds of tokenLines(game)) if (canTakeTokens(game, playerId, cellIds).ok) actions.push({ type: 'TAKE_TOKENS', cellIds });
  for (const cell of game.board) {
    if (canSpendPrivilegeTakeToken(game, playerId, cell.id).ok) actions.push({ type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId: cell.id });
    if (cell.token !== 'gold') continue;
    for (const level of LEVELS) {
      const sources = [...game.market[level].map((cardId) => ({ type: 'market' as const, level, cardId })), { type: 'deck' as const, level }];
      for (const source of sources) if (canReserveCard(game, playerId, source, cell.id).ok) actions.push({ type: 'RESERVE_CARD', source, goldCellId: cell.id });
    }
  }
  if (canReplenishBoard(game, playerId).ok) actions.push({ type: 'REPLENISH_BOARD' });
  return actions;
}
