import * as net from './core/net.js';
import * as input from './core/input.js';
import * as renderer from './core/renderer.js';

import * as mapBuilder from './game/mapBuilder.js';
import * as localPlayer from './game/localPlayer.js';
import * as remotePlayers from './game/remotePlayers.js';
import * as weapons from './game/weapons.js';

import * as hud from './ui/hud.js';
import * as menu from './ui/menu.js';

import { PLAYER } from '/shared/constants.js';

export const state = {
  myId: null,
  mode: 'dm',
  mapId: null,
  map: null,
  phase: 'menu',
  players: new Map(),
  health: 100,
  alive: true,
  kills: 0,
  deaths: 0,
  scoreboard: { red: 0, blue: 0 },
  timeLeft: 0,
  joined: false,
};

let suppressPause = false;

async function boot() {
  renderer.init();
  input.init();
  hud.init();

  menu.init({
    onPlay: async (name) => {
      await net.connect(name);
      state.joined = true;
      menu.hide();
      input.lock();
    },
    onResume: () => {
      menu.hidePaused();
      suppressPause = true;
      input.lock();
      setTimeout(() => { suppressPause = false; }, 1500);
    },
  });

  document.addEventListener('pointerlockchange', () => {
    if (!state.joined) return;
    if (state.phase !== 'playing') return;
    if (input.isLocked()) return;
    if (suppressPause) return;
    menu.showPaused();
  });
}

export function onMessage(msg) {
  switch (msg.type) {
    case 'welcome': {
      state.myId = msg.id;
      state.mode = msg.mode;
      state.mapId = msg.mapId;
      state.map = msg.map;
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);

      mapBuilder.build(state.map);
      localPlayer.spawn(msg.players.find(p => p.id === state.myId));
      remotePlayers.sync(msg.players);

      menu.setMaps(msg.maps);
      hud.update(state);
      break;
    }

    case 'mapChange': {
      state.mapId = msg.mapId;
      state.map = msg.map;
      mapBuilder.build(state.map);
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

    case 'snapshot': {
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);

      const me = msg.players.find(p => p.id === state.myId);
      const ackedSeq = me ? me.ackedSeq : undefined;

      remotePlayers.applySnapshot(msg.players);
      localPlayer.applySnapshot(msg.players, ackedSeq);
      hud.update(state);
      break;
    }

    case 'shot':
      weapons.onShot(msg);
      break;

    case 'damage':
      if (msg.victim === state.myId) hud.flashDamage();
      if (msg.attacker === state.myId) hud.showHitmarker();
      hud.update(state);
      break;

    case 'death': {
      if (msg.victim === state.myId) {
        localPlayer.onDeath();
        const killer = state.players.get(msg.killer);
        hud.showDeath(killer ? killer.name : null, PLAYER.RESPAWN_MS);
      }
      if (msg.killer === state.myId) {
        const victim = state.players.get(msg.victim);
        hud.showKill(victim ? victim.name : 'player');
      }
      break;
    }

    case 'respawn':
      if (msg.player.id === state.myId) {
        localPlayer.onRespawn(msg.player);
        hud.hideDeath();
      } else {
        remotePlayers.onRespawn(msg.player);
      }
      break;

    case 'killfeed':
      hud.addKillfeed(msg.killer, msg.victim, msg.weapon, state.players);
      break;

    case 'matchState':
      handleMatchState(msg);
      break;
  }
}

function handleMatchState(msg) {
  const prevPhase = state.phase;
  state.phase = msg.phase;
  state.mode = msg.mode;

  if (msg.phase === 'vote') {
    menu.showVote(msg);
    input.unlock();
  } else {
    menu.hideVote();
  }

  if (prevPhase === 'vote' && msg.phase === 'playing') {
    menu.hide();
    menu.hidePaused();
    suppressPause = true;
    input.lock();
    setTimeout(() => { suppressPause = false; }, 1500);
  }

  if (msg.phase !== 'playing' && msg.phase !== 'vote') {
    if (!state.joined) menu.show();
  }

  state.scoreboard = msg.scores;
  state.timeLeft = msg.timeLeft;
  hud.update(state);
}

function frame(now) {
  requestAnimationFrame(frame);

  const inputState = input.sample();
  localPlayer.update(inputState, now);
  remotePlayers.update(now);
  weapons.update(now);
  renderer.render();
}

boot();
requestAnimationFrame(frame);
