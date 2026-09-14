import * as THREE from 'three';
import { getCamera } from '../core/renderer.js';
import { state } from '../main.js';
import { NAME_TAGS } from '/shared/constants.js';
import * as remotePlayers from './remotePlayers.js';

const tags = new Map();   // playerId -> DOM element
let layer = null;

const _v = new THREE.Vector3();

export function init() {
  layer = document.getElementById('nameTagLayer');
}

export function update() {
  if (!layer) return;

  const cam = getCamera();
  if (!cam) return;

  const avatars = remotePlayers.getAll();
  const wanted = new Set();

  for (const [id, avatar] of avatars) {
    wanted.add(id);

    let el = tags.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'name-tag';
      layer.appendChild(el);
      tags.set(id, el);
    }

    const player = state.players.get(id);
    if (!player) {
      el.style.display = 'none';
      continue;
    }

    // hide dead
    if (!avatar.alive || !player.alive) {
      el.classList.add('dead');
      continue;
    }
    el.classList.remove('dead');

    // self tag hide (shouldn't happen since remotePlayers excludes us)
    if (id === state.myId) {
      el.classList.add('self');
      continue;
    }

    // project world position to screen
    _v.set(
      avatar.group.position.x,
      avatar.group.position.y + 1.9,
      avatar.group.position.z
    );

    const dist = cam.position.distanceTo(_v);

    if (dist > NAME_TAGS.MAX_DIST) {
      el.style.display = 'none';
      continue;
    }

    _v.project(cam);

    // behind camera
    if (_v.z > 1) {
      el.style.display = 'none';
      continue;
    }

    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;

    el.style.display = 'block';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // fade as distance grows
    let opacity = 1;
    if (dist > NAME_TAGS.FADE_START) {
      opacity = 1 - (dist - NAME_TAGS.FADE_START) / (NAME_TAGS.MAX_DIST - NAME_TAGS.FADE_START);
      opacity = Math.max(0, Math.min(1, opacity));
    }
    el.style.opacity = opacity.toFixed(2);

    // content + color
    const teamClass = player.team === 'red' ? 'team-red'
                    : player.team === 'blue' ? 'team-blue'
                    : 'team-ffa';

    const adminClass = player.isAdmin ? 'admin' : '';
    el.className = `name-tag ${teamClass} ${adminClass}`;
    el.textContent = player.name;
  }

  for (const id of [...tags.keys()]) {
    if (!wanted.has(id)) {
      const el = tags.get(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      tags.delete(id);
    }
  }
}

export function clear() {
  if (layer) layer.innerHTML = '';
  tags.clear();
}