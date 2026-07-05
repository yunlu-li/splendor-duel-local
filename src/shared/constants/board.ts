import type { BoardCell, BoardPos, TokenColor } from '../types/game.ts';

// Splendor Duel uses a 5x5 square token board. Refill starts at the center
// and follows the printed spiral order. Coordinates are zero-based x/y.
export const BOARD_SPIRAL: readonly BoardPos[] = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 3, y: 3 },
  { x: 2, y: 3 },
  { x: 1, y: 3 },
  { x: 1, y: 2 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 2 },
  { x: 4, y: 3 },
  { x: 4, y: 4 },
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 1, y: 4 },
  { x: 0, y: 4 },
  { x: 0, y: 3 },
  { x: 0, y: 2 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 4, y: 0 },
] as const;

export const ALL_TOKENS: readonly TokenColor[] = [
  'white', 'white', 'white', 'white',
  'blue', 'blue', 'blue', 'blue',
  'green', 'green', 'green', 'green',
  'red', 'red', 'red', 'red',
  'black', 'black', 'black', 'black',
  'pearl', 'pearl',
  'gold', 'gold', 'gold',
] as const;

export function createEmptyBoard(): BoardCell[] {
  return BOARD_SPIRAL.map((pos, index) => ({
    id: `b${index}`,
    pos,
    token: null,
  }));
}
