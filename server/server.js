import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { NET, MATCH } from '../shared/constants.js';
import * as network from './network.js';
import * as simulation from './simulation.js';
import * as game from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  network.handleConnection(ws);
});

// ---- simulation loop ----
setInterval(() => {
  simulation.tick();
}, 1000 / NET.TICK_RATE);

// ---- match lifecycle ----
let phaseTimer = 0;

setInterval(() => {
  const s = game.getState();
  const now = Date.now();
  const playerCount = s.players.size;

  switch (s.phase) {
    case 'lobby': {
      if (playerCount > 0) {
        game.resetVotes();
        game.setPhase('vote');
        phaseTimer = now + MATCH.VOTE_DURATION_MS;
        broadcastMatchState();
      }
      break;
    }

    case 'vote': {
      if (now >= phaseTimer || playerCount === 0) {
        const mode = game.tallyModeVotes();
        const mapId = game.tallyMapVotes();
        game.setMode(mode);
        game.setMap(mapId);
        // reassign teams if we just switched to tdm
        if (mode === 'tdm') reassignTeams();
        game.startMatch(now);
        broadcastMatchState();
      }
      break;
    }

    case 'playing': {
      if (now >= s.matchEndTime || playerCount === 0) {
        game.endMatch();
        phaseTimer = now + MATCH.POST_MATCH_MS;
        broadcastMatchState();
      }
      break;
    }

    case 'ended': {
      if (now >= phaseTimer) {
        game.setPhase('lobby');
        broadcastMatchState();
      }
      break;
    }
  }
}, 500);

// ---- snapshot / respawn loop ----
network.startLoop();

function reassignTeams() {
  const ps = [...game.getState().players.values()];
  let red = 0, blue = 0;
  for (const p of ps) {
    if (red <= blue) { p.team = 'red'; red++; }
    else             { p.team = 'blue'; blue++; }
  }
}

function broadcastMatchState() {
  const s = game.getState();
  network.broadcast({
    type: 'matchState',
    phase: s.phase,
    mode: s.mode,
    mapId: s.mapId,
    scores: s.scores,
    timeLeft: s.phase === 'playing' ? Math.max(0, s.matchEndTime - Date.now()) : 0,
    modeVotes: s.modeVotes,
    mapVotes: s.mapVotes,
  });
}

server.listen(PORT, () => {
  console.log(`FrontStrike listening on http://localhost:${PORT}`);
});
