import { PLAYER, NET, SLIDE, REGEN } from '../shared/constants.js';
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
  const now = Date.now();

  for (const p of players.getAll().values()) {
    if (!p.alive) continue;

    tickSlide(p, now);
    tickPassiveHeal(p, now);
    tickMove(p, solids, now);
  }

  tickHealthPacks(state, now);
}

function tickSlide(p, now) {
  // start a slide
  const wantSlide = p.input.crouch && p.input.sprint && !p.sliding;
  const speed = Math.hypot(p.vx, p.vz);
  const canSlide =
    wantSlide &&
    now >= p.slideCooldownUntil &&
    p.onGround &&
    speed >= SLIDE.TRIGGER_MIN_SPEED;

  if (canSlide) {
    p.sliding = true;
    p.slideEndsAt = now + SLIDE.DURATION_MS;
    // boost in current movement direction
    if (speed > 0.01) {
      const bx = (p.vx / speed) * SLIDE.INITIAL_BOOST;
      const bz = (p.vz / speed) * SLIDE.INITIAL_BOOST;
      p.vx *= (1 + (SLIDE.INITIAL_BOOST - 1) * 0.6);
      p.vz *= (1 + (SLIDE.INITIAL_BOOST - 1) * 0.6);
    }
  }

  if (!p.sliding) return;

  // end conditions
  const expired = now >= p.slideEndsAt;
  const notCrouching = !p.input.crouch;
  const tooSlow = Math.hypot(p.vx, p.vz) < SLIDE.MIN_SPEED_TO_KEEP;

  if (expired || notCrouching || tooSlow || !p.onGround) {
    p.sliding = false;
    p.slideCooldownUntil = now + SLIDE.COOLDOWN_MS;
    p.height = PLAYER.HEIGHT;
    return;
  }

  // apply friction
  p.vx *= SLIDE.FRICTION;
  p.vz *= SLIDE.FRICTION;

  // lower profile
  p.height = PLAYER.CROUCH_HEIGHT;
}

function tickPassiveHeal(p, now) {
  if (!p.alive) return;
  if (p.health >= PLAYER.MAX_HEALTH) return;
  if (!p.lastDamageAt) return;

  const sinceDamage = now - p.lastDamageAt;
  if (sinceDamage < REGEN.DELAY_MS) return;

  const healPerTick = REGEN.HP_PER_SEC * DT;
  p.health = Math.min(PLAYER.MAX_HEALTH, p.health + healPerTick);
}

function tickMove(p, solids, now) {
  if (p.jumpBuffer === undefined) p.jumpBuffer = 0;
  if (p.coyote === undefined) p.coyote = 0;

  // sliding forces movement direction — no free turning at full speed
  const sliding = p.sliding;

  const speed = sliding
    ? 0
    : PLAYER.MOVE_SPEED * (p.input.sprint ? PLAYER.SPRINT_MULT : 1);

  let dx = 0, dz = 0;
  if (!sliding) {
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
    p.vx = mx * speed;
    p.vz = mz * speed;
    dx = p.vx * DT;
    dz = p.vz * DT;
  } else {
    // while sliding, use current velocity as-is
    dx = p.vx * DT;
    dz = p.vz * DT;
  }

  if (!sliding && p.input.jump) p.jumpBuffer = JUMP_BUFFER_TICKS;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);

  if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = PLAYER.JUMP_VELOCITY;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.sliding = false;
  }

  p.vy -= PLAYER.GRAVITY * DT;
  const dy = p.vy * DT;

  const wasGrounded = p.onGround;

  const next = moveAndCollide(
    { x: p.x, y: p.y, z: p.z, vy: p.vy },
    dx, dy, dz,
    PLAYER.RADIUS, p.height,
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

function tickHealthPacks(state, time) {
  if (!state.healthPacks) return;

  for (const hp of state.healthPacks) {
    if (!hp.active && hp.respawnAt && time >= hp.respawnAt) {
      hp.active = true;
      hp.respawnAt = 0;
    }
  }

  for (const p of players.getAll().values()) {
    if (!p.alive) continue;
    if (p.health >= PLAYER.MAX_HEALTH) continue;

    for (const hp of state.healthPacks) {
      if (!hp.active) continue;

      const dx = p.x - hp.x;
      const dy = (p.y - p.height / 2) - hp.y;
      const dz = p.z - hp.z;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 > HEALTH_PACK_RADIUS * HEALTH_PACK_RADIUS) continue;

      p.health = Math.min(PLAYER.MAX_HEALTH, p.health + HEALTH_PACK_AMOUNT);
      hp.active = false;
      hp.respawnAt = time + HEALTH_PACK_RESPAWN_MS;

      broadcastHealthPack(hp);
      break;
    }
  }
}

function broadcastHealthPack(hp) {
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