import * as THREE from 'three';
import { getCamera } from '../core/renderer.js';
import { PLAYER, SLIDE } from '/shared/constants.js';
import { getWeapon } from '/shared/weapons.js';
import { moveAndCollide, expandStairs } from '/shared/collision.js';
import { state } from '../main.js';
import { getSettings } from '../ui/menu.js';
import * as net from '../core/net.js';
import * as audio from '../core/audio.js';
import * as weaponView from './weaponView.js';
import * as scope from './scope.js';
import * as admin from '../ui/admin.js';

const DT = 1 / 60;
const MAX_HISTORY = 128;
const RECONCILE_THRESHOLD = 0.05;
const JUMP_BUFFER_FRAMES = 6;
const COYOTE_FRAMES = 6;

const local = {
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  yaw: 0,
  pitch: 0,
  onGround: true,
  seq: 0,
  lastAckedSeq: 0,
  history: [],
  alive: true,
  dead: false,

  height: PLAYER.HEIGHT,

  weaponId: 'rifle',
  magAmmo: 30,
  reloading: false,
  reloadEndsAt: 0,
  aiming: false,

  recoilPitch: 0,
  recoilYaw: 0,

  lastShotAt: 0,

  emote: null,
  emoteEndsAt: 0,

  sliding: false,
  slideEndsAt: 0,
  slideCooldownUntil: 0,

  jumpBuffer: 0,
  coyote: 0,
};

let cachedSolids = null;
let cachedMapId = null;

function getSolids() {
  const map = state.map;
  if (!map) return [];
  if (cachedMapId === map.id && cachedSolids) return cachedSolids;
  cachedSolids = expandStairs(map.obstacles);
  cachedMapId = map.id;
  return cachedSolids;
}

export function spawn(playerData) {
  if (!playerData) return;
  local.x = playerData.x;
  local.y = playerData.y;
  local.z = playerData.z;
  local.yaw = playerData.yaw || 0;
  local.pitch = playerData.pitch || 0;
  local.vx = local.vy = local.vz = 0;
  local.onGround = true;
  local.seq = 0;
  local.lastAckedSeq = 0;
  local.history.length = 0;
  local.alive = true;
  local.dead = false;
  local.jumpBuffer = 0;
  local.coyote = 0;
  local.height = PLAYER.HEIGHT;
  local.sliding = false;
  local.slideEndsAt = 0;
  local.slideCooldownUntil = 0;

  const w = getWeapon(local.weaponId);
  local.magAmmo = w.magSize;
  local.reloading = false;
  local.aiming = false;
  local.recoilPitch = 0;
  local.recoilYaw = 0;

  local.emote = null;
  local.emoteEndsAt = 0;

  weaponView.setWeapon(local.weaponId);
  syncCamera();
}

export function update(inputState, now) {
  if (local.dead) return;

  if (local.emote) {
    const moving = Math.abs(inputState.forward) > 0.01 || Math.abs(inputState.right) > 0.01;
    if (moving || inputState.fire) {
      local.emote = null;
      local.emoteEndsAt = 0;
      net.send({ type: 'emote', emote: null });
    }
    if (local.emote && now >= local.emoteEndsAt) {
      local.emote = null;
      local.emoteEndsAt = 0;
    }
  }

  const settings = getSettings();
  const baseSens = (settings?.sensitivity ?? 2.2) / 1000;

  const w = getWeapon(local.weaponId);
  const fovScale = local.aiming ? (w.adsZoom / 80) : 1;
  const sens = baseSens * fovScale;

  local.yaw   -= inputState.dx * sens;
  local.pitch -= inputState.dy * sens;

  const recoverRate = 1000 / Math.max(60, w.recoilRecoverMs);
  local.recoilPitch = approach(local.recoilPitch, 0, (recoverRate / 1000) * DT * 3);
  local.recoilYaw   = approach(local.recoilYaw, 0,   (recoverRate / 1000) * DT * 3);

  const effPitch = clamp(local.pitch + local.recoilPitch, -1.5, 1.5);
  const effYaw   = local.yaw + local.recoilYaw;

  if (!local.emote) {
    handleWeaponInputs(inputState, now);
    if (inputState.fire && canShoot(now)) shoot(effYaw, effPitch);
  }

  const moveMult = local.aiming ? w.moveMultAds : 1;
  step(inputState, moveMult, effYaw, now);

  local.seq++;
  local.history.push({
    seq: local.seq,
    x: local.x, y: local.y, z: local.z,
    yaw: local.yaw, pitch: local.pitch,
    forward: inputState.forward,
    right: inputState.right,
    jump: inputState.jump,
    sprint: inputState.sprint,
    crouch: inputState.crouch,
  });
  while (local.history.length > MAX_HISTORY) local.history.shift();

  net.send({
    type: 'input',
    seq: local.seq,
    forward: inputState.forward,
    right: inputState.right,
    jump: inputState.jump,
    sprint: inputState.sprint,
    crouch: inputState.crouch,
    yaw: effYaw,
    pitch: effPitch,
    aiming: local.aiming,
    weaponId: local.weaponId,
    reloading: local.reloading,
  });

  weaponView.setAiming(local.aiming);
  weaponView.setReloading(local.reloading);
  weaponView.setEmote(local.emote);
  weaponView.setSliding(local.sliding);
  weaponView.update(inputState);
  scope.update(local.aiming, local.weaponId);

  syncCamera(effPitch, effYaw);

  state.magAmmo = local.magAmmo;
  state.reloading = local.reloading;
  state.weaponId = local.weaponId;
  state.aiming = local.aiming;
  state.sliding = local.sliding;
}

