import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.ts';
import type { ClientToServerEvents, PublicRoomState, ServerToClientEvents } from '../shared/types/room.ts';

const PORT = Number(process.env.PORT ?? 3001);
const distDir = join(process.cwd(), 'dist');
const manager = new RoomManager();

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function serveStatic(pathname: string, res: import('node:http').ServerResponse) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^\.\.(\/|\\|$)/, '');
  let filePath = join(distDir, safePath);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(distDir, 'index.html');
  if (!existsSync(filePath)) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Socket server is running. Build the client with npm run build to serve production files.');
    return;
  }
  res.writeHead(200, { 'content-type': mime[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  serveStatic(url.pathname, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: true },
});

function emitRoom(roomId: string) {
  const room = manager.get(roomId);
  io.to(roomId).emit('room:update', room);
}

function handleAck<T extends { room: PublicRoomState; playerId: string }>(socket: import('socket.io').Socket<ClientToServerEvents, ServerToClientEvents>, ack: Parameters<ClientToServerEvents['room:create']>[1] | undefined, fn: () => T) {
  try {
    const result = fn();
    void socket.join(result.room.roomId);
    ack?.({ ok: true, room: result.room, playerId: result.playerId });
    emitRoom(result.room.roomId);
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : String(caught);
    ack?.({ ok: false, error });
    socket.emit('room:error', { message: error });
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', (payload, ack) => {
    handleAck(socket, ack, () => manager.createRoom(socket.id, payload.playerName));
  });

  socket.on('room:join', (payload, ack) => {
    handleAck(socket, ack, () => manager.joinRoom(socket.id, payload.inviteCode, payload.playerName));
  });

  socket.on('room:ready', (payload, ack) => {
    handleAck(socket, ack, () => manager.setReady(socket.id, payload.roomId, payload.ready));
  });

  socket.on('game:action', (payload, ack) => {
    handleAck(socket, ack, () => manager.applyGameAction(socket.id, payload.roomId, payload.action));
  });

  socket.on('room:leave', (payload, ack) => {
    try {
      const room = manager.leave(socket.id, payload.roomId);
      socket.leave(payload.roomId);
      if (room) {
        ack?.({ ok: true, room, playerId: '' });
        io.to(payload.roomId).emit('room:update', room);
      }
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : String(caught);
      ack?.({ ok: false, error });
      socket.emit('room:error', { message: error });
    }
  });

  socket.on('disconnect', () => {
    const room = manager.disconnect(socket.id);
    if (room) io.to(room.roomId).emit('room:update', room);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Room server listening on http://localhost:${PORT}`);
});
