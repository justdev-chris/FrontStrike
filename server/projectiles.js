import { expandStairs, raycastSolids } from '../shared/collision.js';
import { getWeapon } from '../shared/weapons.js';
import * as players from './players.js';
import * as game from './game.js';

let nextId = 1;
const active = new Map();

const expandedCache = new Map();

function getSolids(map) {
  if (expandedCache.has(map.id)) return expandedCache.get(map.id);
  const solids = expandStairs(map.obstacles);
  expandedCache.set(map.id, solids);
  return solids;
}

export function spawn(opts) {
  const id = nextId++;
  const p = {
    id,
    ownerId: opts.ownerId,
    weaponId: opts.weaponId,
    x: opts.x, y: opts.y, z: opts.z,
    vx: opts.dir.x * opts.speed,
    vy: opts.dir.y * opts.speed,
    vz: opts.dir.z * opts.speed,
    gravity: opts.gravity || 0,
    ttl: opts.ttlMs || 8000,
    spawnedAt: Date.now(),
  };
  active.set(id, p);
  return p;
}

export function getAll() {
  return active;
}

export function clear() {
  active.clear();
}

export function tick() {
  const map = game.getMap();
  const solids = getSolids(map);
  const events = [];
  const now = Date.now();

  for (const p of [...active.values()]) {
    const dt = 1 / 30;

    p.vy -= (p.gravity || 0) * dt;
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    const nz = p.z + p.vz * dt;

    const dx = nx - p.x;
    const dy = ny - p.y;
    const dz = nz - p.z;
    const dist = Math.hypot(dx, dy, dz);
    const dir = dist > 1e-6
      ? { x: dx / dist, y: dy / dist, z: dz / dist }
      : { x: 0, y: 0, z: 0 };

    let hitT = dist;
    let hitPoint = null;
    let exploded = false;

    if (dist > 0) {
      const worldHit = raycastSolids({ x: p.x, y: p.y, z: p.z }, dir, dist, solids);
      if (worldHit) {
        hitT = worldHit.t;
        hitPoint = worldHit.point;
        exploded = true;
      }

      const playerHit = raycastPlayers({ x: p.x, y: p.y, z: p.z }, dir, hitT, p.ownerId);
      if (playerHit) {
        hitT = playerHit.t;
        hitPoint = playerHit.point;
        exploded = true;
      }
    }

    if (exploded) {
      p.x = p.x + dir.x * hitT;
      p.y = p.y + dir.y * hitT;
      p.z = p.z + dir.z * hitT;
      detonate(p, hitPoint);
      events.push({ projectile: p, impact: hitPoint });
      active.delete(p.id);
      continue;
    }

    p.x = nx;
    p.y = ny;
    p.z = nz;

    const age = now - p.spawnedAt;
    const lim = map.mapSize / 2 + 5;
    if (age > p.ttl || Math.abs(p.x) > lim || Math.abs(p.z) > lim || p.y < -5) {
      detonate(p, { x: p.x, y: p.y, z: p.z });
      events.push({ projectile: p, impact: { x: p.x, y: p.y, z: p.z } });
      active.delete(p.id);
    }
  }

  return events;
}

function raycastPlayers(origin, dir, maxT, ownerId) {
  let best = null;
  for (const p of players.getAll().values()) {
    if (!p.alive) continue;
    if (p.id === ownerId) continue;

    const hit = rayAABB(origin, dir, {
      x: p.x, y: p.y, z: p.z,
      w: 0.8, h: p.height, d: 0.8,
    });
    if (hit == null) continue;
    if (hit > maxT) continue;
    if (best && hit >= best.t) continue;

    best = {
      t: hit,
      point: {
        x: origin.x + dir.x * hit,
        y: origin.y + dir.y * hit,
        z: origin.z + dir.z * hit,
      },
    };
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

function detonate(p, impactPoint) {
  const w = getWeapon(p.weaponId);
  if (!w || !w.explosionRadius) return;

  const owner = players.get(p.ownerId);
  const center = impactPoint || { x: p.x, y: p.y, z: p.z };

  for (const victim of players.getAll().values()) {
    if (!victim.alive) continue;
    if (victim.godmode) continue;

    const dx = victim.x - center.x;
    const dy = (victim.y - victim.height / 2) - center.y;
    const dz = victim.z - center.z;
    const dist = Math.hypot(dx, dy, dz);

    if (dist > w.explosionRadius) continue;

    const falloff = 1 - dist / w.explosionRadius;
    let dmg = w.explosionDamage * falloff;

    if (victim.id === p.ownerId) {
      dmg *= w.selfDamageMult;
    } else if (owner && owner.team !== 'ffa' && victim.team === owner.team) {
      continue;
    }

    if (dmg < 1) continue;

    victim.health -= dmg;
    victim.lastDamageAt = Date.now();

    if (dist > 0.01) {
      const kb = (1 - dist / w.explosionRadius) * 8;
      victim.vx += (dx / dist) * kb;
      victim.vy += Math.max(2, (dy / dist) * kb + 4);
      victim.vz += (dz / dist) * kb;
    }

    if (victim.health <= 0 && victim.alive) {
      victim.health = 0;
      victim.alive = false;
      victim.deaths++;
      victim.streak = 0;
      victim.respawnAt = Date.now() + 3000;
      victim.reloading = false;
      victim.aiming = false;
      victim.sliding = false;
      victim.height = 1.8;

      if (owner && owner !== victim) {
        owner.kills++;
        owner.streak = (owner.streak || 0) + 1;
        game.addKill(owner.team);

        p._kill = { killerId: owner.id, victimId: victim.id };
      } else if (owner === victim) {
        p._suicide = victim.id;
      }
    }
  }
}

export function collectKillEvents(events) {
  const out = [];
  for (const ev of events) {
    if (ev.projectile._kill) out.push({ type: 'kill', ...ev.projectile._kill });
    if (ev.projectile._suicide) out.push({ type: 'suicide', victimId: ev.projectile._suicide });
  }
  return out;
}