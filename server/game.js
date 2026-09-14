import { MATCH } from '../shared/constants.js';
import { MAPS, DEFAULT_MAP } from '../shared/map.js';

const state = {
  mode: 'dm',
  mapId: DEFAULT_MAP,
  phase: 'lobby',
  players: new Map(),
  scores: { red: 0, blue: 0 },
  modeVotes: { dm: 0, tdm: 0 },
  mapVotes: {},
  matchStartTime: 0,
  matchEndTime: 0,
  endReason: null,        // 'time' | 'limit' | null
  winner: null,           // 'red' | 'blue' | playerId (for dm) | 'tie' | null
};

export function getState() {
  return state;
}

export function getMap() {
  return MAPS[state.mapId] || MAPS[DEFAULT_MAP];
}

export function setPhase(phase) { state.phase = phase; }
export function setMode(mode)   { state.mode = mode; }
export function setMap(id)      { if (MAPS[id]) state.mapId = id; }

export function startMatch(now) {
  state.scores.red = 0;
  state.scores.blue = 0;
  state.matchStartTime = now;
  state.matchEndTime = now + MATCH.DURATION_MS;
  state.phase = 'playing';
  state.endReason = null;
  state.winner = null;
}

export function endMatch(reason = 'time') {
  state.phase = 'ended';
  state.endReason = reason;
  state.winner = computeWinner();
}

function computeWinner() {
  if (state.mode === 'tdm') {
    const { red, blue } = state.scores;
    if (red > blue) return 'red';
    if (blue > red) return 'blue';
    return 'tie';
  }
  // DM: highest kills
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
  if (state.mode !== 'tdm') return;
  if (killerTeam === 'red') state.scores.red++;
  else if (killerTeam === 'blue') state.scores.blue++;
}

// Returns true if the kill just hit the match limit.
export function checkKillLimit(killer) {
  if (state.mode === 'tdm') {
    if (state.scores.red >= MATCH.KILL_LIMIT) return true;
    if (state.scores.blue >= MATCH.KILL_LIMIT) return true;
  } else {
    if (killer.kills >= MATCH.KILL_LIMIT) return true;
  }
  return false;
}

export function castModeVote(mode) {
  if (mode !== 'dm' && mode !== 'tdm') return;
  state.modeVotes[mode]++;
}

export function castMapVote(mapId) {
  if (!MAPS[mapId]) return;
  state.mapVotes[mapId] = (state.mapVotes[mapId] || 0) + 1;
}

export function tallyModeVotes() {
  const { dm, tdm } = state.modeVotes;
  if (dm === tdm) return state.mode;
  return dm > tdm ? 'dm' : 'tdm';
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
  state.mapVotes = {};
}
