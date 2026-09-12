import * as THREE from 'three';
import { getScene, getCamera } from '../core/renderer.js';
import { PLAYER, NET, WEAPON } from '../../../shared/constants.js';
import { state } from '../main.js';
import * as net from '../core/net.js';

const DT = 1 / 60;
const MAX_HISTORY = 128;

const local = {
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  yaw: 0,
  pitch: 0,
  onGround: true,
  seq: 0,
  history: [],
  alive: true,
  dead: false,
  respawnAt: 0,
};

let viewmodel = null;
let muzzle = null;

export function spawn(playerData) {
  if (!playerData) return;
  local.x = playerData.x;
  local.y = playerData.y;
  local.z = playerData.z;
  local.yaw = playerData.yaw || 0;
  local.pitch = playerData.pitch || 0;
  local.vx = local.vy = local.vz = 0;
  local.onGround = true;
  local.history.length = 0;
  local.alive = true;
  local.dead = false;

  buildViewmodel();

  syncCamera();
}

function buildViewmodel() {
  if (viewmodel) return;
  const camera = getCamera();

  viewmodel = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), bodyMat);
  body.position.set(0.28, -0.22, -0.55);
  viewmodel.add(body);

  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x111114 })
  );
  barrel.position.set(0.28, -0.20, -1.0);
  viewmodel.add(barrel);

  muzzle = new THREE.PointLight(0xffaa33, 0, 6);
  muzzle.position.set(0.28, -0.20, -1.2);
  viewmodel.add(muzzle);

  camera.add(viewmodel);
}

export function update(inputState) {
  if (local.dead) return;

  // look
  const sens = 0.0022;
  local.yaw   -= inputState.dx * sens;
  local.pitch -= inputState.dy * sens;
  local.pitch = Math.max(-1.5, Math.min(1.5, local.pitch));

  // movement
  const speed = PLAYER.MOVE_SPEED * (inputState.sprint ? PLAYER.SPRINT_MULT : 1);
  const sin = Math.sin(local.yaw);
  const cos = Math.cos(local.yaw);

  const fx = -sin * inputState.forward;
  const fz = -cos * inputState.forward;
  const rx =  cos * inputState.right;
  const rz = -sin * inputState.right;

  let mx = fx + rx;
  let mz = fz + rz;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }

  local.vx = mx * speed;
  local.vz = mz * speed;

  if (inputState.jump && local.onGround) {
    local.vy = PLAYER.JUMP_VELOCITY;
    local.onGround = false;
  }

  local.vy -= PLAYER.GRAVITY * DT;

  local.x += local.vx * DT;
  local.y += local.vy * DT;
  local.z += local.vz * DT;

  collide();

  // push to server + record history
  local.seq++;
  local.history.push({
    seq: local.seq,
    x: local.x, y: local.y, z: local.z,
    yaw: local.yaw, pitch: local.pitch,
    forward: inputState.forward,
    right: inputState.right,
    jump: inputState.jump,
    sprint: inputState.sprint,
  });
  while (local.history.length > MAX_HISTORY) local.history.shift();

  net.send({
    type: 'input',
    seq: local.seq,
    forward: inputState.forward,
    right: inputState.right,
    jump: inputState.jump,
    sprint: inputState.sprint,
    yaw: local.yaw,
    pitch: local.pitch,
  });

  if (inputState.fire) shoot();

  syncCamera();
}

let lastShotAt = 0;

function shoot() {
  const now = performance.now();
  if (now - lastShotAt < WEAPON.COOLDOWN_MS) return;
  lastShotAt = now;

  const camera = getCamera();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  net.send({
    type: 'shoot',
    dir: { x: dir.x, y: dir.y, z: dir.z },
  });

  flashMuzzle();
}

function flashMuzzle() {
  if (!muzzle) return;
  muzzle.intensity = 3;
  setTimeout(() => { muzzle.intensity = 0; }, 40);
}

function syncCamera() {
  const camera = getCamera();
  camera.position.set(local.x, local.y, local.z);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = local.yaw;
  camera.rotation.x = local.pitch;
}

function collide() {
  const obstacles = state.map?.obstacles;
  if (!obstacles) return;

  const r = PLAYER.RADIUS;
  const h = PLAYER.HEIGHT;

  for (const box of obstacles) {
    if (!overlapY(local.y, h, box)) continue;
    if (overlapX(local.x, r, box) && overlapZ(local.z, r, box)) {
      const pxL = box.x - box.w / 2 - r - local.x;
      const pxR = box.x + box.w / 2 + r - local.x;
      const pzB = box.z - box.d / 2 - r - local.z;
      const pzF = box.z + box.d / 2 + r - local.z;
      const dx = Math.abs(pxL) < Math.abs(pxR) ? pxL : pxR;
      const dz = Math.abs(pzB) < Math.abs(pzF) ? pzB : pzF;
      if (Math.abs(dx) < Math.abs(dz)) local.x += dx;
      else local.z += dz;
    }
  }

  local.onGround = false;
  const feet = local.y - h / 2;
  const head = local.y + h / 2;

  for (const box of obstacles) {
    const top = box.y + box.h / 2;
    const bottom = box.y - box.h / 2;
    if (!overlapX(local.x, r, box) || !overlapZ(local.z, r, box)) continue;

    if (local.vy <= 0 && feet <= top && feet >= top - 0.5) {
      local.y = top + h / 2;
      local.vy = 0;
      local.onGround = true;
    } else if (local.vy > 0 && head >= bottom && head <= bottom + 0.5) {
      local.y = bottom - h / 2;
      local.vy = 0;
    }
  }

  if (local.y - h / 2 <= 0) {
    local.y = h / 2;
    local.vy = 0;
    local.onGround = true;
  }
}

function overlapX(x, r, box) { return x + r > box.x - box.w / 2 && x - r < box.x + box.w / 2; }
function overlapZ(z, r, box) { return z + r > box.z - box.d / 2 && z - r < box.z + box.d / 2; }
function overlapY(y, h, box) { return y + h / 2 > box.y - box.h / 2 && y - h / 2 < box.y + box.h / 2; }

export function applySnapshot(players) {
  const me = players.find(p => p.id === state.myId);
  if (!me) return;
  state.health = me.health;
  state.alive = me.alive;
  state.kills = me.kills;
  state.deaths = me.deaths;
}

export function onDeath() {
  local.dead = true;
  local.alive = false;
  state.alive = false;
}

export function onRespawn(playerData) {
  spawn(playerData);
  state.alive = true;
}
