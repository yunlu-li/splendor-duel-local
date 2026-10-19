import type { GameAction } from '../rules/actions.ts';
import type { GameState } from '../types/game.ts';
import { applyAction } from '../rules/reducers.ts';
import { createRng } from '../rules/random.ts';
import { getOpponent, getPlayer, discountedCost } from '../rules/validators.ts';
import { LEVELS } from './config.ts';
import { evaluate, utility, boardRisk, cardGap, targetCards } from './evaluate.ts';
import { explain } from './explain.ts';
import { legalActions } from './legalActions.ts';
import { observeGame } from './observation.ts';
import { getBotPhase } from './phase.ts';
import { outcomeFactors, outcomeValue } from './outcome.ts';
import { resolveChoices } from './resolveChoice.ts';
import { hasPublicWinningPurchase } from './threats.ts';
import type { BotDecision, BotDifficulty } from './types.ts';

interface Candidate { action: GameAction; mainAction?: GameAction; state: GameState; value: number; win: boolean; danger: boolean; optional: boolean; risk?: number }
const isOptional = (a: GameAction) => a.type === 'SPEND_PRIVILEGE_TAKE_TOKEN' || a.type === 'REPLENISH_BOARD';

/** Enumerate all legal actions, then bound the economic branches, never the purchase tactics. */
function searchActions(game: GameState, playerId: string, mainOnly = false): GameAction[] {
  const actions = legalActions(game, playerId);
  if (game.awaitingChoice) return actions;
  const player = getPlayer(game, playerId);
  const targets = targetCards(game, player);
  const needs = new Map(targets.map((id) => [id, discountedCost(player, id)]));
  const cells = new Map(game.board.map((c) => [c.id, c.token]));
  const rank = (action: GameAction): number => {
    if (action.type === 'RESERVE_CARD') return action.source.type === 'deck' ? -10 : 5 / (cardGap(player, action.source.cardId) + 1);
    if (action.type !== 'TAKE_TOKENS') return 0;
    const gains = { ...player.tokens };
    action.cellIds.forEach((id) => { const color = cells.get(id); if (color) gains[color]++; });
    return Math.max(0, ...targets.map((id) => {
      const cost = needs.get(id)!;
      const gap = Math.max(0, Object.entries(cost).reduce((sum, [c, n]) => sum + Math.max(0, n - gains[c as keyof typeof gains]), 0) - gains.gold);
      return 5 / (gap + 1);
    })) + action.cellIds.length * 0.12;
  };
  const takes = actions.filter((a) => a.type === 'TAKE_TOKENS').map((action) => ({ action, rank: rank(action) })).sort((a, b) => b.rank - a.rank).slice(0, 8).map((c) => c.action);
  const reserves = actions.filter((a) => a.type === 'RESERVE_CARD').map((action) => ({ action, rank: rank(action) })).sort((a, b) => b.rank - a.rank).slice(0, 4).map((c) => c.action);
  // All public reservations remain available in the endgame so defensive locks cannot be pruned.
  const locks = getBotPhase(game) === 'late' ? actions.filter((a) => a.type === 'RESERVE_CARD' && a.source.type === 'market') : reserves;
  return [...actions.filter((a) => a.type === 'PURCHASE_CARD' || (!mainOnly && isOptional(a))), ...takes, ...locks];
}

