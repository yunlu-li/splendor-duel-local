import type { GameAction } from '../../shared/rules/actions';
import type { GameState, TokenColor, TokenCounts } from '../../shared/types/game';
import { getJewelCard } from '../../shared/rules/cards';
import { canPurchaseCard, canReserveCard, canReplenishBoard, getPlayer, suggestPaymentFor } from '../../shared/rules/validators';
import { TOKEN_LABEL } from '../../shared/constants/labels';
import { tokenLines } from '../../shared/bot/legalActions';

/** Lightweight player hints, deliberately independent from robot difficulty/search. */
export function createCoachSuggestion(game: GameState, playerId: string, paymentLabel: (payment: TokenCounts) => string): { title: string; detail: string; action?: GameAction } {
  const player = getPlayer(game, playerId);
  if (game.status !== 'playing') return { title: '游戏已结束', detail: '可以点击顶部重开或随机开始新局。' };
  if (game.awaitingChoice) return { title: '先处理选择', detail: '当前有皇室、卡牌能力或弃 token 面板需要处理。' };
  const cardPower = (id: string) => {
    const card = getJewelCard(id);
    return card.prestige * 10 + card.crowns * 4 + (card.ability ? 3 : 0) + (card.level - 1) * 2;
  };
  const market = ([3, 2, 1] as const).flatMap((level) => game.market[level].map((cardId) => ({ type: 'market' as const, level, cardId }))).sort((a, b) => cardPower(b.cardId) - cardPower(a.cardId));
  const reserved = [...player.reserved].sort((a, b) => cardPower(b) - cardPower(a)).map((cardId) => ({ type: 'reserved' as const, cardId }));
  for (const source of [...market, ...reserved]) {
    const payment = suggestPaymentFor(player, source.cardId);
    if (canPurchaseCard(game, player.id, source, payment).ok) return {
      title: `建议购买${source.type === 'reserved' ? '保留卡' : ''} ${source.cardId}`,
      detail: `支付：${paymentLabel(payment)}。`, action: { type: 'PURCHASE_CARD', source, payment },
    };
  }
  const goldCellId = game.board.find((c) => c.token === 'gold')?.id;
  if (market[0] && goldCellId && canReserveCard(game, player.id, market[0], goldCellId).ok) return {
    title: `建议保留 ${market[0].cardId}`, detail: '当前买不了好牌，可以拿黄金并保留高价值卡。',
    action: { type: 'RESERVE_CARD', source: market[0], goldCellId },
  };
  const pearls = (ids: string[]) => ids.filter((id) => game.board.find((c) => c.id === id)?.token === 'pearl').length;
  const line = tokenLines(game).sort((a, b) => b.length - a.length || pearls(b) - pearls(a))[0];
  if (line && game.currentPlayerId === player.id) return {
    title: `建议拿 ${line.length} 个 token`, detail: line.map((id) => TOKEN_LABEL[game.board.find((c) => c.id === id)!.token as TokenColor]).join(' + '),
    action: { type: 'TAKE_TOKENS', cellIds: line },
  };
  if (canReplenishBoard(game, player.id).ok) return { title: '建议补充棋盘', detail: '补盘会让对手获得 1 个特权。', action: { type: 'REPLENISH_BOARD' } };
  return { title: '暂无明显建议', detail: '请选择合法 token、保留卡，或查看市场支付情况。' };
}
