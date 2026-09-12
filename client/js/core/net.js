import * as THREE from 'three';

import * as net from './core/net.js';
import * as input from './core/input.js';
import * as renderer from './core/renderer.js';

import * as mapBuilder from './game/mapBuilder.js';
import * as localPlayer from './game/localPlayer.js';
import * as remotePlayers from './game/remotePlayers.js';
import * as weapons from './game/weapons.js';

import * as hud from './ui/hud.js';
import * as menu from './ui/menu.js';

// ---- game state (client-side mirror of what server owns) ----
export const state = {
  myId: null,
  mode: 'dm',
  mapId: null,
  phase: 'menu',
  players: new Map(),      // id -> public player snapshot (latest)
  health: 100,
  alive: true,
  kills: 0,
  deaths: 0,
  scoreboard: { red: 0, blue: 0 },
  timeLeft: 0,
};

// ---- boot ----
async function boot() {
  renderer.init();
  input.init();
  hud.init();
  menu.init({
    onPlay: async (name) => {
      await net.connect(name);
      menu.hide();
      input.lock();
    },
  });
}

// ---- network message handling ----
export function onMessage(msg) {
  switch (msg.type) {
    case 'welcome': {
      state.myId = msg.id;
      state.mode = msg.mode;
      state.mapId = msg.mapId;
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);

      mapBuilder.build(msg.mapId);
      localPlayer.spawn(msg.players.find(p => p.id === msg.id));
      remotePlayers.sync(msg.players);

      menu.setMaps(msg.maps);
      hud.update(state);
      break;
    }

    case 'playerJoined':
      state.players.set(msg.player.id, msg.player);
      remotePlayers.add(msg.player);
      break;

    case 'playerLeft':
      state.players.delete(msg.id);
      remotePlayers.remove(msg.id);
      break;

    case 'snapshot':
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);
      remotePlayers.applySnapshot(msg.players);
      localPlayer.applySnapshot(msg.players);
      hud.update(state);
      break;

    case 'shot':
      weapons.onShot(msg);
      break;

    case 'damage':
      if (msg.victim === state.myId) hud.flashDamage();
      if (msg.attacker === state.myId) hud.showHitmarker();
      hud.update(state);
      break;

    case 'death':
      if (msg.victim === state.myId) localPlayer.onDeath();
      if (msg.killer === state.myId) hud.showKill(msg.victim);
      break;

    case 'respawn':
      if (msg.player.id === state.myId) localPlayer.onRespawn(msg.player);
      else remotePlayers.onRespawn(msg.player);
      break;

    case 'killfeed':
      hud.addKillfeed(msg.killer, msg.victim, msg.weapon);
      break;

    case 'matchState':
      state.phase = msg.phase;
      state.mode = msg.mode;
      state.mapId = msg.mapId;
      state.scoreboard = msg.scores;
      state.timeLeft = msg.timeLeft;

      if (msg.phase === 'vote') menu.showVote(msg);
      else menu.hideVote();

      if (msg.phase !== 'playing' && msg.phase !== 'vote') menu.show();
      hud.update(state);
      break;
  }
}

// ---- render loop ----
function frame(now) {
  requestAnimationFrame(frame);

  const inputState = input.sample();
  localPlayer.update(inputState, now);
  remotePlayers.update(now);
  weapons.update(now);
  renderer.render(now);
}

boot();
requestAnimationFrame(frame);
