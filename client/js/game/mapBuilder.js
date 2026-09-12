import * as THREE from 'three';

let group = null;
let currentMapId = null;

export function build(mapId) {
  if (currentMapId === mapId && group) return;

  const map = window.__MAPS__?.[mapId];
  if (!map) {
    console.warn(`[mapBuilder] unknown map: ${mapId}`);
    return;
  }

  if (group) {
    group.parent?.remove(group);
    disposeGroup(group);
  }

  group = new THREE.Group();
  currentMapId = mapId;

  const floorMat = new THREE.MeshLambertMaterial({ color: 0x1c1f24 });
  const floorGeo = new THREE.PlaneGeometry(map.mapSize, map.mapSize);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const grid = new THREE.GridHelper(map.mapSize, map.mapSize, 0x2a3038, 0x2a3038);
  grid.position.y = 0.01;
  group.add(grid);

  const boxMat = new THREE.MeshLambertMaterial({ color: 0x3a4048 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x556070 });

  for (const b of map.obstacles) {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, boxMat);
    mesh.position.set(b.x, b.y, b.z);
    group.add(mesh);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    edges.position.copy(mesh.position);
    group.add(edges);
  }

  const { getScene } = await_import_placeholder();
  getScene().add(group);
}

// three.js needs the scene; importing renderer here keeps main.js from threading it through.
import { getScene } from '../core/renderer.js';

function disposeGroup(g) {
  g.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}
