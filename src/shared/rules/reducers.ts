import type { AbilityType, CardLevel, GameState, GemColor, PlayerState, TokenColor, TokenCounts } from '../types/game.ts';
import type { GameAction } from './actions.ts';
import { canDiscardTokens, canPurchaseCard, canReplenishBoard, canReserveCard, canSpendPrivilegeTakeToken, canTakeTokens, getOpponent, getPlayer, playerTokenTotal } from './validators.ts';
import { getJewelCard, getRoyalCard } from './cards.ts';
import { BOARD_SPIRAL } from '../constants/board.ts';
import { checkVictory, totalCrowns } from './scoring.ts';

const TOKEN_COLORS: TokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl', 'gold'];
const GEM_COLORS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];

export class IllegalActionError extends Error {}

function cloneState(state: GameState): GameState {
  return structuredClone(state) as GameState;
}

function assertOk(result: { ok: boolean; reason?: string }): void {
  if (!result.ok) throw new IllegalActionError(result.reason ?? '非法行动');
}

function cellById(state: GameState, cellId: string) {
  const cell = state.board.find((item) => item.id === cellId);
  if (!cell) throw new IllegalActionError('棋盘格不存在');
  return cell;
}

function addToken(player: PlayerState, token: TokenColor, count = 1): void {
  player.tokens[token] += count;
}

function removeToken(player: PlayerState, token: TokenColor, count = 1): void {
  if (player.tokens[token] < count) throw new IllegalActionError(`${token} token 不足`);
  player.tokens[token] -= count;
}

function givePrivilege(state: GameState, toPlayerId: string): void {
  const to = getPlayer(state, toPlayerId);
  if (to.privileges >= 3) return;
  if (state.publicPrivileges > 0) {
    state.publicPrivileges -= 1;
    to.privileges += 1;
    return;
  }
  const from = getOpponent(state, toPlayerId);
  if (from.privileges > 0) {
    from.privileges -= 1;
    to.privileges += 1;
  }
}

function moveSpentTokensToBag(state: GameState, player: PlayerState, tokens: TokenCounts): void {
  for (const color of TOKEN_COLORS) {
    const count = tokens[color] ?? 0;
    if (count <= 0) continue;
    removeToken(player, color, count);
    for (let i = 0; i < count; i += 1) state.bag.push(color);
  }
}

function refillMarketSlot(state: GameState, level: CardLevel): void {
  const next = state.decks[level].shift();
  if (next) state.market[level].push(next);
}

function removeMarketCard(state: GameState, level: CardLevel, cardId: string): void {
  const index = state.market[level].indexOf(cardId);
  if (index < 0) throw new IllegalActionError('市场卡不存在');
  state.market[level].splice(index, 1);
  refillMarketSlot(state, level);
}

function resolveImmediateAbility(state: GameState, playerId: string, ability: AbilityType | null, sourceCardId?: string): void {
  if (!ability) return;
  const player = getPlayer(state, playerId);
  if (ability === 'EXTRA_TURN') {
    state.extraTurnPlayerId = playerId;
    state.log.push(`${player.name} 获得一个额外回合。`);
    return;
  }
  if (ability === 'TAKE_PRIVILEGE') {
    givePrivilege(state, playerId);
    state.log.push(`${player.name} 获得 1 个特权卷轴。`);
    return;
  }
  if (ability === 'STEAL_TOKEN') {
    const opponent = getOpponent(state, playerId);
    const hasStealable = GEM_COLORS.some((color) => opponent.tokens[color] > 0) || opponent.tokens.pearl > 0;
    if (hasStealable) state.awaitingChoice = { type: 'CHOOSE_STEAL_TOKEN', playerId };
    return;
  }
  if (ability === 'TAKE_MATCHING_TOKEN') {
    if (!sourceCardId) return;
    const card = getJewelCard(sourceCardId);
    if (!card.bonusColor) return;
    const hasToken = state.board.some((cell) => cell.token === card.bonusColor);
    if (hasToken) state.awaitingChoice = { type: 'CHOOSE_MATCHING_TOKEN', playerId, color: card.bonusColor };
    return;
  }
  if (ability === 'COPY_BONUS') {
    const hasBonus = player.purchased.some((owned) => {
      if (owned.cardId === sourceCardId) return false;
      const card = getJewelCard(owned.cardId);
      return Boolean(card.bonusColor ?? owned.copiedBonusColor);
    });
    if (hasBonus && sourceCardId) state.awaitingChoice = { type: 'CHOOSE_COPY_BONUS', playerId, cardId: sourceCardId };
  }
}

