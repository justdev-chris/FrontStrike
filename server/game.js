import { MODES, MATCH } from '../shared/constants.js';

const state = {
  mode: 'dm',
  phase: 'lobby',            // lobby | vote | playing | ended
  players: new Map(),        // id -> player object (owned by players.js, referenced here)
  scores: { red: 0, blue: 0 },
  votes: { dm: 0, tdm: 0 },
  matchStartTime: 0,
  matchEndTime: 0,
};

export function getState() {
  return state;
}

export function setPhase(phase) {
  state.phase = phase;
}

export function setMode(mode) {
  state.mode = mode;
}

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
  if (state.mode === 'tdm') {
    if (killerTeam === 'red') state.scores.red++;
    else if (killerTeam === 'blue') state.scores.blue++;
  }
}

export function castVote(mode) {
  if (mode !== 'dm' && mode !== 'tdm') return;
  state.votes[mode]++;
}

export function tallyVotes() {
  const { dm, tdm } = state.votes;
  if (dm === tdm) return state.mode;      // tie keeps current
  return dm > tdm ? 'dm' : 'tdm';
}

export function resetVotes() {
  state.votes.dm = 0;
  state.votes.tdm = 0;
}
