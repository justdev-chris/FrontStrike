import { MATCH } from '../shared/constants.js';
import { MAPS, DEFAULT_MAP } from '../shared/map.js';

const state = {
  mode: 'dm',
  mapId: DEFAULT_MAP,
  phase: 'lobby',        // lobby | vote | playing | ended
  players: new Map(),
  scores: { red: 0, blue: 0 },
  modeVotes: { dm: 0, tdm: 0 },
  mapVotes: {},          // { [mapId]: count }
  matchStartTime: 0,
  matchEndTime: 0,
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
}

export function endMatch() {
  state.phase = 'ended';
}

export function addKill(killerTeam) {
  if (state.mode !== 'tdm') return;
  if (killerTeam === 'red') state.scores.red++;
  else if (killerTeam === 'blue') state.scores.blue++;
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
  let best = state.mapId;
  let bestCount = -1;
  for (const id of Object.keys(MAPS)) {
    const c = state.mapVotes[id] || 0;
    if (c > bestCount) {
      bestCount = c;
      best = id;
    }
  }
  // if nobody voted, keep current
  const total = Object.values(state.mapVotes).reduce((a, b) => a + b, 0);
  return total === 0 ? state.mapId : best;
}

export function resetVotes() {
  state.modeVotes.dm = 0;
  state.modeVotes.tdm = 0;
  state.mapVotes = {};
}