function nextRoyalThreshold(beforeCrowns: number, afterCrowns: number, player: PlayerState): 3 | 6 | null {
  if (player.royals.length >= 2) return null;
  if (beforeCrowns < 3 && afterCrowns >= 3) return 3;
  if (beforeCrowns < 6 && afterCrowns >= 6) return 6;
  return null;
}

function queueRoyalIfNeeded(state: GameState, playerId: string, beforeCrowns: number): boolean {
  const player = getPlayer(state, playerId);
  const threshold = nextRoyalThreshold(beforeCrowns, totalCrowns(player), player);
  state.pendingRoyalCheck = null;
  if (!threshold || state.availableRoyals.length === 0) return false;
  state.awaitingChoice = { type: 'CHOOSE_ROYAL', playerId, threshold };
  state.log.push(`${player.name} 达到 ${threshold} 个皇冠，需要选择 1 张皇室卡。`);
  return true;
}

function finishActionIfReady(state: GameState, playerId: string, beforeCrowns = totalCrowns(getPlayer(state, playerId))): void {
  if (state.awaitingChoice) return;
  const royalBeforeCrowns = state.pendingRoyalCheck?.playerId === playerId ? state.pendingRoyalCheck.beforeCrowns : beforeCrowns;
  if (queueRoyalIfNeeded(state, playerId, royalBeforeCrowns)) return;

  const player = getPlayer(state, playerId);
  if (playerTokenTotal(player) > 10) {
    state.awaitingChoice = { type: 'DISCARD_TOKENS', playerId, excess: playerTokenTotal(player) - 10 };
    state.turnPhase = 'discard_to_limit';
    return;
  }

  const victory = checkVictory(player);
  if (victory) {
    state.status = 'finished';
    state.turnPhase = 'game_over';
    state.winner = victory;
    state.log.push(`${player.name} 获胜：${victory.reason} (${victory.value})。`);
    return;
  }

  if (state.extraTurnPlayerId === playerId) {
    state.extraTurnPlayerId = null;
    state.currentPlayerId = playerId;
    state.log.push(`${player.name} 开始额外回合。`);
  } else {
    state.currentPlayerId = getOpponent(state, playerId).id;
  }
  state.turnPhase = 'optional';
  state.optionalReplenishedThisTurn = false;
}

function markMandatoryActionStarted(state: GameState): void {
  state.turnPhase = 'mandatory';
}

