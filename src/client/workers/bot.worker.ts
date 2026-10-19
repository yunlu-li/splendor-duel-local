import { chooseBotAction } from '../../shared/bot/chooseAction';
import type { GameState } from '../../shared/types/game';
import type { BotDifficulty } from '../../shared/bot/types';

self.onmessage = (event: MessageEvent<{ game: GameState; difficulty: BotDifficulty }>) => {
  try {
    self.postMessage({ decision: chooseBotAction(event.data.game, event.data.difficulty) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
