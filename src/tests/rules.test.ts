import { describe, expect, it } from 'vitest';
import type { GameState, TokenColor } from '../shared/types/game';
import { initializeGame } from '../shared/rules/initialize';
import { canSpendPrivilegeTakeToken, canTakeTokens, discountedCost } from '../shared/rules/validators';
import { applyAction, IllegalActionError } from '../shared/rules/reducers';
import { checkVictory, sameColorPrestige } from '../shared/rules/scoring';

function emptyBoardGame(): GameState {
  const game = initializeGame('rules-test');
  game.currentPlayerId = 'p1';
  game.turnPhase = 'mandatory';
  game.board.forEach((cell) => { cell.token = null; });
  game.players.forEach((player) => {
    player.tokens = { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0, gold: 0 };
    player.privileges = 0;
    player.purchased = [];
    player.reserved = [];
    player.royals = [];
  });
  game.publicPrivileges = 3;
  game.bag = [];
  return game;
}

function setCell(game: GameState, x: number, y: number, token: TokenColor) {
  const cell = game.board.find((item) => item.pos.x === x && item.pos.y === y);
  if (!cell) throw new Error('cell not found');
  cell.token = token;
  return cell.id;
}

describe('token line validation on 5x5 board', () => {
  it('allows adjacent straight horizontal, vertical, and diagonal lines', () => {
    let game = emptyBoardGame();
    const horizontal = [setCell(game, 0, 2, 'white'), setCell(game, 1, 2, 'blue'), setCell(game, 2, 2, 'green')];
    expect(canTakeTokens(game, 'p1', horizontal).ok).toBe(true);

    game = emptyBoardGame();
    const vertical = [setCell(game, 3, 0, 'white'), setCell(game, 3, 1, 'blue')];
    expect(canTakeTokens(game, 'p1', vertical).ok).toBe(true);

    game = emptyBoardGame();
    const diagonal = [setCell(game, 1, 1, 'white'), setCell(game, 2, 2, 'blue'), setCell(game, 3, 3, 'green')];
    expect(canTakeTokens(game, 'p1', diagonal).ok).toBe(true);
  });

  it('rejects gold and non-contiguous selections', () => {
    const game = emptyBoardGame();
    const gold = setCell(game, 0, 0, 'gold');
    expect(canTakeTokens(game, 'p1', [gold]).ok).toBe(false);

    const a = setCell(game, 0, 1, 'white');
    const b = setCell(game, 2, 1, 'blue');
    expect(canTakeTokens(game, 'p1', [a, b]).ok).toBe(false);
  });
});

describe('reducers', () => {
  it('spends a privilege to take a selected non-gold token without ending the turn', () => {
    const game = emptyBoardGame();
    game.turnPhase = 'optional';
    game.players[0].privileges = 1;
    game.publicPrivileges = 2;
    const cellId = setCell(game, 1, 1, 'blue');

    expect(canSpendPrivilegeTakeToken(game, 'p1', cellId).ok).toBe(true);

    const next = applyAction(game, 'p1', { type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId });
    const nextCell = next.board.find((cell) => cell.id === cellId);

    expect(next.players[0].privileges).toBe(0);
    expect(next.publicPrivileges).toBe(3);
    expect(next.players[0].tokens.blue).toBe(1);
    expect(nextCell?.token).toBeNull();
    expect(next.currentPlayerId).toBe('p1');
    expect(next.turnPhase).toBe('optional');
  });

  it('gives opponent a privilege when taking three same-color tokens', () => {
    const game = emptyBoardGame();
    const ids = [setCell(game, 0, 0, 'white'), setCell(game, 1, 0, 'white'), setCell(game, 2, 0, 'white')];
    const next = applyAction(game, 'p1', { type: 'TAKE_TOKENS', cellIds: ids });
    expect(next.players[0].tokens.white).toBe(3);
    expect(next.players[1].privileges).toBe(1);
    expect(next.currentPlayerId).toBe('p2');
  });

  it('reserves a market card and takes gold', () => {
    const game = emptyBoardGame();
    game.market[1] = ['l1-01'];
    game.decks[1] = ['l1-02'];
    const goldCellId = setCell(game, 2, 2, 'gold');
    const next = applyAction(game, 'p1', { type: 'RESERVE_CARD', source: { type: 'market', level: 1, cardId: 'l1-01' }, goldCellId });
    expect(next.players[0].reserved).toContain('l1-01');
    expect(next.players[0].tokens.gold).toBe(1);
    expect(next.market[1]).toContain('l1-02');
  });

  it('purchases a card with exact payment and refills the market', () => {
    const game = emptyBoardGame();
    game.market[1] = ['l1-01'];
    game.decks[1] = ['l1-02'];
    game.players[0].tokens.blue = 1;
    game.players[0].tokens.green = 1;
    game.players[0].tokens.red = 1;
    game.players[0].tokens.black = 1;

    const next = applyAction(game, 'p1', {
      type: 'PURCHASE_CARD',
      source: { type: 'market', level: 1, cardId: 'l1-01' },
      payment: { blue: 1, green: 1, red: 1, black: 1 },
    });

    expect(next.players[0].purchased).toEqual([{ cardId: 'l1-01' }]);
    expect(next.bag).toHaveLength(4);
    expect(next.market[1]).toContain('l1-02');
  });

  it('applies copied bonus from associate cards to same-color prestige and discounts', () => {
    const game = emptyBoardGame();
    game.players[0].purchased = [{ cardId: 'l1-01' }];
    game.players[0].tokens.black = 4;
    game.players[0].tokens.pearl = 1;
    game.market[1] = ['l1-26'];
    game.decks[1] = [];

    let next = applyAction(game, 'p1', {
      type: 'PURCHASE_CARD',
      source: { type: 'market', level: 1, cardId: 'l1-26' },
      payment: { black: 4, pearl: 1 },
    });
    expect(next.awaitingChoice?.type).toBe('CHOOSE_COPY_BONUS');

    next = applyAction(next, 'p1', { type: 'CHOOSE_COPY_BONUS', cardId: 'l1-26', color: 'white' });
    expect(next.players[0].purchased.find((owned) => owned.cardId === 'l1-26')?.copiedBonusColor).toBe('white');
    expect(sameColorPrestige(next.players[0]).white).toBe(1);

    const cost = discountedCost(next.players[0], 'l1-02');
    expect(cost.blue).toBe(3);
    expect(cost.white).toBe(0);
  });
});

describe('victory', () => {
  it('detects crown victory', () => {
    const game = emptyBoardGame();
    game.players[0].purchased = [
      { cardId: 'l3-01' },
      { cardId: 'l3-03' },
      { cardId: 'l3-05' },
      { cardId: 'l3-07' },
      { cardId: 'l3-09' },
    ];
    expect(checkVictory(game.players[0])).toEqual({ winnerId: 'p1', reason: 'CROWNS', value: 10 });
  });

  it('throws helpful errors for illegal actions', () => {
    const game = emptyBoardGame();
    expect(() => applyAction(game, 'p2', { type: 'TAKE_TOKENS', cellIds: [] })).toThrow(IllegalActionError);
  });
});
