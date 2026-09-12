import * as THREE from 'three';
import { getScene } from '../core/renderer.js';

const tracers = [];   // { line, expires }

export function onShot(msg) {
  if (!msg.point) return;
  drawTracer(msg.origin, msg.point);
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