export function applyAction(input: GameState, playerId: string, action: GameAction): GameState {
  const state = cloneState(input);
  const player = getPlayer(state, playerId);

  switch (action.type) {
    case 'SPEND_PRIVILEGE_TAKE_TOKEN': {
      assertOk(canSpendPrivilegeTakeToken(state, playerId, action.cellId));
      const cell = cellById(state, action.cellId);
      player.privileges -= 1;
      state.publicPrivileges += 1;
      addToken(player, cell.token!);
      state.log.push(`${player.name} 花费特权拿走 ${cell.token} token。`);
      cell.token = null;
      return state;
    }

    case 'REPLENISH_BOARD': {
      assertOk(canReplenishBoard(state, playerId));
      for (const pos of BOARD_SPIRAL) {
        const cell = state.board.find((item) => item.pos.x === pos.x && item.pos.y === pos.y)!;
        if (cell.token === null) cell.token = state.bag.shift() ?? null;
        if (state.bag.length === 0) break;
      }
      state.optionalReplenishedThisTurn = true;
      givePrivilege(state, getOpponent(state, playerId).id);
      state.log.push(`${player.name} 补充棋盘，对手获得 1 个特权卷轴。`);
      return state;
    }

    case 'TAKE_TOKENS': {
      assertOk(canTakeTokens(state, playerId, action.cellIds));
      markMandatoryActionStarted(state);
      const taken: TokenColor[] = [];
      for (const cellId of action.cellIds) {
        const cell = cellById(state, cellId);
        taken.push(cell.token!);
        addToken(player, cell.token!);
        cell.token = null;
      }
      const opponentGetsPrivilege =
        taken.length === 3 && taken.every((token) => token === taken[0] && token !== 'pearl') ||
        taken.filter((token) => token === 'pearl').length === 2;
      if (opponentGetsPrivilege) givePrivilege(state, getOpponent(state, playerId).id);
      state.log.push(`${player.name} 拿走 ${taken.join(', ')}。`);
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'RESERVE_CARD': {
      assertOk(canReserveCard(state, playerId, action.source, action.goldCellId));
      markMandatoryActionStarted(state);
      const goldCell = cellById(state, action.goldCellId);
      goldCell.token = null;
      addToken(player, 'gold');
      let cardId: string;
      if (action.source.type === 'market') {
        cardId = action.source.cardId;
        removeMarketCard(state, action.source.level, cardId);
      } else {
        cardId = state.decks[action.source.level].shift()!;
      }
      player.reserved.push(cardId);
      state.log.push(`${player.name} 保留 ${cardId} 并拿走 1 个黄金。`);
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'PURCHASE_CARD': {
      assertOk(canPurchaseCard(state, playerId, action.source, action.payment));
      markMandatoryActionStarted(state);
      const cardId = action.source.cardId;
      const beforeCrowns = totalCrowns(player);
      state.pendingRoyalCheck = { playerId, beforeCrowns };
      moveSpentTokensToBag(state, player, action.payment);
      if (action.source.type === 'market') removeMarketCard(state, action.source.level, cardId);
      else player.reserved.splice(player.reserved.indexOf(cardId), 1);
      player.purchased.push({ cardId });
      const card = getJewelCard(cardId);
      state.log.push(`${player.name} 购买 ${card.name}。`);
      resolveImmediateAbility(state, playerId, card.ability, cardId);
      finishActionIfReady(state, playerId, beforeCrowns);
      return state;
    }

    case 'DISCARD_TOKENS': {
      assertOk(canDiscardTokens(state, playerId, action.tokens));
      moveSpentTokensToBag(state, player, action.tokens);
      state.awaitingChoice = null;
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'CHOOSE_ROYAL': {
      if (state.awaitingChoice?.type !== 'CHOOSE_ROYAL' || state.awaitingChoice.playerId !== playerId) throw new IllegalActionError('当前不需要你选择皇室卡');
      const index = state.availableRoyals.indexOf(action.royalCardId);
      if (index < 0) throw new IllegalActionError('该皇室卡不可选');
      state.availableRoyals.splice(index, 1);
      player.royals.push(action.royalCardId);
      state.awaitingChoice = null;
      const royal = getRoyalCard(action.royalCardId);
      state.log.push(`${player.name} 获得 ${royal.name}。`);
      resolveImmediateAbility(state, playerId, royal.ability);
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'CHOOSE_STEAL_TOKEN': {
      if (state.awaitingChoice?.type !== 'CHOOSE_STEAL_TOKEN' || state.awaitingChoice.playerId !== playerId) throw new IllegalActionError('当前不需要你偷 token');
      const opponent = getOpponent(state, playerId);
      if (opponent.tokens[action.token] <= 0) throw new IllegalActionError('对手没有该 token');
      removeToken(opponent, action.token);
      addToken(player, action.token);
      state.awaitingChoice = null;
      finishActionIfReady(state, playerId);
      return state;
    }


    case 'CHOOSE_MATCHING_TOKEN': {
      if (state.awaitingChoice?.type !== 'CHOOSE_MATCHING_TOKEN' || state.awaitingChoice.playerId !== playerId) throw new IllegalActionError('当前不需要你拿同色 token');
      const cell = cellById(state, action.cellId);
      if (cell.token !== state.awaitingChoice.color) throw new IllegalActionError('必须选择匹配颜色的 token');
      addToken(player, cell.token);
      cell.token = null;
      state.awaitingChoice = null;
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'CHOOSE_COPY_BONUS': {
      if (state.awaitingChoice?.type !== 'CHOOSE_COPY_BONUS' || state.awaitingChoice.playerId !== playerId) throw new IllegalActionError('当前不需要你复制 bonus');
      if (!GEM_COLORS.includes(action.color)) throw new IllegalActionError('无效 bonus 颜色');
      const owned = player.purchased.find((item) => item.cardId === action.cardId);
      if (!owned) throw new IllegalActionError('待关联卡不在已购区');
      owned.copiedBonusColor = action.color;
      state.awaitingChoice = null;
      finishActionIfReady(state, playerId);
      return state;
    }

    case 'SKIP_EFFECT': {
      if (!state.awaitingChoice || state.awaitingChoice.playerId !== playerId) throw new IllegalActionError('当前没有可跳过的效果');
      if (state.awaitingChoice.type === 'DISCARD_TOKENS' || state.awaitingChoice.type === 'CHOOSE_ROYAL') throw new IllegalActionError('该选择不能跳过');
      state.awaitingChoice = null;
      finishActionIfReady(state, playerId);
      return state;
    }

    default:
      return state;
  }
}
