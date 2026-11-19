import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  addHumanPlayerToMatch,
  createMatchState,
  fillBotsAndStart,
  jumpRacerAction,
  PRE_RACE_COUNTDOWN_MS,
  resetMatchForRematch,
  setRacerLane,
  tickRaceSimulation,
  usePowerupAction,
} from './src/shared/gameEngine.ts';
import {
  ChatMessage,
  CrystalColor,
  GameMode,
  getActiveGlobalTournamentSchedule,
  MatchState,
  PlayerPowerups,
  PowerupType,
  RaceLane,
  RealmId,
} from './src/shared/gameTypes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const TICK_MS = 50;

interface ConnectedClient {
  ws: WebSocket;
  clientId: string;
  name: string;
  roomId: string | null;
}

interface QueueTicket {
  clientId: string;
  name: string;
  crystalColor: CrystalColor;
  skinId: string;
  realm: RealmId;
  mode: GameMode;
  targetDistance: number;
  bootsBonusMps?: number;
  startingPowerups?: Partial<PlayerPowerups>;
  joinedAt: number;
}

const clients = new Map<string, ConnectedClient>();
const rooms = new Map<string, MatchState>();
const raceLoops = new Map<string, NodeJS.Timeout>();
const matchmakingQueue: QueueTicket[] = [];
const globalChat: ChatMessage[] = [];
const roomChats = new Map<string, ChatMessage[]>();

function appendGlobalChat(msg: ChatMessage): void {
  globalChat.push(msg);
  if (globalChat.length > 50) {
    globalChat.splice(0, globalChat.length - 50);
  }
}

