// Procedural-free audio system. Loads audio files once, plays them with
// unlimited overlapping voices, pitch variation, and optional 3D panning.

import * as THREE from 'three'; // DONT FORGET THIS CHRISSSS meow 
import { getCamera } from './renderer.js';

let ctx = null;
let master = null;
const buffers = new Map();   // name -> AudioBuffer
const pending = new Map();   // name -> Promise<AudioBuffer>
let listener = null;
let ready = false;

const BASE_PATH = 'audio/';

// List of every sound we care about. Populated once via loadAll().
const SOUND_FILES = [
  'gunshot_rifle',
  'gunshot_smg',
  'gunshot_sniper',
  'gunshot_pistol',
  'reload',
  'hitmarker',
  'hurt',
  'death1',
  'death2',
  'killconfirm',
];

export function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    console.warn('[audio] Web Audio not supported');
    return;
  }
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  listener = ctx.listener;
}

// Must be called from a user gesture (deploy click) to satisfy autoplay policy.
export function resume() {
  if (!ctx) init();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

export async function loadAll() {
  if (!ctx) init();
  if (!ctx) return;
  const promises = SOUND_FILES.map(load);
  await Promise.all(promises);
  ready = true;
}

function load(name) {
  if (buffers.has(name)) return Promise.resolve(buffers.get(name));
  if (pending.has(name)) return pending.get(name);

  const p = fetch(BASE_PATH + name + '.mp3')
    .then(res => {
      if (!res.ok) throw new Error(`audio ${name}: ${res.status}`);
      return res.arrayBuffer();
    })
    .then(ab => new Promise((resolve, reject) => {
      ctx.decodeAudioData(ab, resolve, reject);
    }))
    .then(buffer => {
      buffers.set(name, buffer);
      pending.delete(name);
      return buffer;
    })
    .catch(err => {
      console.warn('[audio]', err.message);
      pending.delete(name);
      return null;
    });

  pending.set(name, p);
  return p;
}

// -------- playback --------

// Play a sound at a fixed position in 3D space.
// `pos` is { x, y, z }. If pos is null, plays 2D (non-positional).
export function play(name, opts = {}) {
  if (!ctx || !ready) return;
  const buffer = buffers.get(name);
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  // pitch variation
  const pitch = opts.pitch ?? 1;
  const variance = opts.pitchVariance ?? 0;
  if (variance > 0) {
    src.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * variance);
  } else {
    src.playbackRate.value = pitch;
  }

  const gain = ctx.createGain();
  gain.gain.value = opts.volume ?? 1;

  let node = src;

  // positional if a position was provided and we have a listener
  if (opts.position && listener) {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 5;
    panner.maxDistance = 120;
    panner.rolloffFactor = 1.1;

    panner.positionX.value = opts.position.x;
    panner.positionY.value = opts.position.y;
    panner.positionZ.value = opts.position.z;

    node.connect(panner);
    node = panner;
  }

  node.connect(gain);
  gain.connect(master);

  src.start(0);

  // cleanup after buffer duration
  src.onended = () => {
    try { src.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    if (node !== src) {
      try { node.disconnect(); } catch {}
    }
  };
}

// Called every frame to keep the Web Audio listener aligned with the camera.
export function updateListener() {
  if (!ctx || !listener) return;
  const cam = getCamera();
  if (!cam) return;

  const p = cam.position;
  const dir = cam.getWorldDirection(new THREE.Vector3());

  if (listener.positionX) {
    listener.positionX.value = p.x;
    listener.positionY.value = p.y;
    listener.positionZ.value = p.z;
    listener.forwardX.value = dir.x;
    listener.forwardY.value = dir.y;
    listener.forwardZ.value = dir.z;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;
  } else {
    // legacy Safari fallback
    listener.setPosition(p.x, p.y, p.z);
    listener.setOrientation(dir.x, dir.y, dir.z, 0, 1, 0);
  }
}

export function setMasterVolume(v) {
  if (master) master.gain.value = Math.max(0, Math.min(1, v));
}

export function isReady() {
  return ready;
}
