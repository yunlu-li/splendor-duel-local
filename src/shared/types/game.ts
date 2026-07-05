export type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black';
export type TokenColor = GemColor | 'pearl' | 'gold';
export type PayableTokenColor = Exclude<TokenColor, 'gold'>;
export type CardLevel = 1 | 2 | 3;

export type AbilityType =
  | 'EXTRA_TURN'
  | 'TAKE_PRIVILEGE'
  | 'TAKE_MATCHING_TOKEN'
  | 'STEAL_TOKEN'
  | 'COPY_BONUS';

export type CardType = 'standard' | 'associate' | 'gold' | 'royal';

export type TokenCounts = Partial<Record<TokenColor, number>>;
export type Cost = Partial<Record<PayableTokenColor, number>>;

export interface BaseCardDef {
  id: string;
  name: string;
  kind: 'jewel' | 'royal';
  level: CardLevel | 1;
  prestige: number;
  crowns: number;
  bonusColor: GemColor | null;
  cost: Cost;
  ability: AbilityType | null;
  cardType: CardType;
}

export interface JewelCardDef extends BaseCardDef {
  kind: 'jewel';
  level: CardLevel;
}

export interface RoyalCardDef extends BaseCardDef {
  kind: 'royal';
  level: 1;
  cost: Record<string, never>;
  bonusColor: null;
  cardType: 'royal';
}

export interface BoardPos {
  x: number;
  y: number;
}

export interface BoardCell {
  id: string;
  pos: BoardPos;
  token: TokenColor | null;
}

export interface OwnedJewelCard {
  cardId: string;
  copiedBonusColor?: GemColor;
}

export interface PlayerState {
  id: string;
  name: string;
  tokens: Required<Record<TokenColor, number>>;
  privileges: number;
  purchased: OwnedJewelCard[];
  reserved: string[];
  royals: string[];
}

export type TurnPhase =
  | 'optional'
  | 'mandatory'
  | 'awaiting_choice'
  | 'discard_to_limit'
  | 'game_over';

export interface GameState {
  seed: string;
  status: 'playing' | 'finished';
  players: [PlayerState, PlayerState];
  currentPlayerId: string;
  turnPhase: TurnPhase;
  optionalReplenishedThisTurn: boolean;
  extraTurnPlayerId: string | null;
  board: BoardCell[];
  bag: TokenColor[];
  decks: Record<CardLevel, string[]>;
  market: Record<CardLevel, string[]>;
  availableRoyals: string[];
  publicPrivileges: number;
  awaitingChoice: AwaitingChoice | null;
  pendingRoyalCheck: { playerId: string; beforeCrowns: number } | null;
  winner: VictoryResult | null;
  log: string[];
}

export type AwaitingChoice =
  | { type: 'DISCARD_TOKENS'; playerId: string; excess: number }
  | { type: 'CHOOSE_ROYAL'; playerId: string; threshold: 3 | 6 }
  | { type: 'CHOOSE_STEAL_TOKEN'; playerId: string }
  | { type: 'CHOOSE_COPY_BONUS'; playerId: string; cardId: string }
  | { type: 'CHOOSE_MATCHING_TOKEN'; playerId: string; color: GemColor };

export type VictoryReason = 'TOTAL_PRESTIGE' | 'CROWNS' | 'SAME_COLOR_PRESTIGE';

export interface VictoryResult {
  winnerId: string;
  reason: VictoryReason;
  value: number;
}
