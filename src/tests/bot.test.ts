import { describe, expect, it } from 'vitest';
import { chooseBotAction } from '../shared/bot/chooseAction';
import { legalActions, tokenLines } from '../shared/bot/legalActions';
import { observeGame } from '../shared/bot/observation';
import { resolveChoices } from '../shared/bot/resolveChoice';
import { hasPublicWinningPurchase } from '../shared/bot/threats';
import { initializeGame } from '../shared/rules/initialize';
import { applyAction } from '../shared/rules/reducers';
import { canTakeTokens, discountedCost } from '../shared/rules/validators';
import { JEWEL_CARDS } from '../shared/constants/cards.local';
import type { GameState, TokenColor } from '../shared/types/game';

function fixture(): GameState {
  const s = initializeGame('tactics');
  s.currentPlayerId = 'p1';
  s.market = { 1: [], 2: [], 3: [] };
  s.decks = { 1: [], 2: [], 3: [] };
  s.board.forEach((c) => { c.token = null; });
  s.bag = [];
  s.players.forEach((p) => { p.privileges = 0; });
  s.publicPrivileges = 3;
  return s;
}
function put(s: GameState, x: number, y: number, token: TokenColor): string {
  const c = s.board.find((c) => c.pos.x === x && c.pos.y === y)!;
  c.token = token;
  return c.id;
}
function nearingWin(s: GameState, index = 0) {
  s.players[index].purchased = ['l2-24', 'l3-01', 'l3-03', 'l3-05', 'l3-07'].map((cardId) => ({ cardId })); // 17 points, 8 crowns
  s.players[index].royals = [];
  s.availableRoyals = [];
}

describe('bot legal actions', () => {
  it('enumerates exactly the legal 1–3 token lines without gold or gaps', () => {
    const s = initializeGame('lines');
    const actual = new Set(tokenLines(s).map((ids) => [...ids].sort().join(',')));
    const expected = new Set<string>();
    const cells = s.board;
    for (let i = 0; i < cells.length; i++) for (let j = i; j < cells.length; j++) for (let k = j; k < cells.length; k++) {
      const ids = [...new Set([cells[i].id, cells[j].id, cells[k].id])];
      if (canTakeTokens(s, s.currentPlayerId, ids).ok) expected.add(ids.sort().join(','));
    }
    expect(actual).toEqual(expected);
    expect(actual.size).toBe(tokenLines(s).length);
  });
  it('all enumerated actions apply through the authoritative engine', () => {
    for (let i = 0; i < 12; i++) {
      const s = initializeGame(`legal-${i}`);
      for (const a of legalActions(s)) expect(() => applyAction(s, s.currentPlayerId, a)).not.toThrow();
    }
  });
  it('includes alternative gold payments that preserve pearl', () => {
    const s = fixture();
    s.market[1] = ['l1-28'];
    s.players[0].tokens = { white: 0, blue: 0, green: 0, red: 4, black: 0, pearl: 1, gold: 1 };
    const buys = legalActions(s).filter((a) => a.type === 'PURCHASE_CARD');
    expect(buys.some((a) => a.type === 'PURCHASE_CARD' && a.payment.pearl === 0 && a.payment.gold === 1)).toBe(true);
  });
});

