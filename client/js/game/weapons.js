import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { getWeapon } from '/shared/weapons.js';
import { state } from '../main.js';
import * as audio from '../core/audio.js';

const tracers = [];
const sparks = [];

export function onShot(msg) {
  const shooter = state.players.get(msg.shooter);
  if (shooter) {
    const w = getWeapon(msg.weaponId || 'rifle');
    audio.play(w.sound, {
      volume: 0.85,
      pitchVariance: 0.04,
      position: { x: shooter.x, y: shooter.y, z: shooter.z },
    });
  }

  if (!msg.point) return;
  drawTracer(msg.origin, msg.point);
  spawnImpact(msg.point);
}

export function update() {
  const now = performance.now();

  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    if (t.expires <= now) {
      getScene().remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      tracers.splice(i, 1);
    } else {
      t.line.material.opacity = (t.expires - now) / 150;
    }
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    if (s.expires <= now) {
      getScene().remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      sparks.splice(i, 1);
    } else {
      const k = (s.expires - now) / 220;
      s.mesh.material.opacity = k * 0.9;
      s.mesh.scale.setScalar(0.15 + (1 - k) * 0.25);
    }
  }
}

function drawTracer(origin, point) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(origin.x, origin.y, origin.z),
    new THREE.Vector3(point.x, point.y, point.z),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 1,
  });
  const line = new THREE.Line(geo, mat);
  getScene().add(line);
  tracers.push({ line, expires: performance.now() + 150 });
}

function spawnImpact(point) {
  const geo = new THREE.SphereGeometry(0.15, 6, 6);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffcc55,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(point.x, point.y, point.z);
  getScene().add(mesh);
  sparks.push({ mesh, expires: performance.now() + 220 });
}