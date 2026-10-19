import type { GameState } from '../types/game.ts';
import { applyAction } from '../rules/reducers.ts';
import { legalActions } from './legalActions.ts';
import { utility } from './evaluate.ts';

/** Abilities, royal selection and discards must finish before evaluating victory. */
export function resolveChoices(game: GameState, playerId: string, score = (state: GameState) => utility(state, playerId)): GameState {
  if (!game.awaitingChoice || game.status === 'finished') return game;
  let actions = legalActions(game, game.awaitingChoice.playerId);
  if (game.awaitingChoice.type === 'DISCARD_TOKENS' && actions.length > 6) {
    // Discard changes no victory counters. Rank allocations without cloning the full board/decks.
    const actor = game.awaitingChoice.playerId;
    actions = actions.map((action) => {
      if (action.type !== 'DISCARD_TOKENS') return { action, value: -Infinity };
      const players = game.players.map((p) => p.id !== actor ? p : {
        ...p, tokens: Object.fromEntries(Object.entries(p.tokens).map(([c, n]) => [c, n - (action.tokens[c as keyof typeof action.tokens] ?? 0)])),
      }) as GameState['players'];
      return { action, value: score({ ...game, players }) };
    }).sort((a, b) => b.value - a.value).slice(0, 6).map((c) => c.action);
  }
  let best = game;
  let bestScore = -Infinity;
  for (const action of actions) {
    const next = resolveChoices(applyAction(game, game.awaitingChoice.playerId, action), playerId, score);
    const value = next.winner?.winnerId === playerId ? Infinity : score(next);
    if (value > bestScore) { best = next; bestScore = value; }
    if (value === Infinity) break;
  }
  return best;
}
