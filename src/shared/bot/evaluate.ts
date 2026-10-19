import type { GameState, PlayerState, PayableTokenColor } from '../types/game.ts';
import { bonusCounts, sameColorPrestige, totalCrowns, totalPrestige } from '../rules/scoring.ts';
import { getOpponent, getPlayer, playerTokenTotal } from '../rules/validators.ts';
import { getJewelCard } from '../rules/cards.ts';
import { GEMS, LEVELS, PAYABLE, WEIGHTS } from './config.ts';
import { getBotPhase } from './phase.ts';
import { tokenLines } from './legalActions.ts';
import type { BotPhase } from './types.ts';

// Simulated states are immutable; weak caches avoid repeating the same card arithmetic.
const costs = new WeakMap<PlayerState, Map<string, Record<PayableTokenColor, number>>>();
const evaluations = new WeakMap<GameState, Map<string, Record<string, number>>>();
function costFor(player: PlayerState, cardId: string): Record<PayableTokenColor, number> {
  let cache = costs.get(player);
  if (!cache) { cache = new Map(); costs.set(player, cache); }
  let result = cache.get(cardId);
  if (!result) {
    const card = getJewelCard(cardId);
    const bonuses = bonusCounts(player);
    result = Object.fromEntries(PAYABLE.map((c) => [c, Math.max(0, (card.cost[c] ?? 0) - (c === 'pearl' ? 0 : bonuses[c]))])) as Record<PayableTokenColor, number>;
    cache.set(cardId, result);
  }
  return result;
}

export function cardGap(player: PlayerState, cardId: string): number {
  const cost = costFor(player, cardId);
  return Math.max(0, PAYABLE.reduce((sum, color) => sum + Math.max(0, cost[color] - player.tokens[color]), 0) - player.tokens.gold);
}

export function targetCards(game: GameState, player: PlayerState): string[] {
  return [...LEVELS.flatMap((level) => game.market[level]), ...player.reserved];
}

export function resourceValue(game: GameState, player: PlayerState): number {
  const targets = targetCards(game, player).map((id) => ({ id, gap: cardGap(player, id) }))
    .sort((a, b) => a.gap - b.gap).slice(0, 4);
  const need = Object.fromEntries(PAYABLE.map((c) => [c, Math.max(0, ...targets.map(({ id }) => costFor(player, id)[c]))]));
  let value = PAYABLE.reduce((sum, c) => sum + Math.min(player.tokens[c], need[c]) * (c === 'pearl' ? 1.8 : 0.65), 0);
  value += Math.min(player.tokens.gold, Math.max(0, ...targets.map(({ id }) => Object.values(costFor(player, id)).reduce((a, b) => a + b, 0)))) * 1.6;
  return value;
}

/** Absolute state utility; callers compare the difference with the original state. */
export function evaluate(game: GameState, playerId: string, phase: BotPhase = getBotPhase(game)): Record<string, number> {
  const cacheKey = `${playerId}:${phase}`;
  const cached = evaluations.get(game)?.get(cacheKey);
  if (cached) return cached;
  const player = getPlayer(game, playerId);
  const other = getOpponent(game, playerId);
  const w = WEIGHTS[phase];
  const targets = targetCards(game, player);
  const bonuses = bonusCounts(player);
  const color = Math.max(...Object.values(sameColorPrestige(player)));
  const progress = targets.map((id) => {
    const card = getJewelCard(id);
    const value = 3 + card.prestige * 0.65 + card.crowns * 0.7 + (card.ability ? 0.7 : 0);
    return value / (1 + cardGap(player, id));
  }).sort((a, b) => b - a).slice(0, 3).reduce((sum, n, i) => sum + n / (i + 1), 0);
  const engine = GEMS.reduce((sum, c) => {
    const demand = targets.reduce((n, id) => n + Math.min(getJewelCard(id).cost[c] ?? 0, 4), 0) / Math.max(1, targets.length);
    return sum + Math.min(bonuses[c], demand + 1) * w.bonus;
  }, 0);
  const crowns = totalCrowns(player);
  const result = {
    '威望': totalPrestige(player) * w.prestige,
    '王冠': crowns * w.crowns,
    '单色路线': color * w.color + (color >= 7 ? (color - 6) ** 2 : 0),
    '永久折扣': engine,
    '购买进度': progress,
    '可用资源': resourceValue(game, player),
    '王室奖励': player.royals.length * 2,
    '引擎规模': player.purchased.length * 0.6,
    '特权': player.privileges * 2.5 - other.privileges * 3,
    '资源溢出': -Math.max(0, playerTokenTotal(player) - 10) * 5,
    '保留负担': -player.reserved.reduce((sum, id) => sum + Math.max(0, cardGap(player, id) - 2) * 0.55, 0) - (player.reserved.length === 3 ? 2 : 0),
    '对手资源': -resourceValue(game, other) * 0.4,
  };
  if (!evaluations.has(game)) evaluations.set(game, new Map());
  evaluations.get(game)!.set(cacheKey, result);
  return result;
}

export function utility(game: GameState, playerId: string, phase?: BotPhase): number {
  return Object.values(evaluate(game, playerId, phase)).reduce((a, b) => a + b, 0);
}

export function boardRisk(game: GameState, playerId: string): number {
  const other = getOpponent(game, playerId);
  const ids = targetCards(game, other);
  const needs = PAYABLE.map((c) => Math.max(0, ...ids.map((id) => costFor(other, id)[c] - other.tokens[c])));
  const value = new Map(game.board.map((cell) => [cell.id, cell.token && cell.token !== 'gold'
    ? Math.min(2, needs[PAYABLE.indexOf(cell.token)]) * (cell.token === 'pearl' ? 1.2 : 0.5) : 0]));
  return Math.max(0, ...tokenLines(game).map((line) => line.reduce((sum, id) => sum + (value.get(id) ?? 0), 0)));
}