function appendRoomChat(roomId: string, msg: ChatMessage): void {
  const list = roomChats.get(roomId) ?? [];
  list.push(msg);
  if (list.length > 50) {
    list.splice(0, list.length - 50);
  }
  roomChats.set(roomId, list);
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: MatchState): void {
  const msg = JSON.stringify({ type: 'room:state', state: room });
  for (const client of clients.values()) {
    if (client.roomId === room.roomId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

function stopRaceLoop(roomId: string): void {
  const existing = raceLoops.get(roomId);
  if (existing) {
    clearInterval(existing);
    raceLoops.delete(roomId);
  }
}

function startRaceLoop(room: MatchState): void {
  stopRaceLoop(room.roomId);
  if (room.status !== 'playing' && room.status !== 'countdown') return;

  const interval = setInterval(() => {
    if (room.status !== 'playing' && room.status !== 'countdown') {
      stopRaceLoop(room.roomId);
      return;
    }
    const changed = tickRaceSimulation(room, TICK_MS);
    if (changed) {
      broadcastRoom(room);
    }
    if (room.status !== 'playing' && room.status !== 'countdown') {
      stopRaceLoop(room.roomId);
    }
  }, TICK_MS);

  raceLoops.set(room.roomId, interval);
}

function removeFromQueue(clientId: string): void {
  const idx = matchmakingQueue.findIndex((t) => t.clientId === clientId);
  if (idx !== -1) {
    matchmakingQueue.splice(idx, 1);
  }
}

function tryMatchmake(realm: RealmId, mode: GameMode, targetDistance: number): void {
  const candidates = matchmakingQueue.filter(
    (t) => t.realm === realm && t.mode === mode && t.targetDistance === targetDistance,
  );
  if (candidates.length >= 2) {
    const picked = candidates.slice(0, 4);
    for (const ticket of picked) {
      removeFromQueue(ticket.clientId);
    }
    const host = picked[0];
    const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const roomCode = generateCode();
    const state = createMatchState({
      roomId,
      roomCode,
      mode,
      realm,
      targetDistance,
      hostPlayer: {
        id: host.clientId,
        name: host.name,
        crystalColor: host.crystalColor,
        skinId: host.skinId,
        bootsBonusMps: host.bootsBonusMps,
        startingPowerups: host.startingPowerups,
      },
    });

    for (let i = 1; i < picked.length; i++) {
      addHumanPlayerToMatch(state, {
        id: picked[i].clientId,
        name: picked[i].name,
        crystalColor: picked[i].crystalColor,
        skinId: picked[i].skinId,
        bootsBonusMps: picked[i].bootsBonusMps,
        startingPowerups: picked[i].startingPowerups,
      });
    }

    state.status = 'countdown';
    state.countdownMs = PRE_RACE_COUNTDOWN_MS;
    rooms.set(roomId, state);

    for (const ticket of picked) {
      const c = clients.get(ticket.clientId);
      if (c) {
        c.roomId = roomId;
        sendJson(c.ws, { type: 'matchmaking:matched', roomId, roomCode });
        sendJson(c.ws, { type: 'chat:history', channel: roomId, messages: roomChats.get(roomId) ?? [] });
      }
    }
    broadcastRoom(state);
    startRaceLoop(state);
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      activeRooms: rooms.size,
      queuedPlayers: matchmakingQueue.length,
    });
  });

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting' && r.mode !== 'campaign')
      .slice(0, 12)
      .map((r) => ({
        roomId: r.roomId,
        roomCode: r.roomCode,
        realm: r.realm,
        mode: r.mode,
        targetDistance: r.targetDistance,
        playerCount: r.players.length,
        hostName: r.players[0]?.name ?? 'Host',
      }));
    res.json({ rooms: publicRooms, queueSize: matchmakingQueue.length });
  });

  app.get('/api/tournaments', (_req, res) => {
    const schedule = getActiveGlobalTournamentSchedule();
    const activeByRound: Record<number, number> = {};
    for (const r of rooms.values()) {
      if (r.mode === 'campaign' && (r.status === 'playing' || r.status === 'countdown')) {
        const roundNum = Math.ceil(r.campaignLevel / 10);
        activeByRound[roundNum] = (activeByRound[roundNum] ?? 0) + 1;
      }
    }
    res.json({
      schedule,
      connectedRunners: clients.size,
      activeByRound,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let boundClientId = `guest-${Math.random().toString(36).slice(2, 8)}`;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'client:hello') {
          boundClientId = String(msg.clientId || boundClientId).slice(0, 64);
          const name = String(msg.name || 'Racer').slice(0, 32);
          const prev = clients.get(boundClientId);
          clients.set(boundClientId, {
            ws,
            clientId: boundClientId,
            name,
            roomId: prev?.roomId ?? null,
          });
          sendJson(ws, { type: 'chat:history', channel: 'global', messages: globalChat });
          if (prev?.roomId && rooms.has(prev.roomId)) {
            const room = rooms.get(prev.roomId)!;
            const player = room.players.find((p) => p.id === boundClientId);
            if (player) player.connected = true;
            sendJson(ws, { type: 'room:state', state: room });
            sendJson(ws, {
              type: 'chat:history',
              channel: room.roomId,
              messages: roomChats.get(room.roomId) ?? [],
            });
          } else {
            sendJson(ws, { type: 'client:ack', clientId: boundClientId });
          }
          return;
        }

        const client = clients.get(boundClientId);
        if (!client) {
          sendJson(ws, { type: 'error', message: 'Handshake required.' });
          return;
        }

        if (msg.type === 'chat:send') {
          const rawText = String(msg.text || '').trim().slice(0, 240);
          if (!rawText) return;
          const validColors: CrystalColor[] = ['ruby', 'sapphire', 'emerald', 'topaz'];
          const crystalColor: CrystalColor = validColors.includes(msg.crystalColor)
            ? msg.crystalColor
            : 'ruby';
          const playerRank = String(msg.playerRank || 'Trail Initiate').slice(0, 48);
          const channelType = msg.channel === 'room' ? 'room' : 'global';

          if (channelType === 'room') {
            if (!client.roomId || !rooms.has(client.roomId)) {
              sendJson(ws, { type: 'error', message: 'Join a room to send room chat messages.' });
              return;
            }
            const chatMsg: ChatMessage = {
              id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              channel: client.roomId,
              senderId: client.clientId,
              senderName: client.name,
              crystalColor,
              playerRank,
              text: rawText,
              timestamp: Date.now(),
            };
            appendRoomChat(client.roomId, chatMsg);
            const payload = JSON.stringify({ type: 'chat:message', message: chatMsg });
            for (const c of clients.values()) {
              if (c.roomId === client.roomId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(payload);
              }
            }
          } else {
            const chatMsg: ChatMessage = {
              id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              channel: 'global',
              senderId: client.clientId,
              senderName: client.name,
              crystalColor,
              playerRank,
              text: rawText,
              timestamp: Date.now(),
            };
            appendGlobalChat(chatMsg);
            const payload = JSON.stringify({ type: 'chat:message', message: chatMsg });
            for (const c of clients.values()) {
              if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(payload);
              }
            }
          }
          return;
        }

        if (msg.type === 'queue:join') {
          removeFromQueue(client.clientId);
          const realm = (msg.realm as RealmId) || 'jungle';
          const mode = (msg.mode as GameMode) || 'ranked';
          const targetDistance = Number(msg.targetDistance || 4000);
          matchmakingQueue.push({
            clientId: client.clientId,
            name: String(msg.name || client.name).slice(0, 32),
            crystalColor: (msg.crystalColor as CrystalColor) || 'ruby',
            skinId: String(msg.skinId || 'classic_facet'),
            realm,
            mode,
            targetDistance,
            bootsBonusMps: Number(msg.bootsBonusMps || 0),
            startingPowerups: msg.startingPowerups,
            joinedAt: Date.now(),
          });
          sendJson(ws, {
            type: 'queue:status',
            inQueue: true,
            realm,
            mode,
            queueCount: matchmakingQueue.filter(
              (t) => t.realm === realm && t.mode === mode && t.targetDistance === targetDistance,
            ).length,
          });
          tryMatchmake(realm, mode, targetDistance);
          return;
        }

        if (msg.type === 'queue:leave') {
          removeFromQueue(client.clientId);
          sendJson(ws, { type: 'queue:status', inQueue: false });
          return;
        }

        if (msg.type === 'room:create') {
          removeFromQueue(client.clientId);
          const realm = (msg.realm as RealmId) || 'jungle';
          const mode = (msg.mode as GameMode) || 'custom';
          const campaignLevel = Number(msg.campaignLevel || 1);
          const targetDistance = Number(msg.targetDistance || 4000);
          const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const roomCode = generateCode();
          const state = createMatchState({
            roomId,
            roomCode,
            mode,
            realm,
            campaignLevel,
            targetDistance,
            hostPlayer: {
              id: client.clientId,
              name: String(msg.name || client.name).slice(0, 32),
              crystalColor: (msg.crystalColor as CrystalColor) || 'ruby',
              skinId: String(msg.skinId || 'classic_facet'),
              bootsBonusMps: Number(msg.bootsBonusMps || 0),
              startingPowerups: msg.startingPowerups,
            },
          });
          rooms.set(roomId, state);
          roomChats.set(roomId, []);
          client.roomId = roomId;

          if (msg.autoStartWithRivals) {
            const targetCount = Number(msg.targetCount || 4);
            fillBotsAndStart(state, targetCount);
          }
          sendJson(ws, { type: 'chat:history', channel: roomId, messages: [] });
          broadcastRoom(state);
          startRaceLoop(state);
          return;
        }

        if (msg.type === 'room:join') {
          removeFromQueue(client.clientId);
          const code = String(msg.roomCode || '').trim().toUpperCase();
          const target = Array.from(rooms.values()).find((r) => r.roomCode === code);
          if (!target) {
            sendJson(ws, { type: 'error', message: `No active race found for code "${code}".` });
            return;
          }
          const res = addHumanPlayerToMatch(target, {
            id: client.clientId,
            name: String(msg.name || client.name).slice(0, 32),
            crystalColor: msg.crystalColor as CrystalColor | undefined,
            skinId: String(msg.skinId || 'classic_facet'),
            bootsBonusMps: Number(msg.bootsBonusMps || 0),
            startingPowerups: msg.startingPowerups,
          });
          if (!res.ok) {
            sendJson(ws, { type: 'error', message: res.error });
            return;
          }
          client.roomId = target.roomId;
          sendJson(ws, {
            type: 'chat:history',
            channel: target.roomId,
            messages: roomChats.get(target.roomId) ?? [],
          });
          broadcastRoom(target);
          return;
        }

        if (msg.type === 'room:leave') {
          if (client.roomId && rooms.has(client.roomId)) {
            const room = rooms.get(client.roomId)!;
            if (room.status === 'waiting') {
              room.players = room.players.filter((p) => p.id !== client.clientId);
              if (room.players.length === 0) {
                stopRaceLoop(room.roomId);
                rooms.delete(room.roomId);
                roomChats.delete(room.roomId);
              } else {
                room.hostId = room.players[0].id;
                broadcastRoom(room);
              }
            } else {
              // Check if any human remains connected
              const p = room.players.find((pl) => pl.id === client.clientId);
              if (p) p.connected = false;
              const anyHumanConnected = room.players.some((pl) => !pl.isBot && pl.connected);
              if (!anyHumanConnected) {
                stopRaceLoop(room.roomId);
                rooms.delete(room.roomId);
                roomChats.delete(room.roomId);
              }
            }
          }
          client.roomId = null;
          sendJson(ws, { type: 'room:left' });
          return;
        }

        const activeRoom = client.roomId ? rooms.get(client.roomId) : undefined;
        if (!activeRoom) {
          sendJson(ws, { type: 'error', message: 'You are not in an active race room.' });
          return;
        }

        if (msg.type === 'room:start') {
          if (activeRoom.hostId !== client.clientId) {
            sendJson(ws, { type: 'error', message: 'Only the room host can start the race.' });
            return;
          }
          if (msg.fillWithBots) {
            fillBotsAndStart(activeRoom, Number(msg.targetCount || 4));
          } else if (activeRoom.players.length >= 2) {
            activeRoom.status = 'countdown';
            activeRoom.countdownMs = PRE_RACE_COUNTDOWN_MS;
          } else {
            fillBotsAndStart(activeRoom, 2);
          }
          broadcastRoom(activeRoom);
          startRaceLoop(activeRoom);
          return;
        }

        if (msg.type === 'game:lane') {
          const laneNum = Number(msg.lane) as RaceLane;
          setRacerLane(activeRoom, client.clientId, laneNum);
          broadcastRoom(activeRoom);
          return;
        }

        if (msg.type === 'game:jump') {
          const res = jumpRacerAction(activeRoom, client.clientId);
          if (res.ok) {
            broadcastRoom(activeRoom);
          }
          return;
        }

        if (msg.type === 'game:use_powerup') {
          const res = usePowerupAction(
            activeRoom,
            client.clientId,
            msg.powerup as PowerupType,
            msg.targetPlayerId ? String(msg.targetPlayerId) : undefined,
          );
          if (!res.ok) {
            sendJson(ws, { type: 'error', message: res.error });
            return;
          }
          broadcastRoom(activeRoom);
          return;
        }

        if (msg.type === 'game:rematch') {
          if (activeRoom.hostId !== client.clientId) {
            sendJson(ws, { type: 'error', message: 'Only the host can start a rematch.' });
            return;
          }
          resetMatchForRematch(activeRoom, msg.startingPowerups);
          broadcastRoom(activeRoom);
          startRaceLoop(activeRoom);
          return;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      removeFromQueue(boundClientId);
      const client = clients.get(boundClientId);
      if (client?.roomId && rooms.has(client.roomId)) {
        const room = rooms.get(client.roomId)!;
        const p = room.players.find((pl) => pl.id === boundClientId);
        if (p) p.connected = false;
        const anyHumanConnected = room.players.some((pl) => !pl.isBot && pl.connected);
        if (!anyHumanConnected) {
          stopRaceLoop(room.roomId);
        }
        broadcastRoom(room);
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Relic Trail Racing server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
