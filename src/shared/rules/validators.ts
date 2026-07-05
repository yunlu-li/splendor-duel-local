import type { CardLevel, GameState, PayableTokenColor, PlayerState, TokenColor, TokenCounts } from '../types/game.ts';
import type { CardSource, ValidationResult } from './actions.ts';
import { fail, ok } from './actions.ts';
import { getJewelCard } from './cards.ts';
import { bonusCounts } from './scoring.ts';

const PAYABLE_COLORS: PayableTokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl'];
const TOKEN_COLORS: TokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl', 'gold'];
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player;
}

export function getOpponent(state: GameState, playerId: string): PlayerState {
  const opponent = state.players.find((item) => item.id !== playerId);
  if (!opponent) throw new Error(`Unknown opponent for player: ${playerId}`);
  return opponent;
}

export function tokenTotal(tokens: TokenCounts): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + (tokens[color] ?? 0), 0);
}

export function playerTokenTotal(player: PlayerState): number {
  return tokenTotal(player.tokens);
}

function ensureTurn(state: GameState, playerId: string): ValidationResult {
  if (state.status !== 'playing') return fail('游戏已经结束');
  if (state.currentPlayerId !== playerId) return fail('还没有轮到你');
  if (state.awaitingChoice) return fail('需要先完成当前选择');
  return ok();
}

function findCell(state: GameState, cellId: string) {
  return state.board.find((cell) => cell.id === cellId);
}

export function canSpendPrivilegeTakeToken(state: GameState, playerId: string, cellId: string): ValidationResult {
  const turn = ensureTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.turnPhase !== 'optional') return fail('当前不是可选行动阶段');
  if (state.optionalReplenishedThisTurn) return fail('补充棋盘后不能再花特权拿 token');
  const player = getPlayer(state, playerId);
  if (player.privileges <= 0) return fail('没有特权卷轴');
  const cell = findCell(state, cellId);
  if (!cell?.token) return fail('该格没有 token');
  if (cell.token === 'gold') return fail('不能用特权拿黄金 token');
  return ok();
}

export function canReplenishBoard(state: GameState, playerId: string): ValidationResult {
  const turn = ensureTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.turnPhase !== 'optional' && state.turnPhase !== 'mandatory') return fail('当前阶段不能补充棋盘');
  if (state.bag.length === 0) return fail('袋中没有 token');
  if (!state.board.some((cell) => cell.token === null)) return fail('棋盘没有空位');
  return ok();
}

export function canTakeTokens(state: GameState, playerId: string, cellIds: string[]): ValidationResult {
  const turn = ensureTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.turnPhase !== 'mandatory' && state.turnPhase !== 'optional') return fail('当前不能执行强制拿 token');
  if (cellIds.length < 1 || cellIds.length > 3) return fail('必须拿 1 到 3 个 token');
  if (new Set(cellIds).size !== cellIds.length) return fail('不能重复选择同一格');

  const cells = cellIds.map((id) => findCell(state, id));
  if (cells.some((cell) => !cell?.token)) return fail('所选格子必须都有 token');
  if (cells.some((cell) => cell?.token === 'gold')) return fail('强制拿 token 不能拿黄金');
  if (cells.length === 1) return ok();

  const points = cells.map((cell) => cell!.pos);
  for (const [dx, dy] of DIRECTIONS) {
    for (const start of points) {
      const expected = new Set(points.map((point) => `${point.x},${point.y}`));
      let matchesForward = true;
      let matchesBackward = true;
      for (let step = 0; step < points.length; step += 1) {
        if (!expected.has(`${start.x + dx * step},${start.y + dy * step}`)) matchesForward = false;
        if (!expected.has(`${start.x - dx * step},${start.y - dy * step}`)) matchesBackward = false;
      }
      if (matchesForward || matchesBackward) return ok();
    }
  }
  return fail('所选 token 必须相邻、连续且在同一直线/列/对角线上');
}

export function resolveMarketCard(state: GameState, source: Extract<CardSource, { type: 'market' }>) {
  if (!state.market[source.level].includes(source.cardId)) return null;
  return getJewelCard(source.cardId);
}

