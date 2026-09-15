import * as net from './core/net.js';
import * as input from './core/input.js';
import * as renderer from './core/renderer.js';
import * as audio from './core/audio.js';

import * as mapBuilder from './game/mapBuilder.js';
import * as localPlayer from './game/localPlayer.js';
import * as remotePlayers from './game/remotePlayers.js';
import * as weapons from './game/weapons.js';
import * as projectiles from './game/projectiles.js';
import * as weaponView from './game/weaponView.js';
import * as scope from './game/scope.js';
import * as nameTags from './game/nameTags.js';

import * as hud from './ui/hud.js';
import * as menu from './ui/menu.js';
import * as admin from './ui/admin.js';

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
  matchEndTime: 0,
  timeLeft: 0,
  joined: false,
  isAdmin: false,

  weaponId: 'rifle',
  magAmmo: 30,
  reloading: false,
  aiming: false,
  sliding: false,

  emote: null,
  emoteEndsAt: 0,

  winner: null,
  endReason: null,

  healthPacks: [],
  projectiles: [],

  regenerating: false,
  lastDamageAt: 0,
};

let suppressPause = false;
let scoreboardOpen = false;
let lockAttemptTimer = null;

async function boot() {
  renderer.init();
  input.init();
  hud.init();
  weaponView.init();
  scope.init();
  audio.init();
  nameTags.init();

  menu.init({
    onPlay: async (name) => {
      audio.resume();
      audio.loadAll();

      await net.connect(name);
      state.joined = true;
      menu.hide();
      hud.show();
      requestLock();
    },
    onResume: () => {
      menu.hidePaused();
      requestLock();
    },
    onSettings: () => {},
  });

  admin.init({
    getState: () => state,
    send: (msg) => net.send(msg),
  });

  document.addEventListener('pointerlockchange', () => {
    if (!state.joined) return;
    if (input.isLocked()) return;
    if (suppressPause) return;
    if (admin.isOpen()) return;
    if (state.phase === 'vote') return;
    if (state.phase === 'lobby' && !state.mapId) return;
    menu.showPaused();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (!state.joined) return;
    if (state.phase !== 'playing') return;
    if (input.isLocked()) return;
    if (admin.isOpen()) return;
    menu.showPaused();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!state.joined) return;
      if (state.phase !== 'playing') return;
      if (menu.isPaused()) return;
      if (admin.isOpen()) return;   // don't pause while admin panel is up
      menu.showPaused();
      input.unlock();
    }
    if (e.code === 'Backquote') {
      if (!state.isAdmin) return;
      admin.toggle();
    }
  });

  window.addEventListener('fs-lock-failed', () => {
    if (!state.joined) return;
    if (state.phase !== 'playing') return;
    if (admin.isOpen()) return;
    menu.showPaused();
  });

  window.addEventListener('fs-admin-toggled', (e) => {
    if (!state.joined) return;
    if (e.detail.open) {
      // unlock mouse for the panel
      suppressPause = true;
      input.unlock();
    } else {
      // re-lock when the panel closes
      requestLock();
    }
  });
}

function requestLock() {
  suppressPause = true;
  input.lock();

  clearTimeout(lockAttemptTimer);
  lockAttemptTimer = setTimeout(() => {
    suppressPause = false;
    if (state.joined && state.phase === 'playing' && !input.isLocked() && !admin.isOpen()) {
      menu.showPaused();
    }
  }, 1200);
}

function pushMenuStatus() {
  menu.updateStatus({
    mode: state.mode,
    mapId: state.mapId,
    playerCount: state.players.size,
    players: [...state.players.values()],
    phase: state.phase,
  });
}

