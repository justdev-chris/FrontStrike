import { WEAPON, PLAYER } from '../shared/constants.js';
import { raycastSolids, expandStairs } from '../shared/collision.js';
import * as players from './players.js';
import * as game from './game.js';

// Cache expanded solids per mapId, same as simulation.
const expandedCache = new Map();

function getSolids(map) {
  if (expandedCache.has(map.id)) return expandedCache.get(map.id);
  const solids = expandStairs(map.obstacles);
  expandedCache.set(map.id, solids);
  return solids;
}

export function handleShoot(shooter, dir) {
  const now = Date.now();
  if (!shooter.alive) return null;
  if (now - shooter.lastShotAt < WEAPON.COOLDOWN_MS) return null;
  shooter.lastShotAt = now;

  const map = game.getMap();
  const solids = getSolids(map);
  const origin = { x: shooter.x, y: shooter.y, z: shooter.z };

  // normalize
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };

  const worldHit = raycastSolids(origin, d, WEAPON.RANGE, solids);
  const worldT = worldHit ? worldHit.t : WEAPON.RANGE;

  const playerHit = raycastPlayers(origin, d, shooter, worldT);

  if (playerHit) {
    const { victim, t, point, damage } = playerHit;
    applyDamage(shooter, victim, damage);
    return {
      origin, dir: d,
      hit: victim.id,
      point, t,
      damage,
    };
  }

  return {
    origin, dir: d,
    hit: null,
    point: worldHit ? worldHit.point : null,
    t: worldT,
    damage: 0,
  };
}

function raycastPlayers(origin, dir, shooter, maxT) {
  let best = null;

  for (const p of players.getAll().values()) {
    if (p.id === shooter.id || !p.alive) continue;
    if (shooter.team !== 'ffa' && p.team === shooter.team) continue;

    const hit = rayAABB(origin, dir, {
      x: p.x, y: p.y, z: p.z,
      w: PLAYER.RADIUS * 2, h: PLAYER.HEIGHT, d: PLAYER.RADIUS * 2,
    });

    if (hit == null) continue;
    if (hit > maxT) continue;
    if (best && hit >= best.t) continue;

    const point = {
      x: origin.x + dir.x * hit,
      y: origin.y + dir.y * hit,
      z: origin.z + dir.z * hit,
    };

    // headshot: top 25% of the AABB
    const topOfBox = p.y + PLAYER.HEIGHT / 2;
    const headLine = topOfBox - PLAYER.HEIGHT * 0.25;
    const isHead = point.y >= headLine;
    const damage = isHead ? WEAPON.DAMAGE_HEAD : WEAPON.DAMAGE_BODY;

    best = { victim: p, t: hit, point, damage };
  }

  return best;
}

// Local AABB raycast — player bodies are always boxes, not ramps.
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

function applyDamage(attacker, victim, dmg) {
  victim.health -= dmg;
  if (victim.health <= 0) {
    victim.health = 0;
    victim.alive = false;
    victim.deaths++;
    attacker.kills++;
    game.addKill(attacker.team);
    victim.respawnAt = Date.now() + PLAYER.RESPAWN_MS;
  }
}
