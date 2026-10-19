import { describe, expect, it } from 'vitest';
import type { GameAction } from '../shared/rules/actions';
import { validateActionShape, validTokenCounts } from '../shared/rules/actions';
import { initializeGame } from '../shared/rules/initialize';
import { applyAction, IllegalActionError } from '../shared/rules/reducers';
import { canDiscardTokens, canPurchaseCard } from '../shared/rules/validators';
import { ALL_TOKENS } from '../shared/constants/board';
import { actingPlayerId, canHumanControl, localViewerId } from '../client/gameAccess';
import { outcomeFactors } from '../shared/bot/outcome';

const action = (value: unknown) => value as GameAction;
function fixture() {
  const s = initializeGame('stability');
  s.currentPlayerId = 'p1';
  return s;
}

describe('runtime action boundary', () => {
  it.each([0.5, -1, NaN, Infinity, '1', undefined, Number.MAX_SAFE_INTEGER + 1])('rejects invalid token count %s before any mutation', (value) => {
    const s = fixture();
    const before = structuredClone(s);
    const payment = { blue: value };
    expect(validTokenCounts(payment)).toBe(false);
    expect(canPurchaseCard(s, 'p1', { type: 'market', level: 1, cardId: s.market[1][0] }, payment as never).ok).toBe(false);
    expect(() => applyAction(s, 'p1', action({ type: 'PURCHASE_CARD', source: { type: 'market', level: 1, cardId: s.market[1][0] }, payment }))).toThrow(IllegalActionError);
    s.awaitingChoice = { type: 'DISCARD_TOKENS', playerId: 'p1', excess: 1 };
    expect(canDiscardTokens(s, 'p1', payment as never).ok).toBe(false);
    s.awaitingChoice = null;
    expect(s).toEqual(before);
  });

  it.each([null, [], {}, { type: 'UNKNOWN' }, { type: 'TAKE_TOKENS', cellIds: 'b1' },
    { type: 'RESERVE_CARD', source: { type: 'deck', level: 4 }, goldCellId: 'b1' },
    { type: 'PURCHASE_CARD', source: null, payment: {} },
    { type: 'DISCARD_TOKENS', tokens: { ruby: 1 } }])('rejects malformed action %j with a controlled rule error', (value) => {
    expect(validateActionShape(value).ok).toBe(false);
    expect(() => applyAction(fixture(), 'p1', action(value))).toThrow(IllegalActionError);
  });

  it('rejects fractional payment that previously created a token', () => {
    const s = fixture();
    const old = s.market[1][0];
    if (!s.market[1].includes('l1-01')) {
      const slot = s.decks[1].indexOf('l1-01');
      s.decks[1][slot] = old;
      s.market[1][0] = 'l1-01';
    }
    for (const color of ['blue', 'green', 'red', 'black', 'gold'] as const) {
      s.board.find((c) => c.token === color)!.token = null;
      s.players[0].tokens[color] = 1;
    }
    const before = structuredClone(s);
    expect(() => applyAction(s, 'p1', action({ type: 'PURCHASE_CARD', source: { type: 'market', level: 1, cardId: 'l1-01' }, payment: { blue: 0.5, green: 1, red: 1, black: 1, gold: 0.5 } }))).toThrow(IllegalActionError);
    expect(s).toEqual(before);
  });

  it('rejects gold theft and unknown colors', () => {
    const s = fixture();
    s.awaitingChoice = { type: 'CHOOSE_STEAL_TOKEN', playerId: 'p1' };
    s.players[1].tokens.gold = 1;
    for (const token of ['gold', 'ruby', '__proto__']) expect(() => applyAction(s, 'p1', action({ type: 'CHOOSE_STEAL_TOKEN', token }))).toThrow(IllegalActionError);
  });

  it('only associates the pending card with a previously owned bonus color', () => {
    const s = fixture();
    s.players[0].purchased = [{ cardId: 'l1-01' }, { cardId: 'l1-29', copiedBonusColor: 'white' }, { cardId: 'l1-26' }];
    s.awaitingChoice = { type: 'CHOOSE_COPY_BONUS', playerId: 'p1', cardId: 'l1-26' };
    expect(() => applyAction(s, 'p1', { type: 'CHOOSE_COPY_BONUS', cardId: 'l1-29', color: 'white' })).toThrow(IllegalActionError);
    expect(() => applyAction(s, 'p1', { type: 'CHOOSE_COPY_BONUS', cardId: 'l1-26', color: 'blue' })).toThrow(IllegalActionError);
    expect(applyAction(s, 'p1', { type: 'CHOOSE_COPY_BONUS', cardId: 'l1-26', color: 'white' }).players[0].purchased[2].copiedBonusColor).toBe('white');
  });

  it('rejects special effects from another player or after game over', () => {
    const s = fixture();
    s.awaitingChoice = { type: 'CHOOSE_MATCHING_TOKEN', playerId: 'p1', color: 'blue' };
    expect(() => applyAction(s, 'p2', { type: 'SKIP_EFFECT' })).toThrow(IllegalActionError);
    s.status = 'finished';
    expect(() => applyAction(s, 'p1', { type: 'SKIP_EFFECT' })).toThrow(IllegalActionError);
  });
});

