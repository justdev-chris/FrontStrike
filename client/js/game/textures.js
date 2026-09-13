import * as THREE from 'three';

// procedural canvas textures, generated once at startup and cached by name.
// each generator returns a THREE.CanvasTexture, tileable where possible.

const cache = new Map();

export function getTexture(name) {
  if (cache.has(name)) return cache.get(name);

  let tex;
  switch (name) {
    case 'concrete':  tex = makeConcrete('#5a5a5e', '#3f3f43'); break;
    case 'metal':     tex = makeMetal(); break;
    case 'grate':     tex = makeGrate(); break;
    case 'wood':      tex = makeWood(); break;
    case 'sand':      tex = makeSand(); break;
    case 'panel':     tex = makePanel(); break;
    case 'spawnRed':  tex = makeSpawnPad('#c23b4a'); break;
    case 'spawnBlue': tex = makeSpawnPad('#3b7ac2'); break;
    case 'spawnFFA':  tex = makeSpawnPad('#4f8'); break;
    default:          tex = makeConcrete('#5a5a5e', '#3f3f43'); break;
  }

  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(name, tex);
  return tex;
}

// ---------- generators ----------

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeConcrete(base, accent) {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // noise speckle
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = rand(-14, 14);
    d[i]     = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);

  // subtle darker grout lines every 64px, both axes
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // a few darker cracks
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = rand(0, size);
    let y = rand(0, size);
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += rand(-30, 30);
      y += rand(-30, 30);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return new THREE.CanvasTexture(c);
}

function makeMetal() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // base
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(0, 0, size, size);

  // vertical brushed streaks
  for (let x = 0; x < size; x++) {
    const shade = 60 + Math.floor(rand(-20, 20));
    ctx.fillStyle = `rgb(${shade - 8}, ${shade}, ${shade + 6})`;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x, 0, 1, size);
  }
  ctx.globalAlpha = 1;

  // rivets along edges
  ctx.fillStyle = '#23262b';
  const rivet = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const spacing = 32;
  for (let i = spacing / 2; i < size; i += spacing) {
    rivet(i, 8);
    rivet(i, size - 8);
    rivet(8, i);
    rivet(size - 8, i);
  }

  return new THREE.CanvasTexture(c);
}

function makeGrate() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#181a1d';
  ctx.fillRect(0, 0, size, size);

  // grid of slats
  const step = 32;
  ctx.strokeStyle = '#4a4f56';
  ctx.lineWidth = 4;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // highlight on top-left of each bar
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i - 2, 0); ctx.lineTo(i - 2, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i - 2); ctx.lineTo(size, i - 2); ctx.stroke();
  }

  return new THREE.CanvasTexture(c);
}

function makeWood() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // plank rows
  const plankH = 32;
  for (let y = 0; y < size; y += plankH) {
    const shade = 90 + Math.floor(rand(-20, 20));
    ctx.fillStyle = `rgb(${shade + 30}, ${shade + 10}, ${shade - 30})`;
    ctx.fillRect(0, y, size, plankH);

    // grain lines
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const gy = y + rand(2, plankH - 2);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(
        size * 0.3, gy + rand(-3, 3),
        size * 0.6, gy + rand(-3, 3),
        size,      gy + rand(-2, 2)
      );
      ctx.stroke();
    }

    // dark seam under each plank
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, y + plankH);
    ctx.lineTo(size, y + plankH);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(c);
}

function makeSand() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#c2a377';
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = rand(-18, 18);
    d[i]     = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n * 0.8);
    d[i + 2] = clamp(d[i + 2] + n * 0.5);
  }
  ctx.putImageData(img, 0, 0);

  // sparse pebbles
  for (let i = 0; i < 120; i++) {
    const x = rand(0, size);
    const y = rand(0, size);
    const r = rand(0.5, 1.8);
    ctx.fillStyle = `rgba(60, 40, 20, ${rand(0.15, 0.4)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(c);
}

function makePanel() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // dark base
  ctx.fillStyle = '#1e2230';
  ctx.fillRect(0, 0, size, size);

  // large square panels with seam highlights
  const panel = 64;
  for (let y = 0; y < size; y += panel) {
    for (let x = 0; x < size; x += panel) {
      ctx.fillStyle = `rgb(${28 + Math.floor(rand(-4, 6))}, ${34 + Math.floor(rand(-4, 6))}, ${50 + Math.floor(rand(-4, 6))})`;
      ctx.fillRect(x + 1, y + 1, panel - 2, panel - 2);

      // top-left bright edge
      ctx.strokeStyle = 'rgba(120, 160, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 1);
      ctx.lineTo(x + panel - 2, y + 1);
      ctx.lineTo(x + panel - 2, y + panel - 2);
      ctx.stroke();

      // bottom-right dark edge
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(x + panel - 2, y + panel - 2);
      ctx.lineTo(x + 1, y + panel - 2);
      ctx.lineTo(x + 1, y + 1);
      ctx.stroke();

      // small status light
      if (Math.random() < 0.25) {
        ctx.fillStyle = Math.random() < 0.5
          ? 'rgba(80, 255, 140, 0.7)'
          : 'rgba(255, 100, 100, 0.7)';
        ctx.beginPath();
        ctx.arc(x + panel - 10, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return new THREE.CanvasTexture(c);
}

function makeSpawnPad(colorHex) {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  // base
  ctx.fillStyle = '#14161a';
  ctx.fillRect(0, 0, size, size);

  // outlined square border
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, size - 32, size - 32);

  // inner ring
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // crosshair marks
  ctx.lineWidth = 4;
  const m = size * 0.08;
  const g = size * 0.36;
  ctx.beginPath();
  ctx.moveTo(size / 2, m); ctx.lineTo(size / 2, m + g); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size / 2, size - m); ctx.lineTo(size / 2, size - m - g); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m, size / 2); ctx.lineTo(m + g, size / 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size - m, size / 2); ctx.lineTo(size - m - g, size / 2); ctx.stroke();

  // faded "spawn" style diagonal hatching outside the ring
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let i = 0; i < size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 16);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return new THREE.CanvasTexture(c);
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Material presets — one material per type, reused everywhere.
// Created lazily so `document` exists.
const materialCache = new Map();

export function getMaterial(name) {
  if (materialCache.has(name)) return materialCache.get(name);

  const tex = getTexture(name);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshLambertMaterial({ map: tex });
  materialCache.set(name, mat);
  return mat;
}

// Set UV repeat on a per-mesh basis without duplicating the texture.
// Returns a material variant with a cloned texture that has its own repeat.
export function getMaterialTiled(name, repeatU, repeatV) {
  const base = getMaterial(name);
  const tex = base.map.clone();
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatU, repeatV);
  tex.anisotropy = 4;

  return new THREE.MeshLambertMaterial({ map: tex });
}

// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im okay
// im not going insane //6
// ???
// im not going insane
// im not going insane
// im not going insane
// im not going insane
// im not going insane
