import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { getWeapon } from '/shared/weapons.js';

const active = new Map();      // id -> { mesh, x, y, z, vx, vy, vz, weaponId }
const explosions = [];

export function spawn(pr) {
  if (!pr || active.has(pr.id)) return;

  const w = getWeapon(pr.weaponId);
  const mesh = createRocketMesh();
  mesh.position.set(pr.x, pr.y, pr.z);
  getScene().add(mesh);

  active.set(pr.id, {
    id: pr.id,
    mesh,
    x: pr.x, y: pr.y, z: pr.z,
    vx: pr.vx, vy: pr.vy, vz: pr.vz,
    weaponId: pr.weaponId,
  });

  // orient the mesh to travel direction
  if (pr.vx || pr.vy || pr.vz) {
    const dir = new THREE.Vector3(pr.vx, pr.vy, pr.vz).normalize();
    mesh.lookAt(
      pr.x + dir.x,
      pr.y + dir.y,
      pr.z + dir.z
    );
  }
}

export function update(pr) {
  const p = active.get(pr.id);
  if (!p) return;
  p.x = pr.x; p.y = pr.y; p.z = pr.z;
  p.vx = pr.vx; p.vy = pr.vy; p.vz = pr.vz;
  p.mesh.position.set(pr.x, pr.y, pr.z);
}

export function end(id) {
  const p = active.get(id);
  if (!p) return;
  getScene().remove(p.mesh);
  disposeGroup(p.mesh);
  active.delete(id);
}

export function syncFromSnapshot(list) {
  const wanted = new Set();
  for (const pr of list) {
    wanted.add(pr.id);
    if (!active.has(pr.id)) spawn(pr);
    else update(pr);
  }
  for (const id of [...active.keys()]) {
    if (!wanted.has(id)) end(id);
  }
}

export function update3D(now) {
  // tick local explosion particles
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    if (e.expires <= now) {
      getScene().remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      explosions.splice(i, 1);
      continue;
    }

    const k = (e.expires - now) / 500;
    e.mesh.scale.setScalar(e.maxScale * (1 - k * 0.4));
    e.mesh.material.opacity = k * 0.85;
  }
}

export function explode(x, y, z, weaponId) {
  const w = getWeapon(weaponId || 'rpg');
  const radius = w.explosionRadius || 6;

  // shell
  const geo = new THREE.SphereGeometry(radius, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffcc55,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  getScene().add(mesh);
  explosions.push({
    mesh,
    expires: performance.now() + 500,
    maxScale: 1,
  });

  // inner bright core
  const coreGeo = new THREE.SphereGeometry(radius * 0.55, 12, 12);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(x, y, z);
  getScene().add(core);
  explosions.push({
    mesh: core,
    expires: performance.now() + 300,
    maxScale: 1,
  });
}

function createRocketMesh() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const tipMat  = new THREE.MeshLambertMaterial({ color: 0xcc3322 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 8), tipMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -0.55;
  g.add(tip);

  // exhaust
  const exhaust = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.5, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.6,
    })
  );
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.z = 0.6;
  g.add(exhaust);

  return g;
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