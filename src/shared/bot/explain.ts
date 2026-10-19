import type { GameAction } from '../rules/actions.ts';

export function explain(action: GameAction, factors: Record<string, number>, win: boolean, blocks: boolean): string {
  if (win && action.type === 'SPEND_PRIVILEGE_TAKE_TOKEN') return '用特权补齐资源，随后可购买获胜卡。';
  if (win) return '完成能力与皇室选择后，可以达成胜利条件。';
  if (blocks) return '这步能打断对手当前公开市场中的下一回合获胜机会。';
  const names: Record<GameAction['type'], string> = {
    PURCHASE_CARD: '购买这张卡', RESERVE_CARD: '保留卡牌并取得黄金', TAKE_TOKENS: '拿取这组宝石',
    SPEND_PRIVILEGE_TAKE_TOKEN: '使用特权补齐资源', REPLENISH_BOARD: '补充棋盘以改善主行动',
    DISCARD_TOKENS: '弃掉用途较低的多余资源', CHOOSE_ROYAL: '选择这张皇室卡',
    CHOOSE_STEAL_TOKEN: '偷取这枚宝石', CHOOSE_MATCHING_TOKEN: '从这个位置拿取同色宝石',
    CHOOSE_COPY_BONUS: '关联这个折扣颜色', SKIP_EFFECT: '跳过当前可选效果',
  };
  const positive = Object.entries(factors).filter(([, n]) => n > 0.1).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
  return `${names[action.type]}${positive.length ? `，主要收益：${positive.join('、')}` : '，综合资源需求与后续行动选择'}。`;
}
