import { JEWEL_CARDS } from '../constants/cards.local.ts';
import { createRng, shuffle } from '../rules/random.ts';
import { getOpponent, getPlayer } from '../rules/validators.ts';
import type { GameState } from '../types/game.ts';
import { LEVELS } from './config.ts';

/** Replace hidden information BEFORE any simulation. Never seed from game.seed or log. */
export function observeGame(input: GameState, playerId: string): GameState {
  const game = structuredClone(input);
  const opponent = getOpponent(game, playerId);
  const hiddenCount = opponent.reserved.length;
  opponent.reserved = [];
  game.seed = '';
  game.log = [];
  const known = new Set([
    ...LEVELS.flatMap((level) => game.market[level]),
    ...game.players.flatMap((p) => p.purchased.map((c) => c.cardId)),
    ...getPlayer(game, playerId).reserved,
  ]);
  const counts = LEVELS.map((level) => game.decks[level].length);
  game.decks = { 1: [], 2: [], 3: [] };
  // The bag composition is public (token conservation), its order is not.
  game.bag.sort();
  const rng = createRng(JSON.stringify({ game, counts, hiddenCount }));
  LEVELS.forEach((level, i) => {
    game.decks[level] = shuffle(JEWEL_CARDS.filter((c) => c.level === level && !known.has(c.id)).map((c) => c.id), rng).slice(0, counts[i]);
  });
  game.bag = shuffle(game.bag, rng);
  return game;
}
