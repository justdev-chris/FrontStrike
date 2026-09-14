import { PLAYER } from '../shared/constants.js';
import { STREAKS } from '../shared/protocol.js';
import { getWeapon } from '../shared/weapons.js';
import { raycastSolids, expandStairs } from '../shared/collision.js';
import * as players from './players.js';
import * as game from './game.js';

const expandedCache = new Map();

function getSolids(map) {
  if (expandedCache.has(map.id)) return expandedCache.get(map.id);
  const solids = expandStairs(map.obstacles);
  expandedCache.set(map.id, solids);
  return solids;
}

// Returned so network.js can broadcast streak announcements.
export function handleShoot(shooter, dir, requestedWeaponId) {
  const now = Date.now();
  if (!shooter.alive) return null;

  const w = getWeapon(shooter.weaponId);

  if (now - shooter.lastShotAt < w.fireRateMs) return null;
  if (shooter.reloading) return null;
  if (shooter.magAmmo <= 0) return null;

  shooter.lastShotAt = now;
  shooter.magAmmo--;

  const map = game.getMap();
  const solids = getSolids(map);
  const origin = { x: shooter.x, y: shooter.y, z: shooter.z };

  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };

  const worldHit = raycastSolids(origin, d, w.range, solids);
  const worldT = worldHit ? worldHit.t : w.range;

  const playerHit = raycastPlayers(origin, d, shooter, worldT, w);

  if (playerHit) {
    const { victim, t, point, damage } = playerHit;
    const killResult = applyDamage(shooter, victim, damage);
    return {
      origin, dir: d,
      hit: victim.id,
      point, t,
      damage,
      killed: killResult.killed,
      streak: killResult.streak,
      hitLimit: killResult.hitLimit,
    };
  }

  return {
    origin, dir: d,
    hit: null,
    point: worldHit ? worldHit.point : null,
    t: worldT,
    damage: 0,
    killed: false,
    streak: null,
    hitLimit: false,
  };
}

function raycastPlayers(origin, dir, shooter, maxT, weapon) {
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

    const topOfBox = p.y + PLAYER.HEIGHT / 2;
    const headLine = topOfBox - PLAYER.HEIGHT * 0.25;
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

function applyDamage(attacker, victim, dmg) {
  victim.health -= dmg;

  if (victim.health > 0) {
    return { killed: false, streak: null, hitLimit: false };
  }

  // killed
  victim.health = 0;
  victim.alive = false;
  victim.deaths++;
  victim.streak = 0;              // streak dies with you
  attacker.kills++;
  attacker.streak = (attacker.streak || 0) + 1;

  game.addKill(attacker.team);

  victim.respawnAt = Date.now() + PLAYER.RESPAWN_MS;
  victim.reloading = false;
  victim.aiming = false;

  const streakName = STREAKS[attacker.streak] || null;
  const hitLimit = game.checkKillLimit(attacker);

  return { killed: true, streak: streakName, hitLimit };
}