function handleWeaponInputs(inputState, now) {
  if (inputState.switchWeapon) {
    switchWeapon(inputState.switchWeapon);
  }

  if (inputState.emote) {
    triggerEmote(inputState.emote);
  }

  if (inputState.reload && !local.reloading) {
    startReload(now);
  }

  local.aiming = !!inputState.aim && !local.reloading && !local.sliding;

  if (local.reloading && now >= local.reloadEndsAt) {
    finishReload();
  }
}

function switchWeapon(slotId) {
  if (slotId === local.weaponId) return;
  const w = getWeapon(slotId);
  if (!w) return;
  if (w.adminOnly && !state.isAdmin) return;

  local.weaponId = slotId;
  local.magAmmo = w.magSize;
  local.reloading = false;
  local.aiming = false;
  local.recoilPitch = 0;
  local.recoilYaw = 0;
  weaponView.setWeapon(slotId);

  if (local.emote) {
    local.emote = null;
    local.emoteEndsAt = 0;
  }
}

export function setEmote(emoteId, endsAt) {
  local.emote = emoteId;
  local.emoteEndsAt = endsAt;
}

export function clearEmote() {
  local.emote = null;
  local.emoteEndsAt = 0;
}

function triggerEmote(emoteId) {
  if (local.emote) return;
  if (local.reloading) return;
  net.send({ type: 'emote', emote: emoteId });
}

function startReload(now) {
  const w = getWeapon(local.weaponId);
  if (local.magAmmo >= w.magSize) return;
  local.reloading = true;
  local.reloadEndsAt = now + w.reloadMs;
  local.aiming = false;
  if (local.emote) {
    local.emote = null;
    local.emoteEndsAt = 0;
  }
  audio.play('reload', { volume: 0.6 });
}

function finishReload() {
  const w = getWeapon(local.weaponId);
  local.magAmmo = w.magSize;
  local.reloading = false;
}

function canShoot(now) {
  if (local.reloading) return false;
  if (local.sliding) return false;
  const w = getWeapon(local.weaponId);
  if (local.magAmmo <= 0) return false;
  if (now - local.lastShotAt < w.fireRateMs) return false;
  return true;
}

function shoot(effYaw, effPitch) {
  const now = performance.now();
  local.lastShotAt = now;
  local.magAmmo--;
  const w = getWeapon(local.weaponId);

  local.recoilPitch += w.recoilPitch;
  local.recoilYaw   += (Math.random() * 2 - 1) * w.recoilYaw;

  let dir;
  if (state.isAdmin && admin.isAimbotEnabled()) {
    const target = findNearestTarget();
    if (target) {
      const dx = target.x - local.x;
      const dy = target.y - local.y;
      const dz = target.z - local.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      dir = { x: dx / len, y: dy / len, z: dz / len };
    } else {
      dir = directionFromAngles(effYaw, effPitch);
    }
  } else {
    dir = directionFromAngles(effYaw, effPitch);
  }

  net.send({
    type: 'shoot',
    weaponId: local.weaponId,
    dir: { x: dir.x, y: dir.y, z: dir.z },
  });

  audio.play(w.sound, {
    volume: 0.7,
    pitchVariance: 0.04,
  });

  weaponView.triggerRecoil();
  weaponView.triggerMuzzleFlash();

  if (local.magAmmo <= 0) {
    startReload(now);
  }
}