export function onMessage(msg) {
  switch (msg.type) {
    case 'welcome': {
      state.myId = msg.id;
      state.mode = msg.mode;
      state.mapId = msg.mapId;
      state.map = msg.map;
      state.isAdmin = !!msg.isAdmin;
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);
      state.healthPacks = msg.healthPacks || [];

      mapBuilder.build(state.map);
      mapBuilder.updateHealthPacks(state.healthPacks);
      localPlayer.spawn(msg.players.find(p => p.id === state.myId));
      remotePlayers.sync(msg.players);

      menu.setMaps(msg.maps);
      hud.update(state);
      pushMenuStatus();
      break;
    }

    case 'mapChange': {
      state.mapId = msg.mapId;
      state.map = msg.map;
      state.healthPacks = [];
      mapBuilder.build(state.map);
      pushMenuStatus();
      break;
    }

    case 'playerJoined':
      state.players.set(msg.player.id, msg.player);
      remotePlayers.add(msg.player);
      pushMenuStatus();
      break;

    case 'playerLeft':
      state.players.delete(msg.id);
      remotePlayers.remove(msg.id);
      pushMenuStatus();
      break;

    case 'snapshot': {
      state.players.clear();
      for (const p of msg.players) state.players.set(p.id, p);

      if (msg.healthPacks) {
        state.healthPacks = msg.healthPacks;
        mapBuilder.updateHealthPacks(msg.healthPacks);
      }

      if (msg.projectiles) {
        state.projectiles = msg.projectiles;
        projectiles.syncFromSnapshot(msg.projectiles);
      }

      const me = msg.players.find(p => p.id === state.myId);
      const ackedSeq = me ? me.ackedSeq : undefined;

      remotePlayers.applySnapshot(msg.players);
      localPlayer.applySnapshot(msg.players, ackedSeq);

      if (state.alive && state.health < PLAYER.MAX_HEALTH && state.lastDamageAt) {
        state.regenerating = Date.now() - state.lastDamageAt > 5000;
      } else {
        state.regenerating = false;
      }

      hud.update(state);
      break;
    }

    case 'healthPack': {
      const pack = msg.pack;
      if (pack) {
        const idx = state.healthPacks.findIndex(hp => hp.id === pack.id);
        if (idx >= 0) state.healthPacks[idx] = pack;
        else state.healthPacks.push(pack);
        mapBuilder.updateHealthPacks(state.healthPacks);
      }
      break;
    }

    case 'projectileSpawn':
      projectiles.spawn(msg.projectile);
      break;

    case 'projectileUpdate':
      projectiles.update(msg.projectile);
      break;

    case 'projectileEnd':
      projectiles.end(msg.id);
      break;

    case 'explosion':
      projectiles.explode(msg.x, msg.y, msg.z, msg.weaponId);
      audio.play('gunshot_rpg', { volume: 0.9 });
      break;

    case 'shot':
      weapons.onShot(msg);
      break;

    case 'damage':
      if (msg.victim === state.myId) {
        hud.flashDamage();
        audio.play('hurt', { volume: 0.9 });
        state.lastDamageAt = Date.now();
        state.regenerating = false;
      }
      if (msg.attacker === state.myId) {
        hud.showHitmarker();
        audio.play('hitmarker', { volume: 0.7 });
      }
      hud.update(state);
      break;

    case 'death': {
      if (msg.victim === state.myId) {
        localPlayer.onDeath();
        const killer = state.players.get(msg.killer);
        hud.showDeath(killer ? killer.name : null, PLAYER.RESPAWN_MS);
        audio.play(Math.random() < 0.5 ? 'death1' : 'death2', { volume: 0.9 });
        state.regenerating = false;
      }
      if (msg.killer === state.myId) {
        const victim = state.players.get(msg.victim);
        hud.showKill(victim ? victim.name : 'player');
        audio.play('killconfirm', { volume: 0.85 });
      }
      break;
    }

    case 'respawn':
      if (msg.player.id === state.myId) {
        localPlayer.onRespawn(msg.player);
        hud.hideDeath();
        state.lastDamageAt = 0;
        state.regenerating = false;
      } else {
        remotePlayers.onRespawn(msg.player);
      }
      break;

    case 'killfeed':
      hud.addKillfeed(msg.killer, msg.victim, msg.weapon, state.players);
      break;

    case 'streak':
      hud.showStreak(msg.playerName, msg.label);
      break;

    case 'announce':
      hud.showAnnouncement(msg.text, msg.from);
      break;

    case 'adminResult':
      if (msg.action === 'kicked') {
        console.warn('[admin] you have been kicked:', msg.reason);
        alert('You have been kicked: ' + (msg.reason || 'by admin'));
      }
      break;

    case 'emote': {
      if (msg.playerId === state.myId) {
        if (msg.emote) {
          state.emote = msg.emote;
          state.emoteEndsAt = msg.endsAt;
          localPlayer.setEmote(msg.emote, msg.endsAt);
          hud.showEmote(msg.emote);
        } else {
          state.emote = null;
          state.emoteEndsAt = 0;
          localPlayer.clearEmote();
          hud.hideEmote();
        }
      } else {
        remotePlayers.setEmote(msg.playerId, msg.emote, msg.endsAt);
      }
      break;
    }

    case 'matchState':
      handleMatchState(msg);
      break;
  }
}

function handleMatchState(msg) {
  const prevPhase = state.phase;
  state.phase = msg.phase;
  state.mode = msg.mode;

  if (typeof msg.matchEndTime === 'number') {
    state.matchEndTime = msg.matchEndTime;
  }
  if (msg.winner !== undefined) state.winner = msg.winner;
  if (msg.endReason !== undefined) state.endReason = msg.endReason;

  if (msg.phase === 'vote') {
    menu.showVote(msg);
    input.unlock();
  } else {
    menu.hideVote();
  }

  if (prevPhase === 'vote' && msg.phase === 'playing') {
    menu.hide();
    menu.hidePaused();
    hud.hideEndScreen();
    requestLock();
  }

  if (msg.phase === 'ended' && prevPhase === 'playing') {
    input.unlock();
    hud.showEndScreen(state);
  }

  if (msg.phase !== 'playing' && msg.phase !== 'vote' && msg.phase !== 'ended') {
    if (!state.joined) menu.show();
  }

  state.scoreboard = msg.scores;
  state.timeLeft = computeTimeLeft();

  hud.update(state);
  pushMenuStatus();
}

function computeTimeLeft() {
  if (state.phase !== 'playing') return 0;
  return Math.max(0, state.matchEndTime - Date.now());
}

function frame(now) {
  requestAnimationFrame(frame);

  const inputState = input.sample();
  localPlayer.update(inputState, now);
  remotePlayers.update(now);
  weapons.update(now);
  projectiles.update3D(now);
  nameTags.update();

  audio.updateListener();

  state.timeLeft = computeTimeLeft();

  const held = input.isScoreboardHeld();
  if (held && !scoreboardOpen) {
    scoreboardOpen = true;
    hud.update(state);
    hud.showScoreboard();
  } else if (!held && scoreboardOpen) {
    scoreboardOpen = false;
    hud.hideScoreboard();
  }

  hud.update(state);
  renderer.render();
}

boot();
requestAnimationFrame(frame);
