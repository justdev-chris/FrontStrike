import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { PLAYER, NET } from '/shared/constants.js';
import { state } from '../main.js';

const INTERP_MS = NET.INTERP_DELAY_MS;
const avatars = new Map();

export function sync(players) {
  const wanted = new Set();
  for (const p of players) {
    wanted.add(p.id);
    if (p.id === state.myId) continue;
    if (!avatars.has(p.id)) create(p);
  }
  for (const id of [...avatars.keys()]) {
    if (!wanted.has(id)) remove(id);
  }
}

export function add(player) {
  if (player.id === state.myId) return;
  if (avatars.has(player.id)) return;
  create(player);
}

export function remove(id) {
  const a = avatars.get(id);
  if (!a) return;
  getScene().remove(a.group);
  disposeGroup(a.group);
  avatars.delete(id);
}

export function setEmote(playerId, emote, endsAt) {
  const a = avatars.get(playerId);
  if (!a) return;
  if (!emote) {
    a.emote = null;
    a.emoteEndsAt = 0;
    return;
  }
  a.emote = emote;
  a.emoteEndsAt = endsAt;
  a.emoteStart = performance.now();
}

export function applySnapshot(players) {
  const now = performance.now();
  for (const p of players) {
    if (p.id === state.myId) continue;
    const a = avatars.get(p.id);
    if (!a) continue;

    if (!p.alive) {
      if (a.alive) {
        a.alive = false;
        a.fallStart = now;
      }
      continue;
    }

    if (!a.alive) {
      a.alive = true;
      a.fallStart = null;
      a.group.rotation.x = 0;
      a.group.rotation.z = 0;
      a.snapshots.length = 0;
    }

    // server-side emote state sync (in case we missed the broadcast)
    if (p.emote !== a.emote) {
      if (p.emote) {
        a.emote = p.emote;
        a.emoteStart = now;
      } else {
        a.emote = null;
      }
    }

    a.aiming = !!p.aiming;

    a.snapshots.push({
      time: now,
      x: p.x, y: p.y, z: p.z,
      yaw: p.yaw, pitch: p.pitch,
    });
    while (a.snapshots.length > 20) a.snapshots.shift();
  }
}

export function update() {
  const now = performance.now();
  const renderTime = now - INTERP_MS;

  for (const a of avatars.values()) {
    if (!a.alive) {
      animateFall(a, now);
      continue;
    }

    const snaps = a.snapshots;
    if (snaps.length === 0) continue;

    let from = snaps[0];
    let to = snaps[snaps.length - 1];

    for (let i = 0; i < snaps.length - 1; i++) {
      if (snaps[i].time <= renderTime && snaps[i + 1].time >= renderTime) {
        from = snaps[i];
        to = snaps[i + 1];
        break;
      }
    }

    let t = 0;
    if (to.time > from.time) t = (renderTime - from.time) / (to.time - from.time);
    t = Math.max(0, Math.min(1, t));

    const px = from.x + (to.x - from.x) * t;
    const py = from.y + (to.y - from.y) * t - PLAYER.EYE_HEIGHT + 0.9;
    const pz = from.z + (to.z - from.z) * t;

    const dt = Math.max(0.001, (to.time - from.time) / 1000);
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const speed = Math.hypot(dx, dz) / dt;

    a.group.position.set(px, py, pz);
    a.group.rotation.y = lerpAngle(from.yaw, to.yaw, t);
    a.walkPhase += speed * dt * 2.4;

    const pitch = from.pitch + (to.pitch - from.pitch) * t;

    if (a.emote) {
      animateEmote(a, now, pitch);
    } else {
      animate(a, pitch, speed);
    }
  }
}

function animate(a, pitch, speed) {
  const speedNorm = Math.min(1, speed / PLAYER.MOVE_SPEED);
  const swing = Math.sin(a.walkPhase) * 0.6 * speedNorm;
  const bob = Math.abs(Math.sin(a.walkPhase * 2)) * 0.04 * speedNorm;

  a.legL.rotation.x =  swing;
  a.legR.rotation.x = -swing;

  a.body.position.y = a.bodyBaseY + bob;
  a.head.position.y = a.headBaseY + bob;

  const targetUpper = -pitch;
  a.upper.rotation.x = targetUpper;

  // arms track aim + pitch
  a.arms.rotation.x = -pitch;
  a.arms.position.y = a.armsBaseY + bob;

  // reset emote-influenced joints
  a.armL.rotation.x = 0;
  a.armL.rotation.z = 0;
  a.armR.rotation.x = 0;
  a.armR.rotation.z = 0;
  a.upper.rotation.z = 0;
  a.group.rotation.z = 0;
}