// Nearest living enemy, anywhere on the map, regardless of view angle.
// Friendly-fire teammates are skipped.
function findNearestTarget() {
  let best = null;
  let bestDist = Infinity;

  const myTeam = state.players.get(state.myId)?.team;

  for (const p of state.players.values()) {
    if (p.id === state.myId) continue;
    if (!p.alive) continue;

    // skip teammates in TDM
    if (myTeam && myTeam !== 'ffa' && p.team === myTeam) continue;

    const dx = p.x - local.x;
    const dy = p.y - local.y;
    const dz = p.z - local.z;
    const dist = Math.hypot(dx, dy, dz);

    if (dist < 0.01) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
}

function directionFromAngles(yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    x: -sy * cp,
    y: sp,
    z: -cy * cp,
  };
}

function step(inputState, moveMult, effYaw, now) {
  const frozen = !!local.emote;

  tickSlide(inputState, now);

  const sliding = local.sliding;
  const forward = frozen || sliding ? 0 : inputState.forward;
  const right   = frozen || sliding ? 0 : inputState.right;
  const jumpHeld = !frozen && !sliding && inputState.jump;

  const speed = PLAYER.MOVE_SPEED * (inputState.sprint ? PLAYER.SPRINT_MULT : 1) * moveMult;
  const sin = Math.sin(effYaw);
  const cos = Math.cos(effYaw);

  let dx = 0, dz = 0;

  if (!sliding) {
    const fx = -sin * forward;
    const fz = -cos * forward;
    const rx =  cos * right;
    const rz = -sin * right;

    let mx = fx + rx;
    let mz = fz + rz;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    local.vx = mx * speed;
    local.vz = mz * speed;
    dx = local.vx * DT;
    dz = local.vz * DT;
  } else {
    dx = local.vx * DT;
    dz = local.vz * DT;
  }

  if (jumpHeld) local.jumpBuffer = JUMP_BUFFER_FRAMES;
  else local.jumpBuffer = Math.max(0, local.jumpBuffer - 1);

  if (local.jumpBuffer > 0 && (local.onGround || local.coyote > 0)) {
    local.vy = PLAYER.JUMP_VELOCITY;
    local.onGround = false;
    local.coyote = 0;
    local.jumpBuffer = 0;
    local.sliding = false;
  }

  local.vy -= PLAYER.GRAVITY * DT;
  const dy = local.vy * DT;

  const wasGrounded = local.onGround;

  const next = moveAndCollide(
    { x: local.x, y: local.y, z: local.z, vy: local.vy },
    dx, dy, dz,
    PLAYER.RADIUS, local.height,
    getSolids(),
    wasGrounded
  );

  local.x = next.x;
  local.y = next.y;
  local.z = next.z;
  local.vy = next.vy;
  local.onGround = next.onGround;
  if (next.onGround && local.vy < 0) local.vy = 0;

  if (local.onGround) local.coyote = COYOTE_FRAMES;
  else local.coyote = Math.max(0, local.coyote - 1);
}

