import {
  C2S, S2C, EMOTES, ADMIN_ACTIONS,
  publicPlayer, publicMap, publicHealthPack, publicProjectile,
} from '../shared/protocol.js';
import { NET } from '../shared/constants.js';
import { MAPS } from '../shared/map.js';
import { getWeapon } from '../shared/weapons.js';
import * as players from './players.js';
import * as game from './game.js';
import * as combat from './combat.js';
import * as projectiles from './projectiles.js';
import * as admin from './admin.js';

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
  if (msg.type === C2S.JOIN) return onJoin(ws, msg);

  const p = findBySocket(ws);
  if (!p) return;

  switch (msg.type) {
    case C2S.INPUT:        return onInput(p, msg);
    case C2S.SHOOT:        return onShoot(p, msg);
    case C2S.VOTE_MODE:    return onVoteMode(p, msg);
    case C2S.VOTE_MAP:     return onVoteMap(p, msg);
    case C2S.RESPAWN:      return onRespawn(p);
    case C2S.EMOTE:        return onEmote(p, msg);
    case C2S.ADMIN_ACTION: return admin.handleAdminAction(p, msg);
    case C2S.SET_NAME:
      p.name = String(msg.name || '').slice(0, 20);
      return;
  }
}

function onJoin(ws, msg) {
  const existing = findBySocket(ws);
  if (existing) {
    players.remove(existing.id);
    broadcast({ type: S2C.PLAYER_LEFT, id: existing.id });
  }

  const p = players.create(ws, msg.name);
  const s = game.getState();
  const map = game.getMap();

  send(ws, {
    type: S2C.WELCOME,
    id: p.id,
    mode: s.mode,
    mapId: s.mapId,
    map: publicMap(map),
    maps: Object.values(MAPS).map(m => ({ id: m.id, name: m.name })),
    players: [...players.getAll().values()].map(publicPlayer),
    healthPacks: (s.healthPacks || []).map(publicHealthPack),
    isAdmin: p.isAdmin,
  });

  broadcast({ type: S2C.PLAYER_JOINED, player: publicPlayer(p) });
}

function onInput(p, msg) {
  if (p.emote) {
    const moving = Math.abs(msg.forward) > 0.01 || Math.abs(msg.right) > 0.01;
    if (moving) players.clearEmote(p);
  }

  p.input.forward = clamp(msg.forward, -1, 1);
  p.input.right   = clamp(msg.right, -1, 1);
  p.input.jump    = !!msg.jump;
  p.input.sprint  = !!msg.sprint;
  p.input.crouch  = !!msg.crouch;
  p.yaw   = msg.yaw;
  p.pitch = clamp(msg.pitch, -1.5, 1.5);
  p.lastInputSeq = msg.seq;
  p.aiming = !!msg.aiming;

  if (msg.weaponId && msg.weaponId !== p.weaponId) {
    const w = getWeapon(msg.weaponId);
    if (w && (!w.adminOnly || p.isAdmin)) {
      p.weaponId = w.id;
      p.magAmmo = w.magSize;
      p.reloading = false;
      p.reloadEndsAt = 0;
      if (p.emote) players.clearEmote(p);
    }
  }

  if (msg.reloading && !p.reloading) {
    const w = getWeapon(p.weaponId);
    if (p.magAmmo < w.magSize) {
      p.reloading = true;
      p.reloadEndsAt = Date.now() + w.reloadMs;
      if (p.emote) players.clearEmote(p);
    }
  }
}

function onShoot(p, msg) {
  if (p.emote) players.clearEmote(p);

  const result = combat.handleShoot(p, msg.dir, msg.weaponId);
  if (!result) return;

  broadcast({
    type: S2C.SHOT,
    shooter: p.id,
    weaponId: p.weaponId,
    origin: result.origin,
    dir: result.dir,
    hit: result.hit,
    point: result.point,
  });

  if (result.projectile) {
    broadcast({
      type: S2C.PROJECTILE_SPAWN,
      projectile: publicProjectile(result.projectile),
    });
    return;
  }

  if (result.hits && result.hits.length) {
    for (const h of result.hits) {
      broadcast({
        type: S2C.DAMAGE,
        victim: h.victimId,
        amount: h.damage,
        health: h.health,
        attacker: p.id,
      });
    }
  }

  if (result.killed) {
    // if multiple victims died, they're not individually tracked here;
    // killfeed/death messages come from the per-victim broadcast below
  }

  // handle death/kill/streak per victim
  if (result.hits) {
    for (const h of result.hits) {
      const victim = players.get(h.victimId);
      if (!victim) continue;
      if (!victim.alive) {
        broadcast({ type: S2C.DEATH, victim: victim.id, killer: p.id });
        broadcast({
          type: S2C.KILLFEED,
          killer: p.id,
          victim: victim.id,
          weapon: p.weaponId,
        });
      }
    }
  }

  if (result.streak) {
    broadcast({
      type: S2C.STREAK,
      playerId: p.id,
      playerName: p.name,
      count: p.streak,
      label: result.streak,
    });
  }

  if (result.hitLimit) {
    game.endMatch('limit');
    broadcastMatchState();
  }
}

