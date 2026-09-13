import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { getMaterialTiled } from './textures.js';

let group = null;
let currentMapId = null;

export function build(map) {
  if (!map) return;
  if (currentMapId === map.id && group) return;

  if (group) {
    getScene().remove(group);
    disposeGroup(group);
  }

  group = new THREE.Group();
  currentMapId = map.id;

  // floor — tiled plane
  const floorMat = getMaterialTiled(floorMatFor(map), map.mapSize / 2, map.mapSize / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(map.mapSize, map.mapSize),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // grid overlay
  const grid = new THREE.GridHelper(map.mapSize, map.mapSize / 4, 0x000000, 0x000000);
  grid.position.y = 0.005;
  grid.material.opacity = 0.08;
  grid.material.transparent = true;
  group.add(grid);

  // solids
  for (const s of map.obstacles) {
    if (s.type === 'ramp') addRamp(s);
    else if (s.type === 'stairs') addStairs(s);
    else addBox(s);
  }

  // spawn pad markers
  addSpawnPads(map.spawns);

  getScene().add(group);
}

export function getCurrentMapId() {
  return currentMapId;
}

// ---------- builders ----------

function addBox(s) {
  const geo = new THREE.BoxGeometry(s.w, s.h, s.d);

  // tiling: roughly one texture tile per 2 units
  const repU = Math.max(1, Math.round(Math.max(s.w, s.d) / 2));
  const repV = Math.max(1, Math.round(s.h / 2));
  const mat = getMaterialTiled(s.mat || 'concrete', repU, repV);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(s.x, s.y, s.z);
  group.add(mesh);

  // edge outline for readability
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    edgeLineFor(s.mat)
  );
  edges.position.set(s.x, s.y, s.z);
  group.add(edges);
}

function addRamp(s) {
  // Build a wedge geometry. Footprint w x d, height rises from 0 to s.h
  // along `axis`, direction `dir`.
  const geo = new THREE.BufferGeometry();

  const hw = s.w / 2;
  const hd = s.d / 2;

  // eight corners — bottom flat, top sloped
  // local coords centered on footprint, y = 0 at low end, s.h at high end
  const lowY = 0;
  const highY = s.h;

  // Work out which local corner is low vs high along `axis`
  let lowX, highX, lowZ, highZ;
  if (s.axis === 'x') {
    // slope runs along X. low end at -X if dir=+1, +X if dir=-1.
    if (s.dir > 0) { lowX = -hw; highX = hw; } else { lowX = hw; highX = -hw; }
    lowZ = -hd; highZ = hd;
  } else {
    if (s.dir > 0) { lowZ = -hd; highZ = hd; } else { lowZ = hd; highZ = -hd; }
    lowX = -hw; highX = hw;
  }

  // verts: 4 bottom (y=lowY, full footprint), 4 top (sloped)
  const v = [];
  // bottom
  v.push(-hw, lowY, -hd);
  v.push( hw, lowY, -hd);
  v.push( hw, lowY,  hd);
  v.push(-hw, lowY,  hd);
  // top — height interpolates along axis
  const topHeights = cornerHeights(s);
  v.push(-hw, topHeights[0], -hd);
  v.push( hw, topHeights[1], -hd);
  v.push( hw, topHeights[2],  hd);
  v.push(-hw, topHeights[3],  hd);

  const positions = new Float32Array(v);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // indices for faces — box-like, but top is sloped
  const idx = [
    // bottom
    0, 2, 1,  0, 3, 2,
    // top
    4, 5, 6,  4, 6, 7,
    // sides
    0, 1, 5,  0, 5, 4,   // -Z face
    1, 2, 6,  1, 6, 5,   // +X face
    2, 3, 7,  2, 7, 6,   // +Z face
    3, 0, 4,  3, 4, 7,   // -X face
  ];
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // texture UVs — one tile per 2 units on each axis
  const uvs = new Float32Array([
    0, 0,  1, 0,  1, 1,  0, 1,
    0, 0,  1, 0,  1, 1,  0, 1,
  ]);
  // crude UV mapping is fine for flat/sloped surfaces
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const mat = getMaterialTiled(s.mat || 'metal', Math.max(1, s.w / 2), Math.max(1, s.d / 2));
  const mesh = new THREE.Mesh(geo, mat);

  // position at footprint center, with y offset so lowest corner is at s.y
  mesh.position.set(s.x, s.y, s.z);
  group.add(mesh);

  // edges
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    edgeLineFor(s.mat)
  );
  edges.position.set(s.x, s.y, s.z);
  group.add(edges);
}