function tickSlide(inputState, now) {
  const wantSlide = inputState.crouch && inputState.sprint && !local.sliding;
  const speed = Math.hypot(local.vx, local.vz);
  const canSlide =
    wantSlide &&
    now >= local.slideCooldownUntil &&
    local.onGround &&
    speed >= SLIDE.TRIGGER_MIN_SPEED;

  if (canSlide) {
    local.sliding = true;
    local.slideEndsAt = now + SLIDE.DURATION_MS;
    if (speed > 0.01) {
      const boost = 1 + (SLIDE.INITIAL_BOOST - 1) * 0.6;
      local.vx *= boost;
      local.vz *= boost;
    }
  }

  if (!local.sliding) return;

  const expired = now >= local.slideEndsAt;
  const notCrouching = !inputState.crouch;
  const tooSlow = Math.hypot(local.vx, local.vz) < SLIDE.MIN_SPEED_TO_KEEP;

  if (expired || notCrouching || tooSlow || !local.onGround) {
    local.sliding = false;
    local.slideCooldownUntil = now + SLIDE.COOLDOWN_MS;
    local.height = PLAYER.HEIGHT;
    return;
  }

  local.vx *= SLIDE.FRICTION;
  local.vz *= SLIDE.FRICTION;

  local.height = PLAYER.CROUCH_HEIGHT;
}

function syncCamera(effPitch, effYaw) {
  const camera = getCamera();
  camera.rotation.order = 'YXZ';

  const camY = local.y + local.height / 2 - 0.1;

  camera.position.set(local.x, camY, local.z);
  camera.rotation.y = effYaw !== undefined ? effYaw : local.yaw;
  camera.rotation.x = effPitch !== undefined ? effPitch : local.pitch;
  camera.rotation.z = 0;

  const w = getWeapon(local.weaponId);
  const targetFov = local.aiming ? w.adsZoom : 80;
  if (Math.abs(camera.fov - targetFov) > 0.1) {
    const rate = 1000 / Math.max(60, w.adsTimeMs);
    const stepSize = rate * (1 / 60);
    if (camera.fov < targetFov) camera.fov = Math.min(targetFov, camera.fov + stepSize);
    else camera.fov = Math.max(targetFov, camera.fov - stepSize);
    camera.updateProjectionMatrix();
  }
}

export function applySnapshot(players, ackedSeq) {
  const me = players.find(p => p.id === state.myId);
  if (!me) return;

  state.health = me.health;
  state.alive = me.alive;
  state.kills = me.kills;
  state.deaths = me.deaths;

  if (!me.alive) return;

  if (ackedSeq === undefined || ackedSeq <= local.lastAckedSeq) return;

  const serverX = me.x;
  const serverY = me.y;
  const serverZ = me.z;

  const ackIndex = local.history.findIndex(h => h.seq === ackedSeq);

  let predictedX, predictedY, predictedZ;
  if (ackIndex >= 0) {
    const h = local.history[ackIndex];
    predictedX = h.x;
    predictedY = h.y;
    predictedZ = h.z;
  } else {
    predictedX = local.x;
    predictedY = local.y;
    predictedZ = local.z;
  }

  const dx = serverX - predictedX;
  const dy = serverY - predictedY;
  const dz = serverZ - predictedZ;
  const distSq = dx * dx + dy * dy + dz * dz;

  local.lastAckedSeq = ackedSeq;

  if (distSq < RECONCILE_THRESHOLD * RECONCILE_THRESHOLD) {
    local.history = local.history.filter(h => h.seq > ackedSeq);
    return;
  }

  local.x = serverX;
  local.y = serverY;
  local.z = serverZ;
  local.vx = 0;
  local.vy = 0;
  local.vz = 0;

  const unacked = local.history.filter(h => h.seq > ackedSeq);
  local.history = unacked;

  for (const h of unacked) {
    local.yaw = h.yaw;
    local.pitch = h.pitch;
    step({
      forward: h.forward,
      right: h.right,
      jump: h.jump,
      sprint: h.sprint,
      crouch: h.crouch,
      fire: false,
      reload: false,
      aim: false,
      switchWeapon: null,
      emote: null,
      dx: 0,
      dy: 0,
    }, 1, local.yaw, performance.now());
  }

  syncCamera();
}

export function onDeath() {
  local.dead = true;
  local.alive = false;
  state.alive = false;
  local.reloading = false;
  local.aiming = false;
  local.emote = null;
  local.emoteEndsAt = 0;
  local.jumpBuffer = 0;
  local.coyote = 0;
  local.sliding = false;
  local.height = PLAYER.HEIGHT;
}

export function onRespawn(playerData) {
  spawn(playerData);
  state.alive = true;
}

function approach(current, target, rate) {
  if (current < target) return Math.min(target, current + rate);
  if (current > target) return Math.max(target, current - rate);
  return target;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}