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

const FLAG_PICKUP_RADIUS = 1.2;
const FLAG_RETURN_RADIUS = 1.2;
const FLAG_CAPTURE_RADIUS = 1.5;
const FLAG_HOME_EPSILON = 0.5;
const FLAG_CARRY_Y_OFFSET = 1.5;

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
  tickFlags(state, now);
}

function tickSlide(p, now) {
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
    if (speed > 0.01) {
      const boost = 1 + (SLIDE.INITIAL_BOOST - 1) * 0.6;
      p.vx *= boost;
      p.vz *= boost;
    }
  }

  if (!p.sliding) return;

  const expired = now >= p.slideEndsAt;
  const notCrouching = !p.input.crouch;
  const tooSlow = Math.hypot(p.vx, p.vz) < SLIDE.MIN_SPEED_TO_KEEP;

  if (expired || notCrouching || tooSlow || !p.onGround) {
    p.sliding = false;
    p.slideCooldownUntil = now + SLIDE.COOLDOWN_MS;
    p.height = PLAYER.HEIGHT;
    return;
  }

  p.vx *= SLIDE.FRICTION;
  p.vz *= SLIDE.FRICTION;

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

  const sliding = p.sliding;
  const speedMult = p.speedMult || 1;

  const speed = sliding
    ? 0
    : PLAYER.MOVE_SPEED * (p.input.sprint ? PLAYER.SPRINT_MULT : 1) * speedMult;

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

function dist2(ax, ay, az, bx, by, bz) {
  const dx = ax - bx, dy = ay - by, dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

function tickFlags(state, now) {
  if (!state.flags) return;
  if (state.mode !== 'ctf') return;

  const flags = [state.flags.red, state.flags.blue];

  for (const flag of flags) {
    if (flag.carriedBy != null) {
      const carrier = players.get(flag.carriedBy);
      // Carrier disconnected without a clean drop (e.g. mid-tick) — drop it
      // where it is rather than leaving it glued to a ghost player.
      if (!carrier || !carrier.alive) {
        flag.carriedBy = null;
        if (carrier) carrier.carryingFlag = null;
        continue;
      }
      flag.x = carrier.x;
      flag.y = carrier.y + FLAG_CARRY_Y_OFFSET;
      flag.z = carrier.z;
    }
  }

  // Capture check: an alive player carrying an enemy flag who reaches their
  // own team's flag stand scores, but only if their own flag is home
  // (standard "flag must be home to cap" CTF rule).
  for (const p of players.getAll().values()) {
    if (!p.alive || !p.carryingFlag) continue;

    const ownFlag = state.flags[p.team];
    if (!ownFlag) continue;

    const ownFlagHome = !ownFlag.carriedBy &&
      dist2(ownFlag.x, ownFlag.y, ownFlag.z, ownFlag.homeX, ownFlag.homeY, ownFlag.homeZ) <
        FLAG_HOME_EPSILON * FLAG_HOME_EPSILON;

    if (!ownFlagHome) continue;

    const d2 = dist2(p.x, p.y, p.z, ownFlag.homeX, ownFlag.homeY, ownFlag.homeZ);
    if (d2 > FLAG_CAPTURE_RADIUS * FLAG_CAPTURE_RADIUS) continue;

    const capturedFlag = state.flags[p.carryingFlag];
    if (!capturedFlag) continue;

    capturedFlag.carriedBy = null;
    capturedFlag.x = capturedFlag.homeX;
    capturedFlag.y = capturedFlag.homeY;
    capturedFlag.z = capturedFlag.homeZ;
    p.carryingFlag = null;

    game.addTeamScore(p.team, 1);

    broadcastFlagEvent({ event: 'capture', playerId: p.id, flagTeam: capturedFlag.id });

    if (game.checkKillLimit(p)) {
      game.endMatch('captures');
      import('./network.js').then(net => net.broadcastMatchState()).catch(() => {});
    }
  }

  // Pickup / return check for each flag not currently carried.
  for (const flag of flags) {
    if (flag.carriedBy != null) continue;

    const atHome = dist2(flag.x, flag.y, flag.z, flag.homeX, flag.homeY, flag.homeZ) <
      FLAG_HOME_EPSILON * FLAG_HOME_EPSILON;

    let handled = false;

    for (const p of players.getAll().values()) {
      if (!p.alive) continue;

      if (p.team === flag.team) {
        // Own team returns a strayed flag by touching it.
        if (atHome) continue;
        const d2 = dist2(p.x, p.y, p.z, flag.x, flag.y, flag.z);
        if (d2 > FLAG_RETURN_RADIUS * FLAG_RETURN_RADIUS) continue;

        flag.x = flag.homeX;
        flag.y = flag.homeY;
        flag.z = flag.homeZ;
        broadcastFlagEvent({ event: 'return', playerId: p.id, flagTeam: flag.id });
        handled = true;
        break;
      }

      // Enemy team can pick it up, whether it's home or dropped in the field.
      if (p.carryingFlag) continue; // already holding a flag
      const d2 = dist2(p.x, p.y, p.z, flag.x, flag.y, flag.z);
      if (d2 > FLAG_PICKUP_RADIUS * FLAG_PICKUP_RADIUS) continue;

      flag.carriedBy = p.id;
      p.carryingFlag = flag.id;
      broadcastFlagEvent({ event: 'pickup', playerId: p.id, flagTeam: flag.id });
      handled = true;
      break;
    }

    if (handled) continue;
  }
}

function broadcastFlagEvent(payload) {
  import('./network.js').then(net => {
    net.broadcast({ type: 'flagEvent', ...payload });
  }).catch(() => {});
}