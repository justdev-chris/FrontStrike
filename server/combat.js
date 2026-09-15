import { PLAYER } from '../shared/constants.js';
import { STREAKS } from '../shared/protocol.js';
import { getWeapon } from '../shared/weapons.js';
import { raycastSolids, expandStairs } from '../shared/collision.js';
import * as players from './players.js';
import * as game from './game.js';
import * as projectiles from './projectiles.js';

const expandedCache = new Map();

function getSolids(map) {
  if (expandedCache.has(map.id)) return expandedCache.get(map.id);
  const solids = expandStairs(map.obstacles);
  expandedCache.set(map.id, solids);
  return solids;
}

export function handleShoot(shooter, dir, requestedWeaponId, opts = {}) {
  const now = Date.now();
  if (!shooter.alive) return null;

  const w = getWeapon(shooter.weaponId);

  if (w.adminOnly && !shooter.isAdmin) return null;

  // aimbot is admin only, and only trusted if the server agrees they're admin
  const aimbot = !!opts.aimbot && !!shooter.isAdmin;

  if (now - shooter.lastShotAt < w.fireRateMs) return null;
  if (shooter.reloading && !shooter.noReload) return null;
  if (shooter.magAmmo <= 0 && !shooter.noReload) return null;

  shooter.lastShotAt = now;

  if (shooter.noReload) {
    shooter.magAmmo = w.magSize;
  } else {
    shooter.magAmmo--;
  }

  if (w.projectile) {
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };

    const pr = projectiles.spawn({
      ownerId: shooter.id,
      weaponId: w.id,
      x: shooter.x,
      y: shooter.y,
      z: shooter.z,
      dir: d,
      speed: w.projectileSpeed,
      gravity: w.projectileGravity,
      ttlMs: 8000,
    });

    return {
      origin: { x: shooter.x, y: shooter.y, z: shooter.z },
      dir: d,
      hit: null,
      point: null,
      t: 0,
      damage: 0,
      killed: false,
      streak: null,
      hitLimit: false,
      projectile: pr,
    };
  }

  const pellets = w.pellets || 1;
  const map = game.getMap();
  const solids = getSolids(map);
  const origin = { x: shooter.x, y: shooter.y, z: shooter.z };

  let firstHit = null;
  let firstHitPoint = null;
  const hitsByVictim = new Map();

  for (let i = 0; i < pellets; i++) {
    let d = normalized(dir);
    if (w.spreadRad && pellets > 1) {
      d = applySpread(d, w.spreadRad);
    }

    let worldT = w.range;
    let worldHit = null;
    if (!aimbot) {
      worldHit = raycastSolids(origin, d, w.range, solids);
      worldT = worldHit ? worldHit.t : w.range;
    }

    const playerHit = raycastPlayers(origin, d, shooter, worldT, w);

    if (playerHit) {
      const { victim, point, damage } = playerHit;
      const prev = hitsByVictim.get(victim.id) || { victim, damage: 0, point };
      prev.damage += damage;
      prev.point = point;
      hitsByVictim.set(victim.id, prev);

      if (!firstHit) {
        firstHit = victim;
        firstHitPoint = point;
      }
    }
  }

  let killedFlag = false;
  let streakLabel = null;
  let limitFlag = false;

  for (const { victim, damage, point } of hitsByVictim.values()) {
    const result = applyDamage(shooter, victim, damage);
    if (result.killed) killedFlag = true;
    if (result.streak) streakLabel = result.streak;
    if (result.hitLimit) limitFlag = true;
  }

  return {
    origin,
    dir: normalized(dir),
    hit: firstHit ? firstHit.id : null,
    point: firstHitPoint,
    t: 0,
    damage: 0,
    killed: killedFlag,
    streak: streakLabel,
    hitLimit: limitFlag,
    projectile: null,
    hits: [...hitsByVictim.values()].map(h => ({
      victimId: h.victim.id,
      damage: h.damage,
      point: h.point,
      health: h.victim.health,
    })),
  };
}

function normalized(dir) {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  return { x: dir.x / len, y: dir.y / len, z: dir.z / len };
}

function applySpread(dir, spreadRad) {
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * spreadRad;

  const up = Math.abs(dir.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const right = norm(cross(dir, up));
  const realUp = norm(cross(right, dir));

  const offsetX = Math.cos(theta) * r;
  const offsetY = Math.sin(theta) * r;

  const nx = dir.x + right.x * offsetX + realUp.x * offsetY;
  const ny = dir.y + right.y * offsetX + realUp.y * offsetY;
  const nz = dir.z + right.z * offsetX + realUp.z * offsetY;

  return norm({ x: nx, y: ny, z: nz });
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function norm(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function raycastPlayers(origin, dir, shooter, maxT, weapon) {
  let best = null;

  for (const p of players.getAll().values()) {
    if (p.id === shooter.id || !p.alive) continue;
    if (shooter.team !== 'ffa' && p.team === shooter.team) continue;

    const hit = rayAABB(origin, dir, {
      x: p.x, y: p.y, z: p.z,
      w: PLAYER.RADIUS * 2, h: p.height, d: PLAYER.RADIUS * 2,
    });

    if (hit == null) continue;
    if (hit > maxT) continue;
    if (best && hit >= best.t) continue;

    const point = {
      x: origin.x + dir.x * hit,
      y: origin.y + dir.y * hit,
      z: origin.z + dir.z * hit,
    };

    const topOfBox = p.y + p.height / 2;
    const headLine = topOfBox - p.height * 0.25;
    const isHead = point.y >= headLine;
    const damage = isHead
      ? weapon.damage * weapon.headMult
      : weapon.damage;

    best = { victim: p, t: hit, point, damage };
  }

  return best;
}

function rayAABB(o, d, box) {
  const minX = box.x - box.w / 2, maxX = box.x + box.w / 2;
  const minY = box.y - box.h / 2, maxY = box.y + box.h / 2;
  const minZ = box.z - box.d / 2, maxZ = box.z + box.d / 2;

  let tmin = 0, tmax = Infinity;

  for (const [ov, dv, mn, mx] of [
    [o.x, d.x, minX, maxX],
    [o.y, d.y, minY, maxY],
    [o.z, d.z, minZ, maxZ],
  ]) {
    if (Math.abs(dv) < 1e-8) {
      if (ov < mn || ov > mx) return null;
    } else {
      let t1 = (mn - ov) / dv;
      let t2 = (mx - ov) / dv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

export function applyDamage(attacker, victim, dmg) {
  if (victim.godmode) {
    return { killed: false, streak: null, hitLimit: false };
  }

  victim.health -= dmg;
  victim.lastDamageAt = Date.now();

  if (victim.health > 0) {
    return { killed: false, streak: null, hitLimit: false };
  }

  victim.health = 0;
  victim.alive = false;
  victim.deaths++;
  victim.streak = 0;
  attacker.kills++;
  attacker.streak = (attacker.streak || 0) + 1;

  game.addKill(attacker.team);

  victim.respawnAt = Date.now() + PLAYER.RESPAWN_MS;
  victim.reloading = false;
  victim.aiming = false;
  victim.sliding = false;
  victim.height = PLAYER.HEIGHT;

  const streakName = STREAKS[attacker.streak] || null;
  const hitLimit = game.checkKillLimit(attacker);

  return { killed: true, streak: streakName, hitLimit };
}

export function applyExplosionDamage(attacker, victim, dmg) {
  if (!victim.alive) return { killed: false };
  return applyDamage(attacker, victim, dmg);
}
