import type { GameAction } from '../rules/actions.ts';
import type { GameState } from './game.ts';

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type SeatId = 'p1' | 'p2';

export interface RoomPlayer {
  id: string;
  name: string;
  seat: SeatId;
  ready: boolean;
  connected: boolean;
}

export interface RoomSpectator {
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomState {
  roomId: string;
  inviteCode: string;
  status: RoomStatus;
  hostPlayerId: string;
  players: RoomPlayer[];
  spectators: RoomSpectator[];
  game: GameState | null;
  createdAt: number;
  updatedAt: number;
}

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string }, ack: RoomAck) => void;
  'room:join': (payload: { inviteCode: string; playerName: string }, ack: RoomAck) => void;
  'room:ready': (payload: { roomId: string; ready: boolean }, ack: RoomAck) => void;
  'game:action': (payload: { roomId: string; action: GameAction }, ack: RoomAck) => void;
  'room:leave': (payload: { roomId: string }, ack: RoomAck) => void;
}

export interface ServerToClientEvents {
  'room:update': (room: PublicRoomState) => void;
  'room:error': (payload: { message: string }) => void;
}

export type RoomAck = (response: { ok: true; room: PublicRoomState; playerId: string } | { ok: false; error: string }) => void;

export type PublicRoomState = Omit<RoomState, 'hostPlayerId'> & {
  hostPlayerId: string;
};
