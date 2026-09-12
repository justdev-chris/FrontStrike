import * as THREE from 'three';

let renderer = null;
let scene = null;
let camera = null;

export function init() {
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game'),
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.Fog(0x0a0a0c, 60, 140);

  camera = new THREE.PerspectiveCamera(
    80,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  const hemi = new THREE.HemisphereLight(0xaac4dd, 0x2a2a2a, 1.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(40, 80, 20);
  scene.add(sun);

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

export function getScene()  { return scene; }
export function getCamera() { return camera; }

export function render() {
  renderer.render(scene, camera);
}