function onEmote(p, msg) {
  if (msg.emote === null) {
    players.clearEmote(p);
    broadcast({
      type: S2C.EMOTE,
      playerId: p.id,
      emote: null,
      endsAt: 0,
    });
    return;
  }

  if (!p.alive) return;
  const def = EMOTES[msg.emote];
  if (!def) return;
  if (p.reloading) return;

  players.setEmote(p, def.id, def.durationMs);

  broadcast({
    type: S2C.EMOTE,
    playerId: p.id,
    emote: def.id,
    endsAt: p.emoteEndsAt,
  });
}

function onVoteMode(p, msg) {
  if (game.getState().phase !== 'vote') return;
  game.castModeVote(msg.mode);
  broadcastVoteState();
}

function onVoteMap(p, msg) {
  if (game.getState().phase !== 'vote') return;
  game.castMapVote(msg.mapId);
  broadcastVoteState();
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
    const s = game.getState();

    for (const p of players.getAll().values()) {
      if (p.kicked && p.ws.readyState === 1) {
        try { p.ws.close(); } catch {}
        continue;
      }

      if (!p.alive && p.respawnAt && now >= p.respawnAt) {
        players.respawn(p);
        broadcast({ type: S2C.RESPAWN, player: publicPlayer(p) });
      }

      if (p.reloading && now >= p.reloadEndsAt) {
        const w = getWeapon(p.weaponId);
        p.magAmmo = w.magSize;
        p.reloading = false;
        p.reloadEndsAt = 0;
      }

      if (p.emote && now >= p.emoteEndsAt) {
        players.clearEmote(p);
        broadcast({
          type: S2C.EMOTE,
          playerId: p.id,
          emote: null,
          endsAt: 0,
        });
      }
    }

    // projectiles
    const events = projectiles.tick();
    for (const ev of events) {
      broadcast({
        type: S2C.EXPLOSION,
        x: ev.impact.x,
        y: ev.impact.y,
        z: ev.impact.z,
        weaponId: ev.projectile.weaponId,
      });
      broadcast({
        type: S2C.PROJECTILE_END,
        id: ev.projectile.id,
      });

      const killEvents = projectiles.collectKillEvents([ev]);
      for (const k of killEvents) {
        if (k.type === 'kill') {
          const killer = players.get(k.killerId);
          const victim = players.get(k.victimId);
          if (killer && victim) {
            broadcast({ type: S2C.DEATH, victim: victim.id, killer: killer.id });
            broadcast({
              type: S2C.KILLFEED,
              killer: killer.id,
              victim: victim.id,
              weapon: 'rpg',
            });
          }
        }
      }
    }

    if (s.phase === 'playing' && now >= s.matchEndTime) {
      game.endMatch('time');
      broadcastMatchState();
    }

    if (now - lastSnapshot >= SNAPSHOT_MS) {
      lastSnapshot = now;
      broadcast({
        type: S2C.SNAPSHOT,
        tick: now,
        players: [...players.getAll().values()].map(p => ({
          ...publicPlayer(p),
          ackedSeq: p.lastInputSeq,
        })),
        healthPacks: (s.healthPacks || []).map(publicHealthPack),
        projectiles: [...projectiles.getAll().values()].map(publicProjectile),
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

export function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastVoteState() {
  const s = game.getState();
  broadcast({
    type: S2C.MATCH_STATE,
    phase: s.phase,
    mode: s.mode,
    mapId: s.mapId,
    scores: s.scores,
    matchEndTime: s.matchEndTime,
    modeVotes: s.modeVotes,
    mapVotes: s.mapVotes,
  });
}

export function broadcastMatchState() {
  const s = game.getState();
  broadcast({
    type: S2C.MATCH_STATE,
    phase: s.phase,
    mode: s.mode,
    mapId: s.mapId,
    scores: s.scores,
    matchEndTime: s.matchEndTime,
    modeVotes: s.modeVotes,
    mapVotes: s.mapVotes,
    endReason: s.endReason,
    winner: s.winner,
  });
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