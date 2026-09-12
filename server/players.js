import { PLAYER, MATCH } from '../shared/constants.js';
import { SPAWNS } from '../shared/map.js';
import * as game from './game.js';

let nextId = 1;

const players = new Map();   // id -> player
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

  const player = {
    id,
    ws,
    name: sanitizeName(name) || `Player${id}`,
    team,

    // position (server truth)
    x: spawn.x,
    y: spawn.y + PLAYER.EYE_HEIGHT,
    z: spawn.z,
    vx: 0, vy: 0, vz: 0,
    yaw: spawn.yaw,
    pitch: 0,
    onGround: true,

    // combat
    health: PLAYER.MAX_HEALTH,
    alive: true,
    lastShotAt: 0,

    // score
    kills: 0,
    deaths: 0,

    // netcode
    lastInputSeq: 0,
    inputHistory: [],       // {seq, dt, keys, yaw, pitch, x, y, z} for reconciliation

    // input (set on each input message)
    input: { forward: 0, right: 0, jump: false, sprint: false },
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
  const list =
    team === 'red'  ? SPAWNS.red :
    team === 'blue' ? SPAWNS.blue :
                      SPAWNS.ffa;

  // pick the spawn furthest from any living enemy
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
}

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 16).replace(/[^\w \-_.]/g, '');
}
