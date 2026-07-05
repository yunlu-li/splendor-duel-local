import { describe, expect, it } from 'vitest';
import { JEWEL_CARDS, ROYAL_CARDS } from '../shared/constants/cards.local';
import { initializeGame } from '../shared/rules/initialize';

function countMarketCards(game: ReturnType<typeof initializeGame>) {
  return game.market[1].length + game.market[2].length + game.market[3].length;
}

describe('local official card data', () => {
  it('contains 67 jewel cards and 4 royal cards', () => {
    expect(JEWEL_CARDS).toHaveLength(67);
    expect(ROYAL_CARDS).toHaveLength(4);
  });

  it('initializes a deterministic game state', () => {
    const a = initializeGame('same-seed');
    const b = initializeGame('same-seed');
    expect(a.market).toEqual(b.market);
    expect(a.board.map((cell) => cell.token)).toEqual(b.board.map((cell) => cell.token));
    expect(a.board).toHaveLength(25);
    expect(a.bag).toHaveLength(0);
    expect(countMarketCards(a)).toBe(12);
  });
});
