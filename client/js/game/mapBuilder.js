import * as THREE from 'three';
import { getScene } from '../core/renderer.js';
import { getMaterialTiled } from './textures.js';

let group = null;
let currentMapId = null;
const healthPackMeshes = new Map();

export function build(map) {
  if (!map) return;
  if (currentMapId === map.id && group) return;

  if (group) {
    getScene().remove(group);
    disposeGroup(group);
    group = null;
    healthPackMeshes.clear();
  }

  group = new THREE.Group();
  currentMapId = map.id;

  const floorMat = getMaterialTiled(floorMatFor(map), map.mapSize / 2, map.mapSize / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(map.mapSize, map.mapSize),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const grid = new THREE.GridHelper(map.mapSize, map.mapSize / 4, 0x000000, 0x000000);
  grid.position.y = 0.005;
  grid.material.opacity = 0.08;
  grid.material.transparent = true;
  group.add(grid);

  for (const s of map.obstacles) {
    if (s.type === 'ramp') addRamp(s);
    else if (s.type === 'stairs') addStairs(s);
    else addBox(s);
  }

  addSpawnPads(map.spawns);
  addHealthPacks(map.healthPacks || []);

  getScene().add(group);
}

export function getCurrentMapId() {
  return currentMapId;
}

export function updateHealthPacks(packs) {
  if (!packs || !group) return;
  for (const hp of packs) {
    const mesh = healthPackMeshes.get(hp.id);
    if (!mesh) continue;

    mesh.visible = !!hp.active;
    if (hp.active) {
      mesh.position.set(hp.x, hp.y + 0.5, hp.z);
    }
  }
}

function addHealthPacks(list) {
  for (let i = 0; i < list.length; i++) {
    const hp = list[i];
    const mesh = createHealthPackMesh();
    mesh.position.set(hp.x, hp.y + 0.5, hp.z);
    group.add(mesh);
    healthPackMeshes.set(i, mesh);
  }
}

function createHealthPackMesh() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const crossMat = new THREE.MeshLambertMaterial({ color: 0xe3354a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), bodyMat);
  g.add(body);

  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.16), crossMat);
  crossA.position.z = 0.29;
  g.add(crossA);

  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.16), crossMat);
  crossB.position.z = 0.29;
  g.add(crossB);

  const crossC = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.6), crossMat);
  crossC.position.x = 0.29;
  g.add(crossC);

  const crossD = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.6), crossMat);
  crossD.position.x = 0.29;
  g.add(crossD);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 24),
    new THREE.MeshBasicMaterial({
      color: 0x4f8,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.4;
  g.add(glow);

  return g;
}

function addBox(s) {
  const geo = new THREE.BoxGeometry(s.w, s.h, s.d);
  const repU = Math.max(1, Math.round(Math.max(s.w, s.d) / 2));
  const repV = Math.max(1, Math.round(s.h / 2));
  const mat = getMaterialTiled(s.mat || 'concrete', repU, repV);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(s.x, s.y, s.z);
  group.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    edgeLineFor(s.mat)
  );
  edges.position.set(s.x, s.y, s.z);
  group.add(edges);
}

function addRamp(s) {
  const geo = buildRampGeometry(s);
  const mat = getMaterialTiled(s.mat || 'metal', Math.max(1, s.w / 2), Math.max(1, s.d / 2));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(s.x, s.y, s.z);
  group.add(mesh);

  // Only outer silhouette edges (12 edges of the wedge), not triangle diagonals
  const edges = new THREE.LineSegments(
    buildRampOutline(s),
    edgeLineFor(s.mat)
  );
  edges.position.set(s.x, s.y, s.z);
  group.add(edges);
}

