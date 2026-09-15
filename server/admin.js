import { ADMIN_ACTIONS } from '../shared/protocol.js';
import * as players from './players.js';
import * as game from './game.js';
import * as network from './network.js';

export function handleAdminAction(admin, msg) {
  if (!admin.isAdmin) return;

  switch (msg.action) {
    case ADMIN_ACTIONS.KICK: {
      const target = findByName(msg.targetName);
      if (!target) return;
      target.kicked = true;
      network.send(target.ws, {
        type: 'adminResult',
        action: 'kicked',
        reason: msg.reason || 'kicked by admin',
      });
      break;
    }

    case ADMIN_ACTIONS.SLAP: {
      const target = findByName(msg.targetName);
      if (!target) return;
      players.slap(target, msg.vx ?? 0, msg.vy ?? 8, msg.vz ?? 0);
      break;
    }

    case ADMIN_ACTIONS.TELEPORT: {
      const target = msg.targetName
        ? findByName(msg.targetName)
        : admin;
      if (!target) return;
      const x = Number.isFinite(msg.x) ? msg.x : admin.x;
      const y = Number.isFinite(msg.y) ? msg.y : admin.y;
      const z = Number.isFinite(msg.z) ? msg.z : admin.z;
      players.teleport(target, x, y, z);
      break;
    }

    case ADMIN_ACTIONS.GIVE_WEAPON: {
      const target = msg.targetName
        ? findByName(msg.targetName)
        : admin;
      if (!target) return;
      players.giveWeapon(target, msg.weaponId);
      break;
    }

    case ADMIN_ACTIONS.ANNOUNCE: {
      const text = String(msg.text || '').slice(0, 200);
      if (!text) return;
      network.broadcast({
        type: 'announce',
        text,
        from: admin.name,
      });
      break;
    }

    case ADMIN_ACTIONS.SET_GODMODE: {
      admin.godmode = !!msg.enabled;
      break;
    }

    case ADMIN_ACTIONS.SET_SPEED: {
      let mult = Number(msg.mult);
      if (!Number.isFinite(mult)) mult = 1;
      mult = Math.max(0.5, Math.min(5, mult));
      admin.speedMult = mult;
      break;
    }

    case ADMIN_ACTIONS.SET_NORELOAD: {
      admin.noReload = !!msg.enabled;
      if (admin.noReload) {
        const w = players.get(admin.id)?.weaponId;
        if (w) admin.magAmmo = 999;
      }
      break;
    }

    default:
      return;
  }
}

function findByName(name) {
  if (!name) return null;
  const lower = String(name).toLowerCase();
  for (const p of players.getAll().values()) {
    if (p.name.toLowerCase() === lower) return p;
  }
  return null;
}