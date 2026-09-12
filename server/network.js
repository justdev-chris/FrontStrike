import { C2S, S2C, publicPlayer } from '../shared/protocol.js';
import { NET, MATCH } from '../shared/constants.js';
import * as players from './players.js';
import * as game from './game.js';
import * as combat from './combat.js';

const SNAPSHOT_MS = 1000 / NET.SNAPSHOT_RATE;

export function handleConnection(ws) {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    route(ws, msg);
  });

  ws.on('close', () => {
    const p = findBySocket(ws);
    if (!p) return;
    players.remove(p.id);
    broadcast({ type: S2C.PLAYER_LEFT, id: p.id });
  });
}

function route(ws, msg) {
  if (msg.type === C2S.JOIN) {
    return onJoin(ws, msg);
  }

  const p = findBySocket(ws);
  if (!p) return;

  switch (msg.type) {
    case C2S.INPUT:   return onInput(p, msg);
    case C2S.SHOOT:   return onShoot(p, msg);
    case C2S.VOTE:    return onVote(p, msg);
    case C2S.RESPAWN: return onRespawn(p);
    case C2S.SET_NAME:
      p.name = String(msg.name || '').slice(0, 16);
      return;
  }
}

function onJoin(ws, msg) {
  const p = players.create(ws, msg.name);
  send(ws, {
    type: S2C.WELCOME,
    id: p.id,
    mode: game.getState().mode,
    players: [...players.getAll().values()].map(publicPlayer),
  });
  broadcast({ type: S2C.PLAYER_JOINED, player: publicPlayer(p) });
}

function onInput(p, msg) {
  p.input.forward = clamp(msg.forward, -1, 1);
  p.input.right   = clamp(msg.right, -1, 1);
  p.input.jump    = !!msg.jump;
  p.input.sprint  = !!msg.sprint;
  p.yaw   = msg.yaw;
  p.pitch = clamp(msg.pitch, -1.5, 1.5);
  p.lastInputSeq = msg.seq;
}

function onShoot(p, msg) {
  const result = combat.handleShoot(p, msg.dir);
  if (!result) return;
  broadcast({
    type: S2C.SHOT,
    shooter: p.id,
    origin: result.origin,
    dir: result.dir,
    hit: result.hit,
    point: result.point,
  });
  if (result.hit != null) {
    const victim = players.get(result.hit);
    broadcast({
      type: S2C.DAMAGE,
      victim: victim.id,
      amount: 0,
      health: victim.health,
      attacker: p.id,
    });
    if (!victim.alive) {
      broadcast({ type: S2C.DEATH, victim: victim.id, killer: p.id });
      broadcast({ type: S2C.KILLFEED, killer: p.id, victim: victim.id, weapon: 'rifle' });
    }
  }
}

function onVote(p, msg) {
  if (game.getState().phase !== 'vote') return;
  game.castVote(msg.mode);
}

function onRespawn(p) {
  if (p.alive) return;
  players.respawn(p);
  broadcast({ type: S2C.RESPAWN, player: publicPlayer(p) });
}

export function startLoop() {
  let lastSnapshot = 0;

  setInterval(() => {
    const now = Date.now();

    // respawn timers
    for (const p of players.getAll().values()) {
      if (!p.alive && p.respawnAt && now >= p.respawnAt) {
        players.respawn(p);
        broadcast({ type: S2C.RESPAWN, player: publicPlayer(p) });
      }
    }

    // snapshot
    if (now - lastSnapshot >= SNAPSHOT_MS) {
      lastSnapshot = now;
      broadcast({
        type: S2C.SNAPSHOT,
        tick: now,
        players: [...players.getAll().values()].map(publicPlayer),
      });
    }
  }, 1000 / NET.TICK_RATE);
}

export function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const p of players.getAll().values()) {
    if (p.ws.readyState === 1) p.ws.send(data);
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function findBySocket(ws) {
  for (const p of players.getAll().values()) {
    if (p.ws === ws) return p;
  }
  return null;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
