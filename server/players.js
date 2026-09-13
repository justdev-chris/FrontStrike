import { PLAYER } from '../shared/constants.js';
import { getWeapon, DEFAULT_WEAPON } from '../shared/weapons.js';
import * as game from './game.js';

let nextId = 1;

const players = new Map();
game.getState().players = players;

export function getAll() {
  return players;
}

export function get(id) {
  return players.get(id);
}

export function create(ws, name) {
  const id = nextId++;
  const state = game.getState();

  const team = state.mode === 'tdm' ? pickTeam() : 'ffa';
  const spawn = pickSpawn(team);
  const weapon = getWeapon(DEFAULT_WEAPON);

  const player = {
    id,
    ws,
    name: sanitizeName(name) || `Player${id}`,
    team,

    x: spawn.x,
    y: spawn.y + PLAYER.EYE_HEIGHT,
    z: spawn.z,
    vx: 0, vy: 0, vz: 0,
    yaw: spawn.yaw,
    pitch: 0,
    onGround: true,

    health: PLAYER.MAX_HEALTH,
    alive: true,
    lastShotAt: 0,

    kills: 0,
    deaths: 0,

    lastInputSeq: 0,
    inputHistory: [],

    input: { forward: 0, right: 0, jump: false, sprint: false },

    weaponId: weapon.id,
    magAmmo: weapon.magSize,
    reloading: false,
    reloadEndsAt: 0,
    aiming: false,

    emote: null,
    emoteEndsAt: 0,
  };

  players.set(id, player);
  return player;
}

export function remove(id) {
  players.delete(id);
}

export function pickTeam() {
  let red = 0, blue = 0;
  for (const p of players.values()) {
    if (p.team === 'red') red++;
    else if (p.team === 'blue') blue++;
  }
  return red <= blue ? 'red' : 'blue';
}

export function pickSpawn(team) {
  const map = game.getMap();
  const list =
    team === 'red'  ? map.spawns.red :
    team === 'blue' ? map.spawns.blue :
                      map.spawns.ffa;

  let best = list[0];
  let bestDist = -1;
  for (const s of list) {
    let nearest = Infinity;
    for (const p of players.values()) {
      if (!p.alive) continue;
      if (team !== 'ffa' && p.team === team) continue;
      const dx = p.x - s.x, dz = p.z - s.z;
      const d = dx * dx + dz * dz;
      if (d < nearest) nearest = d;
    }
    if (nearest > bestDist) {
      bestDist = nearest;
      best = s;
    }
  }
  return best;
}

export function respawn(p) {
  const spawn = pickSpawn(p.team);
  p.x = spawn.x;
  p.y = spawn.y + PLAYER.EYE_HEIGHT;
  p.z = spawn.z;
  p.vx = p.vy = p.vz = 0;
  p.yaw = spawn.yaw;
  p.pitch = 0;
  p.health = PLAYER.MAX_HEALTH;
  p.alive = true;
  p.onGround = true;
  p.inputHistory = [];

  const w = getWeapon(p.weaponId);
  p.magAmmo = w.magSize;
  p.reloading = false;
  p.reloadEndsAt = 0;
  p.aiming = false;

  p.emote = null;
  p.emoteEndsAt = 0;
}

export function setEmote(p, emoteId, durationMs) {
  p.emote = emoteId;
  p.emoteEndsAt = Date.now() + durationMs;
  // emoting cancels reload and aim
  p.reloading = false;
  p.reloadEndsAt = 0;
  p.aiming = false;
}

export function clearEmote(p) {
  p.emote = null;
  p.emoteEndsAt = 0;
}

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 16).replace(/[^\w \-_.]/g, '');
}
