import { randomBytes } from 'node:crypto';
import { initializeGame } from '../../shared/rules/initialize.ts';
import { applyAction, IllegalActionError } from '../../shared/rules/reducers.ts';
import type { GameAction } from '../../shared/rules/actions.ts';
import type { PublicRoomState, RoomPlayer, RoomState, SeatId } from '../../shared/types/room.ts';

function shortId(prefix = ''): string {
  return `${prefix}${randomBytes(5).toString('base64url')}`;
}

function inviteCode(): string {
  return randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();
}

function now(): number {
  return Date.now();
}

export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private codeToRoomId = new Map<string, string>();
  private socketToPlayer = new Map<string, { roomId: string; playerId: string }>();

  createRoom(socketId: string, playerName: string): { room: PublicRoomState; playerId: string } {
    const roomId = shortId('room_');
    let code = inviteCode();
    while (this.codeToRoomId.has(code)) code = inviteCode();

    const playerId = shortId('player_');
    const player: RoomPlayer = {
      id: playerId,
      name: playerName || '玩家 A',
      seat: 'p1',
      ready: false,
      connected: true,
    };

    const room: RoomState = {
      roomId,
      inviteCode: code,
      status: 'waiting',
      hostPlayerId: playerId,
      players: [player],
      spectators: [],
      game: null,
      createdAt: now(),
      updatedAt: now(),
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(code, roomId);
    this.socketToPlayer.set(socketId, { roomId, playerId });
    return { room: this.publicRoom(room), playerId };
  }

  joinRoom(socketId: string, code: string, playerName: string): { room: PublicRoomState; playerId: string } {
    const room = this.getRoomByCode(code);
    const existing = this.socketToPlayer.get(socketId);
    if (existing?.roomId === room.roomId) return { room: this.publicRoom(room), playerId: existing.playerId };

    let playerId = shortId('player_');
    if (room.players.length < 2 && room.status === 'waiting') {
      const seat: SeatId = room.players.some((player) => player.seat === 'p1') ? 'p2' : 'p1';
      const player: RoomPlayer = {
        id: playerId,
        name: playerName || (seat === 'p1' ? '玩家 A' : '玩家 B'),
        seat,
        ready: false,
        connected: true,
      };
      room.players.push(player);
    } else {
      playerId = shortId('spectator_');
      room.spectators.push({ id: playerId, name: playerName || '观战者', connected: true });
    }

    room.updatedAt = now();
    this.socketToPlayer.set(socketId, { roomId: room.roomId, playerId });
    return { room: this.publicRoom(room), playerId };
  }

  setReady(socketId: string, roomId: string, ready: boolean): { room: PublicRoomState; playerId: string } {
    const { room, playerId } = this.requireMembership(socketId, roomId);
    if (room.status !== 'waiting') throw new Error('游戏已经开始，不能修改准备状态');
    const player = room.players.find((item) => item.id === playerId);
    if (!player) throw new Error('观战者不能准备');
    player.ready = ready;

    if (room.players.length === 2 && room.players.every((item) => item.ready)) {
      const sorted = [...room.players].sort((a, b) => a.seat.localeCompare(b.seat));
      room.game = initializeGame(`${room.roomId}:${room.updatedAt}`, [sorted[0].name, sorted[1].name]);
      room.status = 'playing';
    }

    room.updatedAt = now();
    return { room: this.publicRoom(room), playerId };
  }

  applyGameAction(socketId: string, roomId: string, action: GameAction): { room: PublicRoomState; playerId: string } {
    const { room, playerId } = this.requireMembership(socketId, roomId);
    if (room.status !== 'playing' || !room.game) throw new Error('游戏尚未开始');
    const player = room.players.find((item) => item.id === playerId);
    if (!player) throw new Error('观战者不能操作');

    try {
      room.game = applyAction(room.game, player.seat, action);
    } catch (caught) {
      if (caught instanceof IllegalActionError) throw caught;
      throw caught;
    }

    if (room.game.status === 'finished') room.status = 'finished';
    room.updatedAt = now();
    return { room: this.publicRoom(room), playerId };
  }

  leave(socketId: string, roomId: string): PublicRoomState | null {
    const membership = this.socketToPlayer.get(socketId);
    if (!membership || membership.roomId !== roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    this.markDisconnected(room, membership.playerId);
    this.socketToPlayer.delete(socketId);
    return this.publicRoom(room);
  }

  disconnect(socketId: string): PublicRoomState | null {
    const membership = this.socketToPlayer.get(socketId);
    if (!membership) return null;
    const room = this.rooms.get(membership.roomId);
    this.socketToPlayer.delete(socketId);
    if (!room) return null;
    this.markDisconnected(room, membership.playerId);
    return this.publicRoom(room);
  }

  get(roomId: string): PublicRoomState {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    return this.publicRoom(room);
  }

  private getRoomByCode(code: string): RoomState {
    const roomId = this.codeToRoomId.get(code.toUpperCase());
    if (!roomId) throw new Error('邀请码不存在');
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    return room;
  }

  private requireMembership(socketId: string, roomId: string): { room: RoomState; playerId: string } {
    const membership = this.socketToPlayer.get(socketId);
    if (!membership || membership.roomId !== roomId) throw new Error('你不在该房间中');
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    return { room, playerId: membership.playerId };
  }

  private markDisconnected(room: RoomState, playerId: string): void {
    const player = room.players.find((item) => item.id === playerId);
    if (player) player.connected = false;
    const spectator = room.spectators.find((item) => item.id === playerId);
    if (spectator) spectator.connected = false;
    room.updatedAt = now();
  }

  private publicRoom(room: RoomState): PublicRoomState {
    return structuredClone(room) as PublicRoomState;
  }
}
