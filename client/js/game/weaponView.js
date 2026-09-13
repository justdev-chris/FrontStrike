import * as THREE from 'three';
import { getCamera } from '../core/renderer.js';
import { getWeapon } from '/shared/weapons.js';

const state = {
  weaponId: null,
  group: null,
  parts: {},
  muzzle: null,

  hipPos:    new THREE.Vector3(0.28, -0.22, -0.55),
  adsPos:    new THREE.Vector3(0.00, -0.10, -0.40),
  reloadPos: new THREE.Vector3(0.28, -0.55, -0.55),
  emotePos:  new THREE.Vector3(0.28, -0.65, -0.55),

  bobPhase: 0,
  bobAmp: 0,
  recoilOffsetZ: 0,
  recoilOffsetY: 0,
  recoilRot: 0,
  adsT: 0,
  reloadT: 0,
  emoteT: 0,

  reloading: false,
  aiming: false,
  emoting: false,
};

let clock = null;

export function init() {
  clock = new THREE.Clock();
}

export function setWeapon(weaponId) {
  if (state.weaponId === weaponId && state.group) return;
  removeViewmodel();
  state.weaponId = weaponId;
  buildViewmodel(weaponId);
}

export function getWeaponId() {
  return state.weaponId;
}

function buildViewmodel(weaponId) {
  const camera = getCamera();
  const group = new THREE.Group();

  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1e });
  const mid  = new THREE.MeshLambertMaterial({ color: 0x2e2e34 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x3a2418 });

  const parts = {};

  if (weaponId === 'rifle') {
    parts.body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.72), dark);
    parts.body.position.set(0, 0, 0);
    parts.barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), mid);
    parts.barrel.position.set(0, 0.01, -0.53);
    parts.mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.1), mid);
    parts.mag.position.set(0, -0.15, 0.08);
    parts.stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.18), wood);
    parts.stock.position.set(0, -0.02, 0.46);
  } else if (weaponId === 'smg') {
    parts.body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), dark);
    parts.barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.22), mid);
    parts.barrel.position.set(0, 0.01, -0.36);
    parts.mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.08), mid);
    parts.mag.position.set(0, -0.18, 0.06);
    parts.stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.1), dark);
    parts.stock.position.set(0, -0.01, 0.3);
  } else if (weaponId === 'sniper') {
    parts.body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.1), dark);
    parts.barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.5), mid);
    parts.barrel.position.set(0, 0.01, -0.8);
    parts.scope = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.34), mid);
    parts.scope.position.set(0, 0.12, 0.02);
    parts.mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.09), mid);
    parts.mag.position.set(0, -0.14, 0.18);
    parts.stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.28), wood);
    parts.stock.position.set(0, -0.02, 0.68);
  } else if (weaponId === 'pistol') {
    parts.body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.28), dark);
    parts.barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), mid);
    parts.barrel.position.set(0, 0.01, -0.2);
    parts.grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.08), dark);
    parts.grip.position.set(0, -0.13, 0.08);
    parts.grip.rotation.x = -0.2;
  }

  for (const key of Object.keys(parts)) group.add(parts[key]);

  state.muzzle = new THREE.PointLight(0xffaa33, 0, 6);
  state.muzzle.position.set(0, 0, -0.9);
  group.add(state.muzzle);

  group.position.copy(state.hipPos);
  camera.add(group);

  state.group = group;
  state.parts = parts;
}

function removeViewmodel() {
  if (!state.group) return;
  const camera = getCamera();
  camera.remove(state.group);
  disposeGroup(state.group);
  state.group = null;
  state.parts = {};
  state.muzzle = null;
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

export function setAiming(aiming) {
  state.aiming = aiming;
}

export function setReloading(reloading) {
  state.reloading = reloading;
}

export function setEmote(emoteId) {
  state.emoting = !!emoteId;
}

export function triggerRecoil() {
  const w = getWeapon(state.weaponId);
  if (!w) return;
  state.recoilOffsetZ = 0.06;
  state.recoilOffsetY = 0.02;
  state.recoilRot = 0.08;
}

export function triggerMuzzleFlash() {
  if (!state.muzzle) return;
  state.muzzle.intensity = 3.5;
  setTimeout(() => { if (state.muzzle) state.muzzle.intensity = 0; }, 45);
}

export function update(inputState) {
  if (!state.group) return;
  const w = getWeapon(state.weaponId);
  if (!w) return;

  const dt = clock.getDelta();

  // ---- ADS ----
  const adsTarget = state.aiming && !state.emoting ? 1 : 0;
  const adsRate = 1000 / Math.max(60, w.adsTimeMs);
  state.adsT = approach(state.adsT, adsTarget, adsRate * dt);

  // ---- reload dip ----
  const reloadTarget = state.reloading ? 1 : 0;
  state.reloadT = approach(state.reloadT, reloadTarget, 4 * dt);

  // ---- emote lower ----
  const emoteTarget = state.emoting ? 1 : 0;
  state.emoteT = approach(state.emoteT, emoteTarget, 5 * dt);

  // ---- bob ----
  const moving = inputState && (inputState.forward !== 0 || inputState.right !== 0);
  const speedFactor = moving && !state.emoting ? 1 : 0;
  state.bobAmp = approach(state.bobAmp, speedFactor, 4 * dt);
  state.bobPhase += dt * 8;

  // ---- recoil recovery ----
  const recover = dt / Math.max(0.05, w.recoilRecoverMs / 1000);
  state.recoilOffsetZ = approach(state.recoilOffsetZ, 0, recover * 0.4);
  state.recoilOffsetY = approach(state.recoilOffsetY, 0, recover * 0.4);
  state.recoilRot     = approach(state.recoilRot,     0, recover * 0.4);

  // ---- position ----
  const basePos = new THREE.Vector3().lerpVectors(state.hipPos, state.adsPos, state.adsT);

  // reload dip
  basePos.lerp(state.reloadPos, state.reloadT);

  // emote lower
  basePos.lerp(state.emotePos, state.emoteT);

  // bob (damped by ADS and emote)
  const bobScale = (1 - 0.7 * state.adsT) * (1 - state.emoteT);
  const bobX = Math.sin(state.bobPhase) * 0.012 * state.bobAmp * bobScale;
  const bobY = Math.abs(Math.cos(state.bobPhase * 2)) * 0.009 * state.bobAmp * bobScale;

  basePos.z += state.recoilOffsetZ;
  basePos.y += state.recoilOffsetY;

  state.group.position.set(basePos.x + bobX, basePos.y + bobY, basePos.z);

  // ---- rotation ----
  // recoil pitches gun up; reload tilts down; emote also tilts down
  state.group.rotation.x = state.recoilRot + state.reloadT * 0.8 + state.emoteT * 1.0;
  state.group.rotation.z = state.reloadT * 0.3 + state.emoteT * 0.15;
}

function approach(current, target, rate) {
  if (current < target) return Math.min(target, current + rate);
  if (current > target) return Math.max(target, current - rate);
  return target;
}
