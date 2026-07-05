import { ALL_TOKENS, createEmptyBoard } from '../constants/board.ts';
import { JEWEL_CARDS, ROYAL_CARDS } from '../constants/cards.local.ts';
import type { CardLevel, GameState, PlayerState, TokenColor } from '../types/game.ts';
import { createRng, shuffle } from './random.ts';

const MARKET_SIZE: Record<CardLevel, number> = { 1: 5, 2: 4, 3: 3 };

function emptyTokens(): Required<Record<TokenColor, number>> {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0, gold: 0 };
}

function createPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    tokens: emptyTokens(),
    privileges: 0,
    purchased: [],
    reserved: [],
    royals: [],
  };
}

export function initializeGame(seed: string, playerNames: [string, string] = ['玩家 A', '玩家 B']): GameState {
  const rng = createRng(seed);
  const players: [PlayerState, PlayerState] = [createPlayer('p1', playerNames[0]), createPlayer('p2', playerNames[1])];

  const firstIndex = rng() < 0.5 ? 0 : 1;
  const secondIndex = firstIndex === 0 ? 1 : 0;
  players[secondIndex].privileges = 1;

  const decks = { 1: [] as string[], 2: [] as string[], 3: [] as string[] };
  const market = { 1: [] as string[], 2: [] as string[], 3: [] as string[] };

  ([1, 2, 3] as CardLevel[]).forEach((level) => {
    const shuffled = shuffle(
      JEWEL_CARDS.filter((card) => card.level === level).map((card) => card.id),
      rng,
    );
    market[level] = shuffled.splice(0, MARKET_SIZE[level]);
    decks[level] = shuffled;
  });

  const tokenStack = shuffle(ALL_TOKENS, rng);
  const board = createEmptyBoard();
  for (const cell of board) {
    cell.token = tokenStack.shift() ?? null;
  }

  return {
    seed,
    status: 'playing',
    players,
    currentPlayerId: players[firstIndex].id,
    turnPhase: 'optional',
    optionalReplenishedThisTurn: false,
    extraTurnPlayerId: null,
    board,
    bag: tokenStack,
    decks,
    market,
    availableRoyals: shuffle(ROYAL_CARDS.map((card) => card.id), rng),
    publicPrivileges: 2,
    awaitingChoice: null,
    pendingRoyalCheck: null,
    winner: null,
    log: [`${players[firstIndex].name} 先手，${players[secondIndex].name} 获得 1 个特权卷轴。`],
  };
}
