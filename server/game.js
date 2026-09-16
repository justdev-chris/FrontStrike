import { MATCH } from '../shared/constants.js';
import { MAPS, DEFAULT_MAP } from '../shared/map.js';
import { GAME_MODES, GUN_GAME_ORDER } from '../shared/protocol.js';

const state = {
  mode: GAME_MODES.DM,
  mapId: DEFAULT_MAP,
  phase: 'lobby',
  players: new Map(),
  scores: { red: 0, blue: 0 },
  modeVotes: { dm: 0, tdm: 0, gungame: 0, ctf: 0 },
  mapVotes: {},
  matchStartTime: 0,
  matchEndTime: 0,
  postMatchEndsAt: 0,
  endReason: null,
  winner: null,
  healthPacks: [],
  platforms: [],
  flags: null,
  lastPlatformTick: 0,
};

export function getState() {
  return state;
}

export function getMap() {
  return MAPS[state.mapId] || MAPS[DEFAULT_MAP];
}

export function setPhase(phase) { state.phase = phase; }
export function setMode(mode) {
  if (mode === 'dm' || mode === 'tdm' || mode === 'gungame' || mode === 'ctf') {
    state.mode = mode;
  }
}
export function setMap(id)      { if (MAPS[id]) state.mapId = id; }

export function isTeamMode() {
  return state.mode === GAME_MODES.TDM || state.mode === GAME_MODES.CTF;
}

export function initHealthPacks() {
  const map = getMap();
  const list = map.healthPacks || [];
  state.healthPacks = list.map((hp, i) => ({
    id: i,
    x: hp.x,
    y: hp.y,
    z: hp.z,
    active: true,
    respawnAt: 0,
  }));
}

export function initPlatforms() {
  const map = getMap();
  const list = map.movingPlatforms || [];
  state.platforms = list.map((pl, i) => ({
    id: i,
    x: pl.x,
    y: pl.y,
    z: pl.z,
    w: pl.w,
    h: pl.h,
    d: pl.d,
    mat: pl.mat,
    path: pl.path.map(p => ({ x: p.x, y: p.y, z: p.z })),
    pathIndex: 0,
    dir: 1,
    speed: 4,
  }));
}

export function initFlags() {
  const map = getMap();
  if (!map.flags) {
    state.flags = null;
    return;
  }
  state.flags = {
    red: {
      id: 'red',
      team: 'red',
      x: map.flags.red.x,
      y: map.flags.red.y,
      z: map.flags.red.z,
      homeX: map.flags.red.x,
      homeY: map.flags.red.y,
      homeZ: map.flags.red.z,
      carriedBy: null,
    },
    blue: {
      id: 'blue',
      team: 'blue',
      x: map.flags.blue.x,
      y: map.flags.blue.y,
      z: map.flags.blue.z,
      homeX: map.flags.blue.x,
      homeY: map.flags.blue.y,
      homeZ: map.flags.blue.z,
      carriedBy: null,
    },
  };
}

export function startMatch(now) {
  state.scores.red = 0;
  state.scores.blue = 0;
  state.matchStartTime = now;
  state.matchEndTime = now + MATCH.DURATION_MS;
  state.postMatchEndsAt = 0;
  state.phase = 'playing';
  state.endReason = null;
  state.winner = null;
  initHealthPacks();
  initPlatforms();
  initFlags();
}

export function endMatch(reason = 'time') {
  const now = Date.now();
  state.phase = 'ended';
  state.endReason = reason;
  state.winner = computeWinner();
  state.postMatchEndsAt = now + MATCH.POST_MATCH_MS;
}

function computeWinner() {
  if (state.mode === GAME_MODES.TDM || state.mode === GAME_MODES.CTF) {
    const { red, blue } = state.scores;
    if (red > blue) return 'red';
    if (blue > red) return 'blue';
    return 'tie';
  }
  let best = null;
  let bestKills = -1;
  let tie = false;
  for (const p of state.players.values()) {
    if (p.kills > bestKills) {
      bestKills = p.kills;
      best = p.id;
      tie = false;
    } else if (p.kills === bestKills) {
      tie = true;
    }
  }
  if (best === null) return null;
  return tie ? 'tie' : best;
}

export function addKill(killerTeam) {
  if (!isTeamMode()) return;
  if (killerTeam === 'red') state.scores.red++;
  else if (killerTeam === 'blue') state.scores.blue++;
}

export function addTeamScore(team, points) {
  if (!isTeamMode()) return;
  if (team === 'red') state.scores.red += points;
  else if (team === 'blue') state.scores.blue += points;
}

export function checkKillLimit(killer) {
  if (state.mode === GAME_MODES.CTF) {
    // CTF win condition is captures
    if (state.scores.red >= MATCH.KILL_LIMIT) return true;
    if (state.scores.blue >= MATCH.KILL_LIMIT) return true;
    return false;
  }
  if (state.mode === GAME_MODES.GUN_GAME) {
    // win when someone reaches the last weapon
    const lastIndex = GUN_GAME_ORDER.length - 1;
    return (killer.gunGameIndex || 0) >= lastIndex;
  }
  if (state.mode === GAME_MODES.TDM) {
    if (state.scores.red >= MATCH.KILL_LIMIT) return true;
    if (state.scores.blue >= MATCH.KILL_LIMIT) return true;
  } else {
    if (killer.kills >= MATCH.KILL_LIMIT) return true;
  }
  return false;
}

export function castModeVote(mode) {
  if (!state.modeVotes.hasOwnProperty(mode)) return;
  state.modeVotes[mode]++;
}

export function castMapVote(mapId) {
  if (!MAPS[mapId]) return;
  state.mapVotes[mapId] = (state.mapVotes[mapId] || 0) + 1;
}

export function tallyModeVotes() {
  let bestMode = state.mode;
  let bestCount = 0;
  let tie = false;
  for (const mode of Object.keys(state.modeVotes)) {
    const count = state.modeVotes[mode];
    if (count > bestCount) {
      bestCount = count;
      bestMode = mode;
      tie = false;
    } else if (count === bestCount && count > 0) {
      tie = true;
    }
  }
  if (bestCount === 0) return state.mode;
  if (tie) return state.mode;
  return bestMode;
}

export function tallyMapVotes() {
  const total = Object.values(state.mapVotes).reduce((a, b) => a + b, 0);
  if (total === 0) return state.mapId;
  let best = state.mapId;
  let bestCount = -1;
  for (const id of Object.keys(MAPS)) {
    const c = state.mapVotes[id] || 0;
    if (c > bestCount) {
      bestCount = c;
      best = id;
    }
  }
  return best;
}

export function resetVotes() {
  state.modeVotes.dm = 0;
  state.modeVotes.tdm = 0;
  state.modeVotes.gungame = 0;
  state.modeVotes.ctf = 0;
  state.mapVotes = {};
}
