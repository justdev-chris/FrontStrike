import { PLAYER, NET } from '../shared/constants.js';
import { moveAndCollide, expandStairs } from '../shared/collision.js';
import * as players from './players.js';
import * as game from './game.js';

const DT = 1 / NET.TICK_RATE;
const JUMP_BUFFER_TICKS = 3;
const COYOTE_TICKS = 3;

const HEALTH_PACK_RADIUS = 1.2;
const HEALTH_PACK_AMOUNT = 40;
const HEALTH_PACK_RESPAWN_MS = 12000;

const expandedCache = new Map();

function getSolids(map) {
  if (expandedCache.has(map.id)) return expandedCache.get(map.id);
  const solids = expandStairs(map.obstacles);
  expandedCache.set(map.id, solids);
  return solids;
}

export function tick() {
  const map = game.getMap();
  const solids = getSolids(map);
  const state = game.getState();

  for (const p of players.getAll().values()) {
    if (!p.alive) continue;

    if (p.jumpBuffer === undefined) p.jumpBuffer = 0;
    if (p.coyote === undefined) p.coyote = 0;

    const speed = PLAYER.MOVE_SPEED * (p.input.sprint ? PLAYER.SPRINT_MULT : 1);
    const sin = Math.sin(p.yaw);
    const cos = Math.cos(p.yaw);

    const fx = -sin * p.input.forward;
    const fz = -cos * p.input.forward;
    const rx =  cos * p.input.right;
    const rz = -sin * p.input.right;

    let mx = fx + rx;
    let mz = fz + rz;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const dx = mx * speed * DT;
    const dz = mz * speed * DT;

    if (p.input.jump) p.jumpBuffer = JUMP_BUFFER_TICKS;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);

    if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = PLAYER.JUMP_VELOCITY;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
    }

    p.vy -= PLAYER.GRAVITY * DT;
    const dy = p.vy * DT;

    const wasGrounded = p.onGround;

    const next = moveAndCollide(
      { x: p.x, y: p.y, z: p.z, vy: p.vy },
      dx, dy, dz,
      PLAYER.RADIUS, PLAYER.HEIGHT,
      solids,
      wasGrounded
    );

    p.x = next.x;
    p.y = next.y;
    p.z = next.z;
    p.vy = next.vy;
    p.onGround = next.onGround;
    if (next.onGround && p.vy < 0) p.vy = 0;

    if (p.onGround) p.coyote = COYOTE_TICKS;
    else p.coyote = Math.max(0, p.coyote - 1);
  }

  tickHealthPacks(state, now());
}

function now() {
  return Date.now();
}

function tickHealthPacks(state, time) {
  if (!state.healthPacks) return;

  // respawn timers
  for (const hp of state.healthPacks) {
    if (!hp.active && hp.respawnAt && time >= hp.respawnAt) {
      hp.active = true;
      hp.respawnAt = 0;
    }
  }

  // pickup checks
  for (const p of players.getAll().values()) {
    if (!p.alive) continue;
    if (p.health >= PLAYER.MAX_HEALTH) continue;

    for (const hp of state.healthPacks) {
      if (!hp.active) continue;

      const dx = p.x - hp.x;
      const dy = (p.y - PLAYER.HEIGHT / 2) - hp.y;
      const dz = p.z - hp.z;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 > HEALTH_PACK_RADIUS * HEALTH_PACK_RADIUS) continue;

      p.health = Math.min(PLAYER.MAX_HEALTH, p.health + HEALTH_PACK_AMOUNT);
      hp.active = false;
      hp.respawnAt = time + HEALTH_PACK_RESPAWN_MS;

      // broadcast immediately so clients see it
      broadcastHealthPack(hp);
      break;
    }
  }
}

function broadcastHealthPack(hp) {
  // lazy import to avoid a cycle
  import('./network.js').then(net => {
    net.broadcast({
      type: 'healthPack',
      pack: {
        id: hp.id,
        x: hp.x,
        y: hp.y,
        z: hp.z,
        active: hp.active,
      },
    });
  }).catch(() => {});
}