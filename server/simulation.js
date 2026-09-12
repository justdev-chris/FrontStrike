import { PLAYER, NET } from '../shared/constants.js';
import { OBSTACLES, MAP_SIZE } from '../shared/map.js';
import * as players from './players.js';

const DT = 1 / NET.TICK_RATE;

export function tick() {
  const now = Date.now();
  for (const p of players.getAll().values()) {
    if (!p.alive) continue;
    applyInput(p, DT);
    integrate(p, DT);
    collide(p);
  }
}

function applyInput(p, dt) {
  const speed = PLAYER.MOVE_SPEED * (p.input.sprint ? PLAYER.SPRINT_MULT : 1);
  const sin = Math.sin(p.yaw);
  const cos = Math.cos(p.yaw);

  // forward is -Z in local space, right is +X
  const fx = -sin * p.input.forward;
  const fz = -cos * p.input.forward;
  const rx =  cos * p.input.right;
  const rz = -sin * p.input.right;

  const len = Math.hypot(fx + rx, fz + rz) || 1;
  const norm = len > 1 ? len : 1;

  p.vx = ((fx + rx) / norm) * speed;
  p.vz = ((fz + rz) / norm) * speed;

  if (p.input.jump && p.onGround) {
    p.vy = PLAYER.JUMP_VELOCITY;
    p.onGround = false;
  }
}

function integrate(p, dt) {
  p.vy -= PLAYER.GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
}

function collide(p) {
  const r = PLAYER.RADIUS;
  const h = PLAYER.HEIGHT;

  // Horizontal: resolve X and Z separately so you slide along walls
  for (const box of OBSTACLES) {
    if (!overlapY(p.y, h, box)) continue;

    if (overlapX(p.x, r, box) && overlapZ(p.z, r, box)) {
      // try to push out on the axis of least penetration
      const pxLeft  = box.x - box.w / 2 - r - p.x;   // negative
      const pxRight = box.x + box.w / 2 + r - p.x;   // positive
      const pzBack  = box.z - box.d / 2 - r - p.z;
      const pzFront = box.z + box.d / 2 + r - p.z;

      const dx = Math.abs(pxLeft) < Math.abs(pxRight) ? pxLeft : pxRight;
      const dz = Math.abs(pzBack) < Math.abs(pzFront) ? pzBack : pzFront;

      if (Math.abs(dx) < Math.abs(dz)) p.x += dx;
      else p.z += dz;
    }
  }

  // Vertical: ground and ceiling
  p.onGround = false;
  const feet = p.y - h / 2;
  const head = p.y + h / 2;

  for (const box of OBSTACLES) {
    const top = box.y + box.h / 2;
    const bottom = box.y - box.h / 2;

    if (!overlapX(p.x, r, box) || !overlapZ(p.z, r, box)) continue;

    if (p.vy <= 0 && feet <= top && feet >= top - 0.5) {
      p.y = top + h / 2;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy > 0 && head >= bottom && head <= bottom + 0.5) {
      p.y = bottom - h / 2;
      p.vy = 0;
    }
  }

  // Floor at y=0
  if (p.y - h / 2 <= 0) {
    p.y = h / 2;
    p.vy = 0;
    p.onGround = true;
  }

  // Arena bounds (in case a wall is missed)
  const lim = MAP_SIZE / 2 - 1;
  if (p.x < -lim) p.x = -lim;
  if (p.x >  lim) p.x =  lim;
  if (p.z < -lim) p.z = -lim;
  if (p.z >  lim) p.z =  lim;
}

function overlapX(x, r, box) {
  return x + r > box.x - box.w / 2 && x - r < box.x + box.w / 2;
}
function overlapZ(z, r, box) {
  return z + r > box.z - box.d / 2 && z - r < box.z + box.d / 2;
}
function overlapY(y, h, box) {
  return y + h / 2 > box.y - box.h / 2 && y - h / 2 < box.y + box.h / 2;
}