export function chooseBotAction(input: GameState, difficulty: BotDifficulty = 'competitive'): BotDecision | null {
  if (input.status !== 'playing') return null;
  const playerId = input.awaitingChoice?.playerId ?? input.currentPlayerId;
  const game = observeGame(input, playerId);
  const otherId = getOpponent(game, playerId).id;
  const phase = getBotPhase(game);
  const valueOf = (state: GameState) => utility(state, playerId, phase);
  const publicCards = new Set(LEVELS.flatMap((level) => game.market[level]));
  const original = evaluate(game, playerId, phase);
  const baseline = Object.values(original).reduce((a, b) => a + b, 0);
  const cache = new Map<string, boolean>();
  const danger = (state: GameState): boolean => {
    if (state.status === 'finished' || state.currentPlayerId === playerId) return false;
    // Immediate purchase threats depend on the opponent's public resources and available
    // colors, not our own payment/discard allocation or the position of equal-color tokens.
    const key = JSON.stringify([getPlayer(state, otherId), LEVELS.map((l) => state.market[l].filter((id) => publicCards.has(id))), state.board.map((c) => c.token).sort(), state.availableRoyals]);
    if (!cache.has(key)) cache.set(key, hasPublicWinningPurchase(state, otherId, publicCards));
    return cache.get(key)!;
  };
  const stateScore = (state: GameState) => valueOf(state) + outcomeValue(state, playerId) - (danger(state) ? 10000 : 0);
  const candidates: Candidate[] = [];
  for (const action of searchActions(game, playerId)) {
    const optional = isOptional(action);
    const state = resolveChoices(applyAction(game, playerId, action), playerId, stateScore);
    candidates.push({ action, mainAction: optional ? undefined : action, state,
      value: valueOf(state) + (optional ? 0 : outcomeValue(state, playerId, action)),
      win: state.winner?.winnerId === playerId, danger: optional ? false : danger(state), optional });
  }
  if (!candidates.length) return null;
  const optionalGroups = new Map<string, Candidate>();
  for (const candidate of candidates.filter((c) => c.optional)) {
    const action = candidate.action;
    const key = action.type === 'SPEND_PRIVILEGE_TAKE_TOKEN'
      ? game.board.find((c) => c.id === action.cellId)?.token ?? '' : 'refill';
    const existing = optionalGroups.get(key);
    if (!existing || boardRisk(candidate.state, playerId) < boardRisk(existing.state, playerId)) optionalGroups.set(key, candidate);
  }
  // Optional actions cannot be compared with completed turns without charging their main action.
  // Keep a bounded beam; include every optional first step, then its best main-action continuation.
  for (const candidate of candidates.filter((c) => c.optional)) {
    let best: Candidate | undefined;
    for (const action of searchActions(candidate.state, playerId, true).filter((a) => a.type === 'PURCHASE_CARD' || [...optionalGroups.values()].includes(candidate))) {
      const state = resolveChoices(applyAction(candidate.state, playerId, action), playerId, stateScore);
      const next = { action, mainAction: action, state, value: valueOf(state) + outcomeValue(state, playerId, action), win: state.winner?.winnerId === playerId, danger: danger(state), optional: false };
      if (!best || compare(next, best) < 0) best = next;
    }
    if (best) {
      candidate.state = best.state;
      candidate.mainAction = best.action;
      candidate.value = best.value - 0.15;
      // A refill is an unknown outcome, so a sampled win cannot become a hard guarantee.
      candidate.win = best.win && candidate.action.type !== 'REPLENISH_BOARD';
      candidate.danger = best.danger;
    } else candidate.value = -Infinity;
  }
  for (let i = candidates.length - 1; i >= 0; i--) if (!Number.isFinite(candidates[i].value)) candidates.splice(i, 1);
  if (!candidates.length) return null;
  candidates.sort(compare);
  if (difficulty === 'competitive') {
    const shortlist = candidates.filter((c) => c.win === candidates[0].win && c.danger === candidates[0].danger).slice(0, 8);
    for (const c of shortlist) {
      c.risk = boardRisk(c.state, playerId) * 0.35;
      c.value -= c.risk;
    }
    shortlist.sort(compare);
    if (shortlist.length) candidates.splice(0, candidates.length, ...shortlist);
  }
  let selected = candidates[0];
  if (difficulty === 'friendly' && !selected.win) {
    const top = candidates.filter((c) => c.danger === selected.danger && Number.isFinite(c.value) && c.value >= selected.value - 2).slice(0, 4);
    const rng = createRng(JSON.stringify([game.board, game.players, game.market, game.awaitingChoice]));
    selected = top[Math.floor(rng() * top.length)] ?? selected;
  }
  const after = evaluate(selected.state, playerId, phase);
  const factors = {
    ...Object.fromEntries(Object.entries(after).map(([key, value]) => [key, value - (original[key] ?? 0)])),
    ...outcomeFactors(selected.state, playerId, selected.mainAction),
    '可选行动成本': selected.optional ? -0.15 : 0,
    '棋盘余留风险': -(selected.risk ?? 0),
  };
  const wasDanger = hasPublicWinningPurchase(game, otherId, publicCards);
  return { action: selected.action, explanation: explain(selected.action, factors, selected.win, wasDanger && !selected.danger),
    score: selected.value - baseline, phase: getBotPhase(game), factors };
}

function compare(a: Candidate, b: Candidate): number {
  return Number(b.win) - Number(a.win) || Number(a.danger) - Number(b.danger) || b.value - a.value;
}
