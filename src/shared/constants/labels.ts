import type { AbilityType, GemColor, TokenColor } from '../types/game.ts';

export const TOKEN_LABEL: Record<TokenColor, string> = {
  white: '白',
  blue: '蓝',
  green: '绿',
  red: '红',
  black: '黑',
  pearl: '珍珠',
  gold: '金',
};

export const GEM_LABEL: Record<GemColor, string> = {
  white: '白',
  blue: '蓝',
  green: '绿',
  red: '红',
  black: '黑',
};

export const ABILITY_LABEL: Record<AbilityType, string> = {
  EXTRA_TURN: '额外回合',
  TAKE_PRIVILEGE: '获得特权',
  TAKE_MATCHING_TOKEN: '拿同色宝石',
  STEAL_TOKEN: '偷对手宝石',
  COPY_BONUS: '复制/关联奖励色',
};
