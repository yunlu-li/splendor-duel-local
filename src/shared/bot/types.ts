import type { GameAction } from '../rules/actions.ts';

export type BotDifficulty = 'friendly' | 'competitive';
export type BotPhase = 'early' | 'middle' | 'late';
export interface BotDecision {
  action: GameAction;
  explanation: string;
  score: number;
  phase: BotPhase;
  factors: Record<string, number>;
}
