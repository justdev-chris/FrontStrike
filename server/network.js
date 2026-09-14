import { C2S, S2C, EMOTES, publicPlayer, publicMap, publicHealthPack } from '../shared/protocol.js';
import { NET } from '../shared/constants.js';
import { MAPS } from '../shared/map.js';
import { getWeapon } from '../shared/weapons.js';
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
  if (msg.type === C2S.JOIN) return onJoin(ws, msg);

  const p = findBySocket(ws);
  if (!p) return;

  switch (msg.type) {
    case C2S.INPUT:     return onInput(p, msg);
    case C2S.SHOOT:     return onShoot(p, msg);
    case C2S.VOTE_MODE: return onVoteMode(p, msg);
    case C2S.VOTE_MAP:  return onVoteMap(p, msg);
    case C2S.RESPAWN:   return onRespawn(p);
    case C2S.EMOTE:     return onEmote(p, msg);
    case C2S.SET_NAME:
      p.name = String(msg.name || '').slice(0, 16);
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
  p.yaw   = msg.yaw;
  p.pitch = clamp(msg.pitch, -1.5, 1.5);
  p.lastInputSeq = msg.seq;
  p.aiming = !!msg.aiming;

  if (msg.weaponId && msg.weaponId !== p.weaponId) {
    const w = getWeapon(msg.weaponId);
    if (w) {
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
    hit: result.h