function animateEmote(a, now, pitch) {
  const t = (now - a.emoteStart) / 1000;

  // freeze limb baseline
  a.legL.rotation.x = 0;
  a.legR.rotation.x = 0;
  a.body.position.y = a.bodyBaseY;
  a.head.position.y = a.headBaseY;
  a.arms.position.y = a.armsBaseY;
  a.upper.rotation.x = 0;
  a.upper.rotation.z = 0;
  a.group.rotation.z = 0;

  switch (a.emote) {
    case 'wave': {
      // right arm up, wave back and forth
      a.armR.rotation.x = -2.6;
      a.armR.rotation.z = Math.sin(t * 8) * 0.4;
      a.armL.rotation.x = 0;
      a.armL.rotation.z = 0;
      break;
    }
    case 'dance': {
      // body wiggle + alternating legs
      const w = Math.sin(t * 6);
      a.upper.rotation.z = w * 0.25;
      a.group.rotation.z = w * 0.08;
      a.legL.rotation.x =  w * 0.4;
      a.legR.rotation.x = -w * 0.4;
      a.armL.rotation.x = -1.2 + w * 0.5;
      a.armR.rotation.x = -1.2 - w * 0.5;
      break;
    }
    case 'taunt': {
      // arms crossed, slight lean back
      a.armL.rotation.x = -1.9;
      a.armL.rotation.z = 0.6;
      a.armR.rotation.x = -1.9;
      a.armR.rotation.z = -0.6;
      a.upper.rotation.x = 0.15;
      break;
    }
    case 'point': {
      // right arm straight forward
      a.armR.rotation.x = -1.55;
      a.armR.rotation.z = 0;
      a.armL.rotation.x = 0;
      break;
    }
  }
}

function animateFall(a, now) {
  const elapsed = (now - a.fallStart) / 1000;
  const t = Math.min(1, elapsed / 0.5);
  const ease = 1 - Math.pow(1 - t, 3);

  a.group.rotation.x = -Math.PI / 2 * ease;
  a.group.position.y = a.deathBaseY - 0.4 * ease;

  a.legL.rotation.x = 0;
  a.legR.rotation.x = 0;
  a.arms.rotation.x = -0.3 * (1 - ease);
  a.upper.rotation.x = 0;
  a.armL.rotation.x = 0;
  a.armR.rotation.x = 0;
  a.armL.rotation.z = 0;
  a.armR.rotation.z = 0;
  a.upper.rotation.z = 0;
  a.group.rotation.z = 0;
}

export function onRespawn(player) {
  const a = avatars.get(player.id);
  if (!a) {
    add(player);
    return;
  }
  a.alive = true;
  a.fallStart = null;
  a.emote = null;
  a.emoteEndsAt = 0;
  a.group.rotation.x = 0;
  a.group.rotation.z = 0;
  a.group.position.y = player.y - PLAYER.EYE_HEIGHT + 0.9;
  a.snapshots.length = 0;
  a.snapshots.push({
    time: performance.now(),
    x: player.x, y: player.y, z: player.z,
    yaw: player.yaw, pitch: player.pitch,
  });
}

function create(p) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: colorFor(p) });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
  const legMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a24 });
  const armMat  = new THREE.MeshLambertMaterial({ color: colorFor(p) });
  const gunMat  = new THREE.MeshLambertMaterial({ color: 0x111114 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), bodyMat);
  body.position.y = 0.9;
  group.add(body);

  const upper = new THREE.Group();
  upper.position.set(0, 1.15, 0);
  group.add(upper);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
  head.position.y = 0.55;
  upper.add(head);

  const arms = new THREE.Group();
  arms.position.y = 0.35;
  upper.add(arms);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), armMat);
  armL.geometry.translate(0, -0.275, 0);
  armL.position.set(-0.36, 0, -0.15);
  arms.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), armMat);
  armR.geometry.translate(0, -0.275, 0);
  armR.position.set(0.36, 0, -0.15);
  arms.add(armR);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.55), gunMat);
  gun.position.set(0.28, -
