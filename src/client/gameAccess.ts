import type { GameState } from '../shared/types/game';

export function actingPlayerId(game: GameState): string {
  return game.awaitingChoice?.playerId ?? game.currentPlayerId;
}

export function localViewerId(game: GameState, botEnabled: boolean): string {
  return botEnabled ? 'p1' : actingPlayerId(game);
}

export function canHumanControl(game: GameState, playerId: string, botEnabled: boolean): boolean {
  return game.status === 'playing' && playerId === actingPlayerId(game) && playerId === localViewerId(game, botEnabled);
}