// Corner heights for a ramp. Order matches top verts: [-hw,-hd], [hw,-hd], [hw,hd], [-hw,hd]
function cornerHeights(s) {
  const h = s.h;
  // t goes 0..1 along `axis` in the direction of slope
  const zAlong = s.axis === 'z';
  const xAlong = s.axis === 'x';
  const dir = s.dir;

  const tFor = (x, z) => {
    // x, z are in local space (-half..+half)
    let t;
    if (xAlong) {
      t = (x + s.w / 2) / s.w;      // 0 at -X, 1 at +X
    } else {
      t = (z + s.d / 2) / s.d;      // 0 at -Z, 1 at +Z
    }
    if (dir < 0) t = 1 - t;
    return t;
  };

  return [
    h * tFor(-s.w / 2, -s.d / 2),
    h * tFor( s.w / 2, -s.d / 2),
    h * tFor( s.w / 2,  s.d / 2),
    h * tFor(-s.w / 2,  s.d / 2),
  ];
}

function addStairs(s) {
  // stairs render as a stack of N boxes stepping up along `axis`
  const n = Math.max(1, s.steps | 0);
  const stepH = s.h / n;
  const run = (s.axis === 'x' ? s.w : s.d) / n;

  for (let i = 0; i < n; i++) {
    const t = i / n;
    let off = -( (s.axis === 'x' ? s.w : s.d) / 2 ) + run * (i + 0.5);
    if (s.dir < 0) off = -off;

    const cx = s.axis === 'x' ? s.x + off : s.x;
    const cz = s.axis === 'z' ? s.z + off : s.z;
    const cy = s.y + stepH * (i + 0.5);

    const w = s.axis === 'x' ? run : s.w;
    const d = s.axis === 'z' ? run : s.d;

    addBox({
      type: 'box',
      x: cx, y: cy, z: cz,
      w, h: stepH, d,
      mat: s.mat,
    });
  }
}

function addSpawnPads(spawns) {
  if (!spawns) return;

  const pads = [
    { list: spawns.red,  mat: 'spawnRed' },
    { list: spawns.blue, mat: 'spawnBlue' },
    { list: spawns.ffa,  mat: 'spawnFFA' },
  ];

  for (const { list, mat } of pads) {
    if (!list) continue;
    for (const sp of list) {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        getMaterialTiled(mat, 1, 1)
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(sp.x, 0.02, sp.z);
      group.add(pad);
    }
  }
}

// ---------- helpers ----------

function floorMatFor(map) {
  switch (map.id) {
    case 'pillars': return 'sand';
    case 'tower':   return 'panel';
    case 'bunker':  return 'concrete';
    case 'crossfire':
    default:        return 'concrete';
  }
}

function edgeLineFor(mat) {
  // darker edges for dark surfaces, lighter for bright
  const color =
    mat === 'sand'   ? 0x8a7350 :
    mat === 'wood'   ? 0x3a2414 :
    mat === 'grate'  ? 0x1a1c20 :
    mat === 'panel'  ? 0x0e1020 :
    mat === 'metal'  ? 0x2a2e34 :
                       0x2a2a2c;
  return new THREE.LineBasicMaterial({ color });
}

function disposeGroup(g) {
  g.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    }
  });
}