describe('refill randomness and private log', () => {
  it('mixes tokens before refilling, preserves totals and supports deterministic replay', () => {
    const layouts = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const s = initializeGame(`refill-${index}`);
      s.currentPlayerId = 'p1';
      s.board.forEach((c) => { c.token = null; });
      s.bag = [...ALL_TOKENS];
      const next = applyAction(s, 'p1', { type: 'REPLENISH_BOARD' });
      expect(next).toEqual(applyAction(s, 'p1', { type: 'REPLENISH_BOARD' }));
      expect(next.refillCount).toBe(1);
      expect(s.refillCount).toBe(0);
      expect(next.board.map((c) => c.token).sort()).toEqual([...ALL_TOKENS].sort());
      expect(next.bag).toHaveLength(0);
      layouts.add(next.board.map((c) => c.token).join(','));
    }
    expect(layouts.size).toBeGreaterThan(1);
  });

  it('does not disclose a blind reservation in the shared log', () => {
    const s = fixture();
    const secret = s.decks[1][0];
    const goldCellId = s.board.find((c) => c.token === 'gold')!.id;
    const next = applyAction(s, 'p1', { type: 'RESERVE_CARD', source: { type: 'deck', level: 1 }, goldCellId });
    expect(next.players[0].reserved).toContain(secret);
    expect(next.log.at(-1)).not.toContain(secret);
  });
});

describe('human identity and complete-action scoring', () => {
  it('fixes the human to p1 in bot mode, including special choices', () => {
    const s = fixture();
    s.currentPlayerId = 'p2';
    expect(localViewerId(s, true)).toBe('p1');
    expect(canHumanControl(s, 'p2', true)).toBe(false);
    expect(canHumanControl(s, 'p1', true)).toBe(false);
    s.awaitingChoice = { type: 'CHOOSE_COPY_BONUS', playerId: 'p2', cardId: 'l1-26' };
    expect(canHumanControl(s, actingPlayerId(s), true)).toBe(false);
  });
  it('allows both local seats on their own turns and blocks game-over input', () => {
    const s = fixture();
    for (const id of ['p1', 'p2']) {
      s.currentPlayerId = id;
      expect(localViewerId(s, false)).toBe(id);
      expect(canHumanControl(s, id, false)).toBe(true);
    }
    s.status = 'finished';
    expect(canHumanControl(s, 'p2', false)).toBe(false);
  });
  it('scores the same extra-turn outcome regardless of the preceding optional step', () => {
    const s = fixture();
    s.currentPlayerId = 'p1';
    const extra = outcomeFactors(s, 'p1', { type: 'PURCHASE_CARD', source: { type: 'market', level: 1, cardId: 'l1-03' }, payment: {} });
    expect(extra['额外回合']).toBe(5);
    expect(outcomeFactors(s, 'p1')['额外回合']).toBe(extra['额外回合']);
    expect(outcomeFactors(s, 'p1', { type: 'RESERVE_CARD', source: { type: 'deck', level: 1 }, goldCellId: 'b0' })['盲保不确定性']).toBe(-2);
    s.awaitingChoice = { type: 'CHOOSE_MATCHING_TOKEN', playerId: 'p1', color: 'white' };
    expect(outcomeFactors(s, 'p1')['额外回合']).toBe(0);
  });
});
