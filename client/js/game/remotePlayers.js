import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { PLAYER, NET } from '../../../shared/constants.js';
import { state } from '../main.js';

const INTERP_MS = NET.INTERP_DELAY_MS;
const avatars = new Map();   // id -> { group, snapshots: [{time, x, y, z, yaw, pitch}] }

export function sync(players) {
  const wanted = new Set();
  for (const p of players) {
    wanted.add(p.id);
    if (p.id === state.myId) continue;
    if (!avatars.has(p.id)) create(p);
  }
  for (const id of avatars.keys()) {
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

export function applySnapshot(players) {
  const now = performance.now();
  for (const p of players) {
    if (p.id === state.myId) continue;
    if (!p.alive) continue;
    const a = avatars.get(p.id);
    if (!a) continue;
    a.snapshots.push({
      time: now,
      x: p.x, y: p.y, z: p.z,
      yaw: p.yaw, pitch: p.pitch,
    });
    // prune old
    while (a.snapshots.length > 20) a.snapshots.shift();
  }
}

export function update() {
  const now = performance.now();
  const renderTime = now - INTERP_MS;

  for (const a of avatars.values()) {
    const snaps = a.snapshots;
    if (snaps.length === 0) continue;

    // find the two snapshots surrounding renderTime
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

    a.group.position.x = from.x + (to.x - from.x) * t;
    a.group.position.y = from.y + (to.y - from.y) * t;
    a.group.position.z = from.z + (to.z - from.z) * t;

    a.group.rotation.y = lerpAngle(from.yaw, to.yaw, t);
    a.group.children[1].rotation.x = from.pitch + (to.pitch - from.pitch) * t;
  }
}

export function onRespawn(player) {
  const a = avatars.get(player.id);
  if (!a) {
    add(player);
    return;
  }
  a.group.visible = true;
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), bodyMat);
  body.position.y = 0.9;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xf0c8a0 })
  );
  head.position.y = 1.7;
  group.add(head);

  const legMat = new THREE.MeshLambertMaterial({ color: 0x1a1a24 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.28), legMat);
  legL.position.set(-0.16, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legL, legR);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.55),
    new THREE.MeshLambertMaterial({ color: 0x111114 })
  );
  gun.position.set(0.3, 1.1, -0.3);
  group.add(gun);

  group.position.set(p.x, p.y - PLAYER.EYE_HEIGHT + 0.9, p.z);
  getScene().add(group);

  avatars.set(p.id, {
    group,
    snapshots: [{
      time: performance.now(),
      x: p.x, y: p.y, z: p.z,
      yaw: p.yaw, pitch: p.pitch,
    }],
  });
}

function colorFor(p) {
  if (p.team === 'red')  return 0xc23b4a;
  if (p.team === 'blue') return 0x3b7ac2;
  return new THREE.Color().setHSL((p.id * 0.618) % 1, 0.55, 0.55).getHex();
}

function disposeGroup(g) {
  g.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
