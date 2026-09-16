import * as THREE from 'three';
import { getCamera } from '../core/renderer.js';

const layer = (() => {
  let el = null;
  return {
    get() {
      if (!el) el = document.getElementById('damageNumberLayer');
      return el;
    },
  };
})();

const numbers = [];
const NUMBER_TTL_MS = 900;

const _v = new THREE.Vector3();

export function spawn(worldPoint, amount, opts = {}) {
  const host = layer.get();
  if (!host) return;

  const div = document.createElement('div');
  div.className = 'damage-number';
  if (opts.headshot) div.classList.add('headshot');
  if (opts.kill) div.classList.add('kill');
  div.textContent = String(Math.round(amount));

  host.appendChild(div);

  numbers.push({
    el: div,
    world: { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
    expires: performance.now() + NUMBER_TTL_MS,
  });
}

export function update() {
  if (numbers.length === 0) return;
  const cam = getCamera();
  if (!cam) return;

  const now = performance.now();

  for (let i = numbers.length - 1; i >= 0; i--) {
    const n = numbers[i];
    if (n.expires <= now) {
      if (n.el.parentNode) n.el.parentNode.removeChild(n.el);
      numbers.splice(i, 1);
      continue;
    }

    _v.set(n.world.x, n.world.y, n.world.z);
    _v.project(cam);

    if (_v.z > 1) {
      n.el.style.display = 'none';
      continue;
    }

    n.el.style.display = 'block';
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    n.el.style.left = `${x}px`;
    n.el.style.top = `${y}px`;
  }
}

export function clear() {
  const host = layer.get();
  if (host) host.innerHTML = '';
  numbers.length = 0;
}