function buildRampGeometry(s) {
  const hw = s.w / 2;
  const hd = s.d / 2;

  const tops = cornerHeights(s);

  // 8 vertices
  // bottom (0-3), top (4-7)
  const positions = new Float32Array([
    // bottom
    -hw, 0,       -hd,
     hw, 0,       -hd,
     hw, 0,        hd,
    -hw, 0,        hd,
    // top
    -hw, tops[0], -hd,
     hw, tops[1], -hd,
     hw, tops[2],  hd,
    -hw, tops[3],  hd,
  ]);

  // faces: bottom quad, top quad, 4 sides
  const indices = [
    // bottom
    0, 2, 1,  0, 3, 2,
    // top
    4, 5, 6,  4, 6, 7,
    // sides
    0, 1, 5,  0, 5, 4,   // -Z
    1, 2, 6,  1, 6, 5,   // +X
    2, 3, 7,  2, 7, 6,   // +Z
    3, 0, 4,  3, 4, 7,   // -X
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);

  // proper UVs per face
  const uvs = new Float32Array([
    0, 0,  1, 0,  1, 1,  0, 1,   // bottom
    0, 0,  1, 0,  1, 1,  0, 1,   // top
  ]);

  // side faces reuse scaled UVs from their corner coordinates
  // (approximate; each side is a quad)
  const sideUVs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const fullUVs = new Float32Array([...uvs, ...sideUVs]);

  // We have 8 verts but each face vertex may need its own UV.
  // Simplest: non-indexed geometry with per-triangle UVs.
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();

  const pos = nonIndexed.getAttribute('position');
  const uvArr = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i += 3) {
    const tri = i / 3;
    if (tri < 2) {
      // bottom triangle
      uvArr[i*2]     = 0; uvArr[i*2+1]     = 0;
      uvArr[(i+1)*2] = 1; uvArr[(i+1)*2+1] = 0;
      uvArr[(i+2)*2] = 1; uvArr[(i+2)*2+1] = 1;
    } else if (tri < 4) {
      // top triangle
      uvArr[i*2]     = 0; uvArr[i*2+1]     = 0;
      uvArr[(i+1)*2] = 1; uvArr[(i+1)*2+1] = 0;
      uvArr[(i+2)*2] = 1; uvArr[(i+2)*2+1] = 1;
    } else {
      // side triangles — scaled by aspect
      uvArr[i*2]     = 0; uvArr[i*2+1]     = 0;
      uvArr[(i+1)*2] = 1; uvArr[(i+1)*2+1] = 0;
      uvArr[(i+2)*2] = 1; uvArr[(i+2)*2+1] = 1;
    }
  }

  nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

function buildRampOutline(s) {
  const hw = s.w / 2;
  const hd = s.d / 2;
  const tops = cornerHeights(s);

  const v = [
    new THREE.Vector3(-hw, 0,       -hd),
    new THREE.Vector3( hw, 0,       -hd),
    new THREE.Vector3( hw, 0,        hd),
    new THREE.Vector3(-hw, 0,        hd),
    new THREE.Vector3(-hw, tops[0], -hd),
    new THREE.Vector3( hw, tops[1], -hd),
    new THREE.Vector3( hw, tops[2],  hd),
    new THREE.Vector3(-hw, tops[3],  hd),
  ];

  const edgePairs = [
    [0,1],[1,2],[2,3],[3,0],   // bottom
    [4,5],[5,6],[6,7],[7,4],   // top
    [0,4],[1,5],[2,6],[3,7],   // verticals
  ];

  const pts = [];
  for (const [a, b] of edgePairs) {
    pts.push(v[a], v[b]);
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return geo;
}

function cornerHeights(s) {
  const h = s.h;
  const xAlong = s.axis === 'x';
  const dir = s.dir;

  const tFor = (x, z) => {
    let t;
    if (xAlong) t = (x + s.w / 2) / s.w;
    else t = (z + s.d / 2) / s.d;
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
  const n = Math.max(1, s.steps | 0);
  const stepH = s.h / n;
  const run = (s.axis === 'x' ? s.w : s.d) / n;

  for (let i = 0; i < n; i++) {
    let off = -((s.axis === 'x' ? s.w : s.d) / 2) + run * (i + 0.5);
    if (s.dir < 0) off = -off;

    const cx = s.axis === 'x' ? s.x + off : s.x;
    const cz = s.axis === 'z' ? s.z + off : s.z;
    const cy = s.y + stepH * (i + 0.5);

    const w = s.axis === 'x' ? run : s.w;
    const d = s.axis === 'z' ? run : s.d;

    addBox({ type: 'box', x: cx, y: cy, z: cz, w, h: stepH, d, mat: s.mat });
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