export function canReserveCard(state: GameState, playerId: string, source: Extract<CardSource, { type: 'market' | 'deck' }>, goldCellId: string): ValidationResult {
  const turn = ensureTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.turnPhase !== 'mandatory' && state.turnPhase !== 'optional') return fail('当前不能保留卡');
  const player = getPlayer(state, playerId);
  if (player.reserved.length >= 3) return fail('保留区已满 3 张');
  const goldCell = findCell(state, goldCellId);
  if (goldCell?.token !== 'gold') return fail('保留卡必须从棋盘拿 1 个黄金 token');
  if (source.type === 'market' && !resolveMarketCard(state, source)) return fail('该市场卡不存在');
  if (source.type === 'deck' && state.decks[source.level].length === 0) return fail('该等级牌堆已空');
  return ok();
}

export function discountedCost(player: PlayerState, cardId: string): Record<PayableTokenColor, number> {
  const card = getJewelCard(cardId);
  const bonuses = bonusCounts(player);
  const result = { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0 };
  for (const color of PAYABLE_COLORS) {
    const discount = color === 'pearl' ? 0 : bonuses[color];
    result[color] = Math.max(0, (card.cost[color] ?? 0) - discount);
  }
  return result;
}

export function canPurchaseCard(state: GameState, playerId: string, source: Extract<CardSource, { type: 'market' | 'reserved' }>, payment: TokenCounts): ValidationResult {
  const turn = ensureTurn(state, playerId);
  if (!turn.ok) return turn;
  if (state.turnPhase !== 'mandatory' && state.turnPhase !== 'optional') return fail('当前不能购买卡');
  const player = getPlayer(state, playerId);
  const cardId = source.cardId;
  if (source.type === 'market' && !state.market[source.level].includes(cardId)) return fail('该市场卡不存在');
  if (source.type === 'reserved' && !player.reserved.includes(cardId)) return fail('该卡不在你的保留区');

  for (const color of TOKEN_COLORS) {
    if ((payment[color] ?? 0) < 0) return fail('支付数量不能为负');
    if ((payment[color] ?? 0) > player.tokens[color]) return fail(`${color} token 不足`);
  }

  const cost = discountedCost(player, cardId);
  let goldNeeded = 0;
  for (const color of PAYABLE_COLORS) {
    const paid = payment[color] ?? 0;
    if (paid > cost[color]) return fail('不能用非黄金 token 超额支付');
    goldNeeded += cost[color] - paid;
  }
  if ((payment.gold ?? 0) !== goldNeeded) return fail('黄金 token 支付数量与缺口不匹配');
  return ok();
}

export function canDiscardTokens(state: GameState, playerId: string, tokens: TokenCounts): ValidationResult {
  if (state.awaitingChoice?.type !== 'DISCARD_TOKENS' || state.awaitingChoice.playerId !== playerId) return fail('当前不需要你弃 token');
  const player = getPlayer(state, playerId);
  for (const color of TOKEN_COLORS) {
    if ((tokens[color] ?? 0) < 0) return fail('弃置数量不能为负');
    if ((tokens[color] ?? 0) > player.tokens[color]) return fail(`${color} token 不足`);
  }
  if (tokenTotal(tokens) !== state.awaitingChoice.excess) return fail(`必须弃掉 ${state.awaitingChoice.excess} 个 token`);
  return ok();
}

export function hasAnyMandatoryAction(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  const cellsWithNonGold = state.board.filter((cell) => cell.token && cell.token !== 'gold');
  if (cellsWithNonGold.length > 0) return true;
  const hasGold = state.board.some((cell) => cell.token === 'gold');
  if (hasGold && player.reserved.length < 3) return true;
  for (const level of [1, 2, 3] as CardLevel[]) {
    for (const cardId of state.market[level]) {
      if (canPurchaseCard(state, playerId, { type: 'market', level, cardId }, suggestPaymentFor(player, cardId)).ok) return true;
    }
  }
  for (const cardId of player.reserved) {
    if (canPurchaseCard(state, playerId, { type: 'reserved', cardId }, suggestPaymentFor(player, cardId)).ok) return true;
  }
  return false;
}

export function suggestPaymentFor(player: PlayerState, cardId: string): TokenCounts {
  const cost = discountedCost(player, cardId);
  const payment: TokenCounts = {};
  let gold = player.tokens.gold;
  for (const color of PAYABLE_COLORS) {
    const spend = Math.min(player.tokens[color], cost[color]);
    payment[color] = spend;
    gold -= cost[color] - spend;
  }
  payment.gold = Math.max(0, player.tokens.gold - Math.max(0, gold));
  return payment;
}