describe('bot tactics and choices', () => {
  it.each(['friendly', 'competitive'] as const)('takes a reserved immediate win before market purchases (%s)', (difficulty) => {
    const s = fixture();
    nearingWin(s);
    s.players[0].reserved = ['l1-28'];
    s.players[0].tokens.red = 4;
    s.players[0].tokens.pearl = 1;
    s.market[1] = ['l1-01'];
    Object.assign(s.players[0].tokens, { blue: 1, green: 1, black: 1 });
    const decision = chooseBotAction(s, difficulty)!;
    expect(decision.action).toMatchObject({ type: 'PURCHASE_CARD', source: { type: 'reserved', cardId: 'l1-28' } });
    expect(resolveChoices(applyAction(s, 'p1', decision.action), 'p1').winner?.winnerId).toBe('p1');
  });
  it('reserves an opponent winning card when buying it is impossible', () => {
    const s = fixture();
    nearingWin(s, 1);
    s.players[1].tokens.red = 4;
    s.players[1].tokens.pearl = 1;
    s.market[1] = ['l1-28', 'l1-01'];
    put(s, 2, 2, 'gold');
    put(s, 3, 2, 'blue');
    expect(hasPublicWinningPurchase(s, 'p2', new Set(['l1-28']))).toBe(true);
    const decision = chooseBotAction(s)!;
    expect(decision.action).toMatchObject({ type: 'RESERVE_CARD', source: { cardId: 'l1-28' } });
    expect(decision.explanation).toContain('打断');
  });
  it('uses a privilege to complete a winning purchase', () => {
    const s = fixture();
    nearingWin(s);
    s.market[1] = ['l1-28'];
    s.players[0].tokens.red = 4;
    s.players[0].privileges = 1;
    const cellId = put(s, 2, 2, 'pearl');
    expect(chooseBotAction(s)!.action).toEqual({ type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId });
  });
  it('evaluates royal points after crossing a crown threshold', () => {
    const s = fixture();
    s.players[0].purchased = ['l3-13', 'l2-24', 'l1-28', 'l3-01', 'l1-16'].map((cardId) => ({ cardId })); //17 points,2 crowns
    s.market[3] = ['l3-11']; // +3 crowns, then choose royal
    s.players[0].tokens.black = 4;
    s.players[0].tokens.gold = discountedCost(s.players[0], 'l3-11').black - 4;
    s.availableRoyals = initializeGame('royals').availableRoyals;
    const d = chooseBotAction(s)!;
    expect(d.action.type).toBe('PURCHASE_CARD');
    const result = resolveChoices(applyAction(s, 'p1', d.action), 'p1');
    expect(result.winner?.winnerId).toBe('p1');
    expect(result.players[0].royals).toHaveLength(1);
  });
  it('associates a joker with the color that wins immediately', () => {
    const s = fixture();
    s.players[0].purchased = ['l3-02', 'l3-01', 'l1-01', 'l1-06', 'l3-12'].map((cardId) => ({ cardId }));
    s.awaitingChoice = { type: 'CHOOSE_COPY_BONUS', playerId: 'p1', cardId: 'l3-12' };
    expect(chooseBotAction(s)!.action).toMatchObject({ type: 'CHOOSE_COPY_BONUS', color: 'white' });
  });
  it('discards redundant gems while keeping a needed pearl and gold', () => {
    const s = fixture();
    s.market[1] = ['l1-28'];
    Object.assign(s.players[0].tokens, { white: 5, red: 4, pearl: 1, gold: 1 });
    s.awaitingChoice = { type: 'DISCARD_TOKENS', playerId: 'p1', excess: 1 };
    const d = chooseBotAction(s)!;
    expect(d.action).toMatchObject({ type: 'DISCARD_TOKENS', tokens: { white: 1 } });
    const next = applyAction(s, 'p1', d.action);
    expect(next.players[0].tokens.pearl).toBe(1);
    expect(next.players[0].tokens.gold).toBe(1);
  });
  it('replenishes when the current board cannot support any mandatory action', () => {
    const s = fixture();
    s.bag = ['white', 'blue', 'red'];
    expect(chooseBotAction(s)!.action).toEqual({ type: 'REPLENISH_BOARD' });
  });
});

describe('bot information boundary', () => {
  it('ignores real hidden cards, draw order, bag order, seed and private log', () => {
    const a = initializeGame('privacy');
    a.currentPlayerId = 'p1';
    a.players[1].reserved = [a.decks[1].pop()!];
    a.bag = ['white', 'blue'];
    const b = structuredClone(a);
    b.seed = 'another-hidden-seed';
    b.log = ['secret card'];
    b.bag.reverse();
    b.players[1].reserved = [JEWEL_CARDS.find((c) => !a.market[1].includes(c.id))!.id];
    Object.values(b.decks).forEach((deck) => deck.reverse());
    expect(observeGame(a, 'p1')).toEqual(observeGame(b, 'p1'));
    expect(chooseBotAction(a)).toEqual(chooseBotAction(b));
    expect(a.players[1].reserved).toHaveLength(1); // input stays untouched
  });
  it('is deterministic for each difficulty', () => {
    const s = initializeGame('repeat');
    for (const difficulty of ['friendly', 'competitive'] as const) expect(chooseBotAction(s, difficulty)).toEqual(chooseBotAction(s, difficulty));
  });
});

describe('complete-action score consistency', () => {
  it('credits an extra turn after either direct purchase or privilege then purchase', () => {
    const s = fixture();
    s.players[0].purchased = [{ cardId: 'l2-08' }, { cardId: 'l2-12' }];
    s.players[0].privileges = 1;
    s.publicPrivileges = 2;
    s.market[1] = ['l1-03'];
    s.market[3] = ['l3-02', 'l3-06'];
    const cellId = put(s, 2, 2, 'pearl');
    const optional = chooseBotAction(s)!;
    expect(optional.action).toEqual({ type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId });
    expect(optional.factors['额外回合']).toBe(5);
    const next = applyAction(s, 'p1', optional.action);
    const direct = chooseBotAction(next)!;
    expect(direct.action).toMatchObject({ type: 'PURCHASE_CARD', source: { cardId: 'l1-03' } });
    expect(direct.factors['额外回合']).toBe(5);
    for (const d of [optional, direct]) expect(Object.values(d.factors).reduce((a, b) => a + b, 0)).toBeCloseTo(d.score, 8);
  });
});
